"""
forecast.py
Prévisions IPMA par régression linéaire simple (OLS).

Modèle : IPMA(t) = α + β × t_unix
Pour chaque station, on ajuste le modèle sur l'historique disponible,
puis on prédit les N prochaines heures.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score

logger = logging.getLogger(__name__)

MIN_OBSERVATIONS = 6
DEFAULT_HORIZON_H = 24


def _fit_station(df_s: pd.DataFrame) -> dict | None:
    df_clean = df_s.dropna(subset=["heure", "ipma"]).sort_values("heure")
    if len(df_clean) < MIN_OBSERVATIONS:
        return None

    t = (df_clean["heure"].astype(np.int64).values // 10**9).reshape(-1, 1)
    y = df_clean["ipma"].values

    model = LinearRegression().fit(t, y)
    y_pred = model.predict(t)

    return {
        "model": model,
        "last_time": df_clean["heure"].iloc[-1],
        "mae": float(mean_absolute_error(y, y_pred)),
        "r2": float(r2_score(y, y_pred)),
        "n_obs": len(df_clean),
    }


def forecast_ipma(df: pd.DataFrame, horizon_h: int = DEFAULT_HORIZON_H) -> pd.DataFrame:
    """
    Génère des prévisions IPMA pour chaque station sur les prochaines `horizon_h` heures.

    Paramètres
    ----------
    df        : DataFrame avec [station_id, heure, ipma]
    horizon_h : nombre d'heures à prévoir (max 72)

    Retour
    ------
    DataFrame [station_id, forecast_time, ipma_forecast, mae, r2, n_obs]
    """
    records = []

    for station_id in df["station_id"].unique():
        fit = _fit_station(df[df["station_id"] == station_id])
        if fit is None:
            continue

        future_times = [fit["last_time"] + pd.Timedelta(hours=h) for h in range(1, horizon_h + 1)]
        t_future = np.array([int(ts.timestamp()) for ts in future_times]).reshape(-1, 1)
        preds = np.clip(fit["model"].predict(t_future), 0.0, 1.0)

        for ft, val in zip(future_times, preds):
            records.append({
                "station_id": station_id,
                "forecast_time": ft,
                "ipma_forecast": round(float(val), 4),
                "mae": round(fit["mae"], 4),
                "r2": round(fit["r2"], 4),
                "n_obs": fit["n_obs"],
            })

    if not records:
        return pd.DataFrame(columns=["station_id", "forecast_time", "ipma_forecast", "mae", "r2", "n_obs"])

    result = pd.DataFrame(records)
    logger.info("Prévisions : %d points sur %d stations", len(result), result["station_id"].nunique())
    return result
