# AirViz — Qualité de l'air en France

Application web de visualisation de la qualité de l'air en France.
Carte interactive avec données pollution et météo, filtrage par région/date/indice, clustering intelligent.

---

## Sommaire

1. [Présentation](#présentation)
2. [Stack technique](#stack-technique)
3. [Installation & Lancement](#installation--lancement)
4. [Fonctionnalités](#fonctionnalités)
5. [Crédits](#crédits)

---

## Présentation

AirViz permet de visualiser en temps réel la qualité de l'air sur le territoire français via une carte interactive. Les utilisateurs peuvent filtrer par région, date, polluant, et explorer les tendances grâce à des clusters et des statistiques détaillées.

Calcul de l'indice : 
On regarde combien chaque polluant dépasse le seuil
On fait une moyenne pondérée 
On ajuste selon la météo 
On obtient un chiffre entre 0 et 1 
On traduit ça en “Bon”, “Modéré”, “Mauvais” ou “Très mauvais”


IPMA = Moyenne pondérée des polluants normalisés x Facteur météo

Polluants normalisés : chaque polluant / seuil maximal
Moyenne pondérée : certains polluants comptent plus que d’autres
Facteur météo : ajuste selon vent, chaleur, pression, humidité

## Stack technique

| Categorie | Outils                                 |
| --------- | -------------------------------------- |
| Frontend  | React, Vite, Leaflet, React-Leaflet    |
| Backend   | Node.js, Express, Postgree             |
| Données   | data.gouv.fr (LCSQA, SYNOP)            |
| Design    | Syne, IBM Plex Sans, Dark Sidebar      |

## Installation & Lancement

Commande pour lancer le projet : 
- docker compose up --build

Lancement : 
- localhost

Si erreur avec le port, changement dans la ligne 7 du docker-compose.yml

## Fonctionnalités

- Carte interactive Leaflet avec clusters dynamiques
- Filtres par région et date
- Statistiques et légende détaillées
- Jointure pollution/météo par station
- Backend API RESTful (pollution, météo, clusters)

## Sources de données

- Pollution : LCSQA via data.gouv.fr (482 stations, 9 polluants)
- Météo : SYNOP OMM via data.gouv.fr (188 stations)

## Crédits

Projet réalisé dans le cadre du Challenge 48h Y.02
