"""
fetcher.py
Téléchargement et parsing des données brutes depuis data.gouv.fr.

Deux sources :
  - LCSQA  : concentrations horaires de polluants + métadonnées stations
             ⚠️  Depuis le 11/09/2025, les mesures temps réel sont derrière
             un bucket MinIO privé. Le fetcher utilise des mesures synthétiques
             réalistes en fallback (basées sur la distribution statistique des
             stations).  Pour utiliser les vraies données, remplacer
             POLLUTION_CSV_URL par une URL signée (accès INERIS).
  - Synop  : observations météo toutes les 3h + coordonnées des postes
"""

from __future__ import annotations

import io
import logging
import random
from datetime import datetime, timedelta
from functools import lru_cache

import numpy as np
import pandas as pd
import requests

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# URLs upstream (data.gouv.fr)
# ---------------------------------------------------------------------------

# ⚠️ Cette URL pointe désormais vers le browser MinIO (HTML, pas CSV).
# Laissée pour référence. Le fetcher détecte ce cas et utilise le fallback.
POLLUTION_CSV_URL = (
    "https://www.data.gouv.fr/api/1/datasets/r/157ceed4-ce03-4c7d-9cd7-ae60ea07417b"
)

# URL directe du XLS stations (stable, accessible)
POLLUTION_STATIONS_URL = (
    "https://static.data.gouv.fr/resources/donnees-temps-reel-de-mesure-des-concentrations-de-polluants-atmospheriques-reglementes-1/20251210-084445/fr-2025-d-lcsqa-ineris-20251209.xls"
)
SYNOP_CSV_URL = (
    "https://www.data.gouv.fr/api/1/datasets/r/a654bcef-8a31-4fa5-b903-68f64d6ec818"
)
SYNOP_STATIONS_URL = (
    "https://www.data.gouv.fr/api/1/datasets/r/d82625f7-091c-40c5-a4e7-313a2ba5d3ef"
)

_SESSION = requests.Session()
_SESSION.headers.update({"User-Agent": "Y02-DataTeam/1.0"})


def _get(url: str, timeout: int = 60) -> requests.Response:
    resp = _SESSION.get(url, timeout=timeout)
    resp.raise_for_status()
    return resp


# ---------------------------------------------------------------------------
# Pollution — mesures
# ---------------------------------------------------------------------------

# Distributions statistiques réalistes (µg/m³) basées sur les normes EU
# utilisées pour le fallback synthétique quand l'API LCSQA est inaccessible.
_SYNTHETIC_STATS = {
    "NO2":  {"mean": 35.0, "std": 20.0, "min": 0.0, "max": 200.0},
    "O3":   {"mean": 55.0, "std": 25.0, "min": 0.0, "max": 200.0},
    "PM10": {"mean": 20.0, "std": 10.0, "min": 0.0, "max": 100.0},
    "PM25": {"mean": 12.0, "std": 7.0,  "min": 0.0, "max": 60.0},
    "SO2":  {"mean": 10.0, "std": 8.0,  "min": 0.0, "max": 100.0},
    "CO":   {"mean": 0.4,  "std": 0.3,  "min": 0.0, "max": 5.0},
}


def _generate_synthetic_measures(station_ids: list[str], n_hours: int = 24) -> pd.DataFrame:
    """
    Génère des mesures synthétiques réalistes pour la démo.
    Appelé automatiquement quand l'API LCSQA est inaccessible.
    """
    rng = np.random.default_rng(seed=42)
    records = []
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)

    for station_id in station_ids:
        for h in range(n_hours):
            dt = now - timedelta(hours=h)
            for polluant, stats in _SYNTHETIC_STATS.items():
                val = rng.normal(stats["mean"], stats["std"])
                val = float(np.clip(val, stats["min"], stats["max"]))
                records.append({
                    "station_id": station_id,
                    "date_debut": dt,
                    "date_fin": dt + timedelta(hours=1),
                    "polluant": polluant,
                    "valeur": round(val, 2),
                    "unite": "µg/m³",
                    "validite": 1,
                    "source": "synthetic",
                })

    df = pd.DataFrame(records)
    logger.warning(
        "⚠️  Mesures SYNTHÉTIQUES utilisées (%d lignes) — API LCSQA inaccessible.", len(df)
    )
    return df


def fetch_pollution_measures(station_ids: list[str] | None = None) -> pd.DataFrame:
    """
    Retourne les concentrations horaires temps réel (LCSQA).
    Si l'API LCSQA retourne du HTML (MinIO browser) ou échoue,
    bascule automatiquement sur des données synthétiques.

    Colonnes : station_id, date_debut, polluant, valeur
    """
    logger.info("Téléchargement mesures pollution…")
    try:
        resp = _get(POLLUTION_CSV_URL, timeout=20)
        content_type = resp.headers.get("content-type", "")
        # L'URL pointe vers le browser MinIO (retourne du HTML) → fallback
        if "text/html" in content_type or len(resp.content) < 5000:
            raise ValueError("Réponse HTML reçue — API LCSQA migrée vers MinIO.")

        df = pd.read_csv(io.StringIO(resp.text), sep=";", encoding="utf-8", on_bad_lines="skip")
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        rename = {
            "code_station": "station_id",
            "code_polluant": "polluant",
            "concentration": "valeur",
            "date_de_debut": "date_debut",
            "date_de_fin": "date_fin",
        }
        df = df.rename(columns={k: v for k, v in rename.items() if k in df.columns})

        if "date_debut" in df.columns:
            df["date_debut"] = pd.to_datetime(df["date_debut"], errors="coerce")
        if "valeur" in df.columns:
            df["valeur"] = pd.to_numeric(df["valeur"], errors="coerce")

        if len(df) == 0:
            raise ValueError("CSV vide reçu.")

        df["source"] = "lcsqa"
        logger.info("Mesures pollution (LCSQA) : %d lignes", len(df))
        return df

    except Exception as exc:
        logger.warning("Fallback synthétique : %s", exc)
        ids = station_ids or ["FR01001", "FR01002", "FR13001", "FR75001", "FR69001",
                              "FR31001", "FR33001", "FR44001", "FR59001", "FR06001"]
        return _generate_synthetic_measures(ids)


# ---------------------------------------------------------------------------
# Pollution — stations (coordonnées GPS)
# ---------------------------------------------------------------------------


def fetch_pollution_stations() -> pd.DataFrame:
    """
    Retourne les métadonnées des stations pollution avec latitude/longitude.
    Fichier source : XLS multi-onglets.
    """
    logger.info("Téléchargement métadonnées stations pollution…")
    resp = _get(POLLUTION_STATIONS_URL)
    xls = pd.ExcelFile(io.BytesIO(resp.content), engine="xlrd")

    df_stations = None
    for sheet in xls.sheet_names:
        df_tmp = xls.parse(sheet)
        df_tmp.columns = [c.strip().lower().replace(" ", "_") for c in df_tmp.columns]
        if any("lat" in c or "lon" in c for c in df_tmp.columns):
            df_stations = df_tmp
            break

    if df_stations is None:
        df_stations = xls.parse(xls.sheet_names[0])
        df_stations.columns = [c.strip().lower().replace(" ", "_") for c in df_stations.columns]

    rename = {}
    # On ne renomme que la première colonne trouvée pour chaque cible
    # afin d'éviter les colonnes dupliquées après rename.
    targets_used: set[str] = set()
    for c in df_stations.columns:
        cl = c.lower()
        if "latitude" in cl and "latitude" not in targets_used:
            rename[c] = "latitude"; targets_used.add("latitude")
        elif "lat" in cl and "latitude" not in targets_used:
            rename[c] = "latitude"; targets_used.add("latitude")
        elif "longitude" in cl and "longitude" not in targets_used:
            rename[c] = "longitude"; targets_used.add("longitude")
        elif "lon" in cl and "longitude" not in targets_used:
            rename[c] = "longitude"; targets_used.add("longitude")
        elif "code" in cl and "station" in cl and "station_id" not in targets_used:
            rename[c] = "station_id"; targets_used.add("station_id")

    df_stations = df_stations.rename(columns=rename)
    # Supprime les doublons de colonnes éventuels et garde la première occurrence
    df_stations = df_stations.loc[:, ~df_stations.columns.duplicated()]

    for col in ("latitude", "longitude"):
        if col in df_stations.columns:
            df_stations[col] = pd.to_numeric(df_stations[col], errors="coerce")

    df_stations = df_stations.dropna(subset=["latitude", "longitude"])
    logger.info("Stations pollution : %d", len(df_stations))
    return df_stations


# ---------------------------------------------------------------------------
# Météo — observations Synop
# ---------------------------------------------------------------------------


def fetch_synop() -> pd.DataFrame:
    """
    Retourne les observations météo Synop (année courante, CSV.gz).

    Colonnes normalisées :
        numer_sta  : identifiant OMM (str, zero-padded, ex: '07002')
        date       : datetime UTC
        t          : température (K)
        u          : humidité relative (%)
        ff         : vitesse du vent (m/s)
        pres       : pression (Pa)
        rr3        : précipitations 3h (mm)
    """
    logger.info("Téléchargement Synop 2026…")
    resp = _get(SYNOP_CSV_URL)
    df = pd.read_csv(
        io.BytesIO(resp.content),
        sep=";",
        compression="gzip",
        on_bad_lines="skip",
        low_memory=False,
    )
    df.columns = [c.strip().lower() for c in df.columns]

    # Normalisation des colonnes vers les noms internes attendus
    rename = {
        "validity_time": "date",
        "geo_id_wmo": "numer_sta",
    }
    df = df.rename(columns={k: v for k, v in rename.items() if k in df.columns})

    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce", utc=True)
        df["date"] = df["date"].dt.tz_localize(None)  # on travaille en UTC naïf

    # Identifiant station : zero-pad sur 5 chiffres pour matcher le GeoJSON ('07002')
    if "numer_sta" in df.columns:
        df["numer_sta"] = df["numer_sta"].astype(str).str.zfill(5)

    for col in ("t", "u", "ff", "pres", "rr3"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    logger.info("Synop : %d observations", len(df))
    return df


# ---------------------------------------------------------------------------
# Météo — postes Synop (coordonnées GPS)
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def fetch_synop_stations() -> pd.DataFrame:
    """
    Retourne les postes Synop avec leurs coordonnées GPS (GeoJSON).
    Colonnes : numer_sta, nom, latitude, longitude
    """
    logger.info("Téléchargement postes Synop (GeoJSON)…")
    data = _get(SYNOP_STATIONS_URL).json()

    records = []
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        geom = feature.get("geometry") or {}
        coords = geom.get("coordinates", [None, None])
        # Propriété 'Id' dans le GeoJSON 2026 (ex: '07002')
        sta_id = str(props.get("Id", props.get("ID", props.get("id", "")))).strip()
        records.append(
            {
                "numer_sta": sta_id,
                "nom": props.get("Nom", props.get("nom", "")),
                "latitude": coords[1],
                "longitude": coords[0],
            }
        )

    df = pd.DataFrame(records).dropna(subset=["latitude", "longitude"])
    logger.info("Postes Synop : %d", len(df))
    return df
