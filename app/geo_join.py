"""
geo_join.py
Jointure géospatiale : associe chaque station pollution au poste météo
le plus proche via un KDTree sur coordonnées cartésiennes, puis fusionne
les mesures sur le temps (arrondi à l'heure).
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from scipy.spatial import KDTree

logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6371.0
MAX_DISTANCE_KM = 50.0


def _to_cartesian(lat_deg: np.ndarray, lon_deg: np.ndarray) -> np.ndarray:
    """Lat/lon (degrés) → coordonnées cartésiennes sur sphère unitaire."""
    lat = np.radians(lat_deg)
    lon = np.radians(lon_deg)
    return np.column_stack([
        np.cos(lat) * np.cos(lon),
        np.cos(lat) * np.sin(lon),
        np.sin(lat),
    ])


def build_station_mapping(
    pollution_stations: pd.DataFrame,
    synop_stations: pd.DataFrame,
    max_dist_km: float = MAX_DISTANCE_KM,
) -> pd.DataFrame:
    """
    Associe chaque station pollution au poste Synop le plus proche.

    Paramètres
    ----------
    pollution_stations : colonnes [station_id, latitude, longitude]
    synop_stations     : colonnes [numer_sta, latitude, longitude]
    max_dist_km        : distance max pour valider la paire (défaut 50 km)

    Retour
    ------
    DataFrame [station_id, numer_sta, dist_km]
    """
    poll = pollution_stations.dropna(subset=["latitude", "longitude"]).copy()
    synop = synop_stations.dropna(subset=["latitude", "longitude"]).copy()

    poll_xyz = _to_cartesian(poll["latitude"].values, poll["longitude"].values)
    synop_xyz = _to_cartesian(synop["latitude"].values, synop["longitude"].values)

    tree = KDTree(synop_xyz)
    dists_chord, indices = tree.query(poll_xyz, k=1)

    # Distance chordale → km
    dists_km = 2 * EARTH_RADIUS_KM * np.arcsin(np.clip(dists_chord / 2, 0, 1))

    mapping = pd.DataFrame({
        "station_id": poll["station_id"].values,
        "numer_sta": synop.iloc[indices]["numer_sta"].values,
        "dist_km": dists_km,
    })

    before = len(mapping)
    mapping = mapping[mapping["dist_km"] <= max_dist_km].reset_index(drop=True)
    logger.info("Mapping stations : %d/%d paires (dist ≤ %.0f km)", len(mapping), before, max_dist_km)
    return mapping


def merge_pollution_meteo(
    pollution: pd.DataFrame,
    synop: pd.DataFrame,
    station_mapping: pd.DataFrame,
    freq: str = "1h",
) -> pd.DataFrame:
    """
    Fusionne pollution et météo sur (station_id ↔ numer_sta) + heure arrondie.

    Retour
    ------
    DataFrame avec colonnes pollution pivotées par polluant + colonnes météo.
    """
    # Pivot pollution : une ligne par (station, heure)
    poll = pollution.copy()
    poll["heure"] = poll["date_debut"].dt.floor(freq)

    POLLUANTS = {"O3", "NO2", "SO2", "PM10", "PM25", "CO"}
    if "polluant" in poll.columns:
        poll["polluant"] = poll["polluant"].str.upper().str.replace(".", "", regex=False)
        poll = poll[poll["polluant"].isin(POLLUANTS)]

    poll_pivot = (
        poll.groupby(["station_id", "heure", "polluant"])["valeur"]
        .mean()
        .unstack("polluant")
        .reset_index()
    )
    poll_pivot.columns.name = None

    # Agrégation météo à la même fréquence
    meteo = synop.copy()
    meteo["heure"] = meteo["date"].dt.floor(freq)
    meteo_cols = [c for c in ("t", "u", "ff", "pres", "rr3") if c in meteo.columns]
    meteo_agg = (
        meteo.groupby(["numer_sta", "heure"])[meteo_cols]
        .mean()
        .reset_index()
    )

    # Jointure via la table de correspondance
    merged = (
        poll_pivot
        .merge(station_mapping[["station_id", "numer_sta", "dist_km"]], on="station_id", how="inner")
        .merge(meteo_agg, on=["numer_sta", "heure"], how="left")
    )

    logger.info("Dataset fusionné : %d lignes", len(merged))
    return merged
