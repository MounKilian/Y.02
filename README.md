# AirViz — Qualité de l'air en France

Application web de visualisation de la qualité de l'air en France.
Carte interactive avec données pollution et météo, filtrage par région/date/indice, clustering intelligent.

---

## Sommaire

1. [Présentation](#présentation)
2. [Stack technique](#stack-technique)
3. [Installation & Lancement](#installation--lancement)
4. [Structure du projet](#structure-du-projet)
5. [Fonctionnalités](#fonctionnalités)
6. [Sources de données](#sources-de-données)
7. [Crédits](#crédits)

---

## Présentation

AirViz permet de visualiser en temps réel la qualité de l'air sur le territoire français via une carte interactive. Les utilisateurs peuvent filtrer par région, date, polluant, et explorer les tendances grâce à des clusters et des statistiques détaillées.

## Stack technique

| Categorie | Outils                                 |
| --------- | -------------------------------------- |
| Frontend  | React, Vite, Leaflet, React-Leaflet    |
| Backend   | Node.js, Express, SQLite, Supercluster |
| Données   | data.gouv.fr (LCSQA, SYNOP)            |
| Design    | Syne, IBM Plex Sans, Dark Sidebar      |

## Installation & Lancement

1. Cloner le dépôt puis installer les dépendances :
   ```sh
   npm run install:all
   ```
2. Lancer l'application (client + serveur) :
   ```sh
   npm run dev
   ```

## Structure du projet

```
Y.02/
├── client/      # Frontend React + Vite
├── server/      # Backend Express + SQLite
├── worker/      # Tâches de fond (import, clustering)
├── docs/        # Documentation et recherche
└── README.md    # Ce fichier
```

## Fonctionnalités

- Carte interactive Leaflet avec clusters dynamiques
- Filtres par région, date, polluant
- Statistiques et légende détaillées
- Jointure pollution/météo par station
- Backend API RESTful (pollution, météo, clusters)
- Seed et import automatisés

## Sources de données

- Pollution : LCSQA via data.gouv.fr (482 stations, 9 polluants)
- Météo : SYNOP OMM via data.gouv.fr (188 stations)

## Crédits

Projet réalisé dans le cadre du Challenge 48h Y.02
Développeurs : Arthur, ...
Design : Syne, IBM Plex Sans
Librairies : React, Leaflet, Supercluster, Express, SQLite
