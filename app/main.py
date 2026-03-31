"""
main.py
FastAPI — exposition des données IPMA aux développeurs.

Démarrage :
    uvicorn app.main:app --reload

Documentation interactive auto-générée :
    http://localhost:8000/docs   (Swagger UI)
    http://localhost:8000/redoc  (ReDoc)
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.fetcher import (
    fetch_pollution_measures,
    fetch_pollution_stations,
    fetch_synop,
    fetch_synop_stations,
)
from app.forecast import forecast_ipma
from app.geo_join import build_station_mapping, merge_pollution_meteo
from app.index import EU_THRESHOLDS, compute_ipma_dataframe

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s — %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="IPMA — Indice Pollution-Météo Atmosphérique",
    description=(
        "Croisement temps réel des concentrations de polluants (LCSQA) "
        "et des observations météo (Synop OMM — Météo-France).\n\n"
        "**POST /refresh** pour recharger les données depuis data.gouv.fr."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Cache en mémoire
# ---------------------------------------------------------------------------

_cache: dict[str, Any] = {
    "ipma_df": None,
    "pollution_df": None,
    "synop_df": None,
    "loaded_at": None,
}


def _sanitize(v: Any) -> Any:
    """Convertit les types NumPy/Timestamp en types JSON natifs."""
    if isinstance(v, float) and np.isnan(v):
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return None if np.isnan(v) else float(v)
    if isinstance(v, pd.Timestamp):
        return v.isoformat()
    return v


def _to_records(df: pd.DataFrame) -> list[dict]:
    return [{k: _sanitize(v) for k, v in row.items()} for row in df.to_dict(orient="records")]


def _load_data() -> None:
    logger.info("Chargement des données…")
    pollution = fetch_pollution_measures()
    poll_stations = fetch_pollution_stations()
    synop = fetch_synop()
    synop_stations = fetch_synop_stations()

    mapping = build_station_mapping(poll_stations, synop_stations)
    merged = merge_pollution_meteo(pollution, synop, mapping)
    ipma_df = compute_ipma_dataframe(merged)

    _cache["ipma_df"] = ipma_df
    _cache["pollution_df"] = pollution
    _cache["synop_df"] = synop
    _cache["loaded_at"] = datetime.utcnow().isoformat() + "Z"
    logger.info("Données prêtes — %d lignes IPMA.", len(ipma_df))


def _ensure_data() -> None:
    if _cache["ipma_df"] is None:
        _load_data()


REFRESH_INTERVAL = 60 * 60  

async def _auto_refresh_loop() -> None:
    """Boucle de rafraîchissement automatique des données."""
    # Premier chargement au démarrage
    _load_data()
    while True:
        await asyncio.sleep(REFRESH_INTERVAL)
        try:
            logger.info("Auto-refresh déclenché")
            _load_data()
        except Exception as exc:
            logger.error("Erreur auto-refresh : %s", exc)


@app.on_event("startup")
async def startup_event() -> None:
    asyncio.create_task(_auto_refresh_loop())


# ---------------------------------------------------------------------------
# Endpoints système
# ---------------------------------------------------------------------------


@app.get("/health", tags=["Système"], summary="Statut de l'API")
def health() -> dict:
    """Vérifie que l'API répond et indique la date du dernier chargement."""
    return {
        "status": "ok",
        "loaded_at": _cache.get("loaded_at"),
        "ipma_rows": len(_cache["ipma_df"]) if _cache["ipma_df"] is not None else 0,
    }


@app.post("/refresh", tags=["Système"], summary="Recharger les données")
def refresh() -> dict:
    """Force le rechargement de toutes les données depuis data.gouv.fr."""
    _load_data()
    return {"status": "refreshed", "loaded_at": _cache["loaded_at"]}


# ---------------------------------------------------------------------------
# Endpoints IPMA
# ---------------------------------------------------------------------------


@app.get(
    "/ipma",
    tags=["IPMA"],
    summary="Indice IPMA — toutes les stations",
)
def get_ipma(
    categorie: str | None = Query(None, description="Filtrer : Bon | Modéré | Mauvais | Très mauvais"),
    limit: int = Query(100, ge=1, le=5000, description="Nombre max de résultats"),
) -> list[dict]:
    """
    Retourne l'indice IPMA courant pour toutes les stations.

    Chaque entrée contient : `station_id`, `heure`, `ipma` ∈ [0,1],
    `categorie`, `pollution_score`, `meteo_factor`.
    """
    _ensure_data()
    df: pd.DataFrame = _cache["ipma_df"]

    if categorie:
        df = df[df["categorie"].str.lower() == categorie.lower()]

    cols = [c for c in ("station_id", "numer_sta", "heure", "ipma", "categorie",
                        "pollution_score", "meteo_factor", "dist_km") if c in df.columns]
    return _to_records(
        df.dropna(subset=["ipma"]).sort_values("heure", ascending=False).head(limit)[cols]
    )


@app.get(
    "/ipma/{station_id}",
    tags=["IPMA"],
    summary="Indice IPMA — une station",
)
def get_ipma_station(station_id: str) -> dict:
    """
    Retourne le dernier indice IPMA d'une station avec le détail complet :
    contribution de chaque polluant, facteur météo et observations météo associées.
    """
    _ensure_data()
    df: pd.DataFrame = _cache["ipma_df"]

    subset = df[df["station_id"].astype(str) == station_id].dropna(subset=["ipma"])
    if subset.empty:
        raise HTTPException(404, detail=f"Station '{station_id}' introuvable.")

    row = subset.sort_values("heure", ascending=False).iloc[0]

    polluants = {}
    for pol, seuil in EU_THRESHOLDS.items():
        val = row.get(pol)
        if val is not None and not (isinstance(val, float) and np.isnan(val)):
            polluants[pol] = {
                "valeur_ugm3": round(float(val), 2),
                "seuil_EU_ugm3": seuil,
                "ratio": round(min(float(val) / seuil, 1.0), 4),
            }

    t_k = row.get("t")
    pres_pa = row.get("pres")

    return {
        "station_id": station_id,
        "heure": _sanitize(row.get("heure")),
        "ipma": _sanitize(row.get("ipma")),
        "categorie": row.get("categorie"),
        "pollution_score": _sanitize(row.get("pollution_score")),
        "meteo_factor": _sanitize(row.get("meteo_factor")),
        "poste_synop": row.get("numer_sta"),
        "dist_km": _sanitize(row.get("dist_km")),
        "meteo": {
            "temperature_c": round(float(t_k) - 273.15, 1) if t_k and not np.isnan(float(t_k)) else None,
            "humidite_pct": _sanitize(row.get("u")),
            "vent_ms": _sanitize(row.get("ff")),
            "pression_hpa": round(float(pres_pa) / 100.0, 1) if pres_pa and not np.isnan(float(pres_pa)) else None,
        },
        "polluants": polluants,
    }


@app.get(
    "/ipma/{station_id}/forecast",
    tags=["Prévisions"],
    summary="Prévisions IPMA — régression linéaire",
)
def get_forecast(
    station_id: str,
    horizon_h: int = Query(24, ge=1, le=72, description="Nombre d'heures à prévoir"),
) -> list[dict]:
    """
    Prévisions IPMA sur les prochaines `horizon_h` heures via régression linéaire.

    Chaque entrée contient : `forecast_time`, `ipma_forecast`, `mae` (erreur absolue moyenne), `r2`.
    """
    _ensure_data()
    df: pd.DataFrame = _cache["ipma_df"]

    subset = df[df["station_id"].astype(str) == station_id]
    if subset.empty:
        raise HTTPException(404, detail=f"Station '{station_id}' introuvable.")

    forecasts = forecast_ipma(subset, horizon_h=horizon_h)
    if forecasts.empty:
        raise HTTPException(422, detail="Pas assez de données historiques pour prévoir.")

    return _to_records(forecasts)


# ---------------------------------------------------------------------------
# Endpoints données brutes
# ---------------------------------------------------------------------------


@app.get("/pollution", tags=["Données brutes"], summary="Mesures brutes de polluants")
def get_pollution(
    polluant: str | None = Query(None, description="O3 | NO2 | SO2 | PM10 | PM25 | CO"),
    limit: int = Query(200, ge=1, le=10000),
) -> list[dict]:
    """Retourne les mesures brutes de concentration depuis le LCSQA."""
    _ensure_data()
    df: pd.DataFrame = _cache["pollution_df"]

    if polluant and "polluant" in df.columns:
        df = df[df["polluant"].str.upper() == polluant.upper()]

    cols = [c for c in ("station_id", "date_debut", "polluant", "valeur", "unite", "validite") if c in df.columns]
    return _to_records(df[cols].head(limit))


@app.get("/meteo", tags=["Données brutes"], summary="Observations météo brutes (Synop)")
def get_meteo(
    numer_sta: str | None = Query(None, description="Identifiant du poste Synop"),
    limit: int = Query(200, ge=1, le=10000),
) -> list[dict]:
    """Retourne les observations météo brutes depuis les archives Synop OMM."""
    _ensure_data()
    df: pd.DataFrame = _cache["synop_df"]

    if numer_sta and "numer_sta" in df.columns:
        df = df[df["numer_sta"].astype(str) == numer_sta]

    cols = [c for c in ("numer_sta", "date", "t", "u", "ff", "pres", "rr3") if c in df.columns]
    return _to_records(df[cols].head(limit))

@app.get("/stations", tags=["Données brutes"], summary="Liste des stations de pollution")
def get_stations() -> list[dict]:
    """Retourne la liste des stations de pollution avec leurs coordonnées."""
    _ensure_data()

    station_coords = fetch_pollution_stations()
    return _to_records(station_coords[["station_id", "latitude", "longitude"]])


# ---------------------------------------------------------------------------
# Endpoint d'intégration Dev (format attendu par le worker Node)
# ---------------------------------------------------------------------------


@app.get(
    "/data",
    tags=["Intégration"],
    summary="Données formatées pour le worker Dev",
)
def get_data_for_worker(
    limit: int = Query(500, ge=1, le=5000),
) -> dict:
    """
    Retourne les données IPMA au format attendu par le worker Node.js :
    { data: [{ station: {...}, date_start, date_end, pollution_index, ... }] }
    """
    _ensure_data()
    df: pd.DataFrame = _cache["ipma_df"]
    poll_stations = fetch_pollution_stations()

    station_info = {}
    for _, row in poll_stations.iterrows():
        sid = str(row.get("station_id", ""))
        station_info[sid] = {
            "code": sid,
            "name": str(row.get("nom_station", row.get("station_id", ""))),
            "latitude": _sanitize(row.get("latitude")),
            "longitude": _sanitize(row.get("longitude")),
            "commune": str(row.get("commune", "")),
            "type_implantation": str(row.get("type_d'implantation", row.get("type_implantation", ""))),
        }

    logger.info("Sample station_info: %s", list(station_info.values())[:3])    

    records = []
    for _, row in df.dropna(subset=["ipma"]).sort_values("heure", ascending=False).head(limit).iterrows():
        sid = str(row.get("station_id", ""))
        heure = row.get("heure")
        t_k = row.get("t")
        pres_pa = row.get("pres")

        records.append({
            "station": station_info.get(sid, {"code": sid, "name": sid, "latitude": None, "longitude": None, "commune": "", "type_implantation": ""}),
            "date_start": _sanitize(heure),
            "date_end": _sanitize(heure + pd.Timedelta(hours=1)) if heure is not None else None,
            "pollution_index": round(float(row["ipma"]) * 100) if row.get("ipma") is not None else None,
            "temperature": round(float(t_k) - 273.15, 1) if t_k is not None and not np.isnan(float(t_k)) else None,
            "humidity": _sanitize(row.get("u")),
            "wind_speed": _sanitize(row.get("ff")),
            "pm25": _sanitize(row.get("PM25")),
            "pm10": _sanitize(row.get("PM10")),
            "no2": _sanitize(row.get("NO2")),
            "o3": _sanitize(row.get("O3")),
        })

    return {"data": records}