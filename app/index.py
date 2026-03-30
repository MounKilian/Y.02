"""
index.py
Calcul de l'indice IPMA (Indice Pollution-Météo Atmosphérique).

Formule :
    IPMA = Σ(wᵢ × Cᵢ/Sᵢ) × F_météo   clampé dans [0, 1]

  Cᵢ/Sᵢ   : concentration normalisée par le seuil européen (≤ 1)
  wᵢ      : poids du polluant i (somme = 1)
  F_météo : facteur d'amplification ∈ [1.0, 2.5] selon vent / temp / pression
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# Seuils réglementaires européens (µg/m³, CO en mg/m³)
EU_THRESHOLDS: dict[str, float] = {
    "O3":   180.0,
    "NO2":  200.0,
    "SO2":  350.0,
    "PM10":  50.0,
    "PM25":  25.0,
    "CO":    10.0,
}

# Poids par polluant (somme = 1)
WEIGHTS: dict[str, float] = {
    "O3":   0.20,
    "NO2":  0.25,
    "SO2":  0.10,
    "PM10": 0.20,
    "PM25": 0.20,
    "CO":   0.05,
}

CATEGORIES = [
    (0.00, 0.25, "Bon"),
    (0.25, 0.50, "Modéré"),
    (0.50, 0.75, "Mauvais"),
    (0.75, 1.01, "Très mauvais"),
]


def _meteo_factor(t_k, u_pct, ff_ms, pres_pa) -> float:
    """
    Facteur d'amplification météo ∈ [1.0, 2.5].

    - Vent faible  → accumulation des polluants  (poids 0.40)
    - Chaleur      → formation d'ozone           (poids 0.30)
    - Anticyclone  → inversion thermique         (poids 0.20)
    - Sécheresse   → concentration accrue        (poids 0.10)
    """
    scores, weights = [], []

    if ff_ms is not None and not np.isnan(float(ff_ms)):
        scores.append(max(0.0, 1.0 - float(ff_ms) / 10.0))
        weights.append(0.40)

    if t_k is not None and not np.isnan(float(t_k)):
        tc = float(t_k) - 273.15
        scores.append(max(0.0, min(1.0, (tc - 15.0) / 25.0)))
        weights.append(0.30)

    if pres_pa is not None and not np.isnan(float(pres_pa)):
        hpa = float(pres_pa) / 100.0
        scores.append(max(0.0, min(1.0, (hpa - 1000.0) / 30.0)))
        weights.append(0.20)

    if u_pct is not None and not np.isnan(float(u_pct)):
        scores.append(max(0.0, 1.0 - float(u_pct) / 60.0))
        weights.append(0.10)

    if not scores:
        return 1.0

    raw = sum(s * w for s, w in zip(scores, weights)) / sum(weights)
    return round(1.0 + raw * 1.5, 4)


def compute_ipma(row: pd.Series) -> dict:
    """Calcule l'IPMA pour une ligne du DataFrame fusionné."""
    detail: dict = {}
    w_sum = w_tot = 0.0

    for pol, threshold in EU_THRESHOLDS.items():
        val = row.get(pol)
        if val is not None and not (isinstance(val, float) and np.isnan(val)):
            norm = min(float(val) / threshold, 1.0)
            w_sum += WEIGHTS[pol] * norm
            w_tot += WEIGHTS[pol]
            detail[pol] = round(norm, 4)
        else:
            detail[pol] = None

    if w_tot == 0:
        return {"ipma": None, "categorie": "Données insuffisantes",
                "pollution_score": None, "meteo_factor": None, "detail": detail}

    pollution_score = w_sum / w_tot
    f_meteo = _meteo_factor(row.get("t"), row.get("u"), row.get("ff"), row.get("pres"))
    ipma = min(pollution_score * f_meteo, 1.0)

    categorie = "Très mauvais"
    for low, high, label in CATEGORIES:
        if low <= ipma < high:
            categorie = label
            break

    return {
        "ipma": round(ipma, 4),
        "categorie": categorie,
        "pollution_score": round(pollution_score, 4),
        "meteo_factor": f_meteo,
        "detail": detail,
    }


def compute_ipma_dataframe(merged: pd.DataFrame) -> pd.DataFrame:
    """Applique compute_ipma() sur tout le DataFrame et ajoute les colonnes résultat."""
    results = pd.DataFrame(list(merged.apply(compute_ipma, axis=1)))
    out = merged.copy()
    out["ipma"] = results["ipma"]
    out["categorie"] = results["categorie"]
    out["pollution_score"] = results["pollution_score"]
    out["meteo_factor"] = results["meteo_factor"]
    return out
