"""
fetcher.py
Téléchargement et parsing des données brutes depuis data.gouv.fr.

Deux sources :
  - LCSQA  : concentrations horaires de polluants + métadonnées stations
             URL directe : .../temps-reel/{YYYY}/FR_E2_{YYYY-MM-DD}.csv
  - Synop  : observations météo toutes les 3h + coordonnées des postes
"""

from __future__ import annotations

import io
import logging
from datetime import datetime, timedelta
from functools import lru_cache

import pandas as pd
import requests

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# URLs upstream (data.gouv.fr)
# ---------------------------------------------------------------------------

POLLUTION_CSV_BASE = (
    "https://object.files.data.gouv.fr/ineris-prod/lcsqa/"
    "concentrations-de-polluants-atmospheriques-reglementes/temps-reel"
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


def _pollution_csv_url(date: datetime) -> str:
    """Construit l'URL directe du CSV LCSQA pour une date donnée."""
    return f"{POLLUTION_CSV_BASE}/{date.year}/FR_E2_{date.strftime('%Y-%m-%d')}.csv"


def fetch_pollution_measures(days: int = 2) -> pd.DataFrame:
    """
    Télécharge les mesures horaires LCSQA pour les N derniers jours.

    URL : .../temps-reel/{YYYY}/FR_E2_{YYYY-MM-DD}.csv
    Colonnes normalisées : station_id, date_debut, date_fin, polluant, valeur
    """
    logger.info("Téléchargement mesures pollution (%d jours)…", days)
    frames = []

    for offset in range(days):
        date = datetime.utcnow() - timedelta(days=offset)
        url = _pollution_csv_url(date)
        try:
            resp = _get(url, timeout=30)
            if "text/html" in resp.headers.get("content-type", ""):
                logger.warning("HTML reçu pour %s — skip", date.strftime("%Y-%m-%d"))
                continue

            df = pd.read_csv(
                io.StringIO(resp.text),
                sep=";",
                encoding="utf-8-sig",
                on_bad_lines="skip",
            )
            df.columns = [c.strip().lower().replace(" ", "_").replace("'", "'") for c in df.columns]

            rename = {
                "code_site": "station_id",
                "nom_site": "nom_station",
                "type_d'implantation": "type_implantation",
                "polluant": "polluant",
                "valeur": "valeur",
                "date_de_début": "date_debut",
                "date_de_fin": "date_fin",
                "unité_de_mesure": "unite",
                "validité": "validite",
            }
            df = df.rename(columns={k: v for k, v in rename.items() if k in df.columns})

            if "date_debut" in df.columns:
                df["date_debut"] = pd.to_datetime(df["date_debut"], errors="coerce")
            if "date_fin" in df.columns:
                df["date_fin"] = pd.to_datetime(df["date_fin"], errors="coerce")
            if "valeur" in df.columns:
                df["valeur"] = pd.to_numeric(df["valeur"], errors="coerce")

            df["source"] = "lcsqa"
            frames.append(df)
            logger.info("  %s : %d lignes", date.strftime("%Y-%m-%d"), len(df))

        except Exception as exc:
            logger.warning("  %s : échec (%s)", date.strftime("%Y-%m-%d"), exc)

    if not frames:
        logger.error("Aucune donnée pollution récupérée !")
        return pd.DataFrame(columns=["station_id", "date_debut", "polluant", "valeur"])

    result = pd.concat(frames, ignore_index=True)
    logger.info("Mesures pollution (LCSQA) : %d lignes total", len(result))
    return result


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
