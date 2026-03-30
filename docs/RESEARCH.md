# AirViz — Challenge 48h Y.02

> Application web de visualisation de la qualite de l'air en France.
> Carte interactive avec donnees pollution et meteo, filtrage par region/date/indice, clustering intelligent.

---

## Technologies

| Categorie | Outils |
|-----------|--------|
| **Frontend** | React, Vite, Leaflet (CartoDB Voyager) |
| **Backend** | Node.js, Express, SQLite |
| **Clustering** | Supercluster (Mapbox) |
| **Donnees** | data.gouv.fr (LCSQA pollution + SYNOP meteo) |
| **Design** | Syne + IBM Plex Sans, sidebar dark, carte claire |

## Sommaire

**Donnees & Recherches**
1. [Sources de donnees](#1-sources-de-donnees) — d'ou viennent les donnees
2. [API Pollution](#2-api-pollution-lcsqa) — 482 stations, 9 polluants, donnees horaires
3. [API Meteo](#3-api-meteo-synop-omm) — 188 stations, observations toutes les 3h
4. [Jointure geospatiale](#4-jointure-geospatiale) — comment pollution et meteo sont relies

**Architecture**
5. [Stack technique](#5-stack-technique) — structure du projet et choix techniques
6. [Carte & Marqueurs](#6-leaflet--cartographie) — cercles colores, popups, echelle
7. [Clustering](#7-clustering) — regroupement des stations proches
8. [Criteres de notation](#8-criteres-de-notation) — grille d'evaluation /15 pts

**Suivi**
9. [Avancement](#9-avancement) — journal des etapes realisees
10. [Explication des metriques](#explication-des-metriques) — que signifient PM2.5, NO2, O3...

---

## 1. Sources de donnees

| Source | Type | Frequence | Stations | Auth |
|--------|------|-----------|----------|------|
| LCSQA (pollution) | CSV quotidien ~12 MB | Horaire | 482 actives | Aucune |
| SYNOP OMM (meteo) | CSV annuel .gz | Toutes les 3h | 188 | Aucune |

Les deux sources sont en acces libre sur data.gouv.fr, telechargement direct sans cle API.

---

## 2. API Pollution (LCSQA)

### Acces aux donnees

**CSV quotidiens (methode recommandee)** :
```
https://object.files.data.gouv.fr/ineris-prod/lcsqa/concentrations-de-polluants-atmospheriques-reglementes/temps-reel/{ANNEE}/FR_E2_{YYYY-MM-DD}.csv
```

Exemple :
```
https://object.files.data.gouv.fr/ineris-prod/lcsqa/concentrations-de-polluants-atmospheriques-reglementes/temps-reel/2026/FR_E2_2026-03-29.csv
```

**Metadonnees stations (Excel)** :
```
https://static.data.gouv.fr/resources/donnees-temps-reel-de-mesure-des-concentrations-de-polluants-atmospheriques-reglementes-1/20251210-084445/fr-2025-d-lcsqa-ineris-20251209.xls
```

**Annees disponibles** : 2021 a 2026

### Format CSV

- Separateur : `;`
- Encodage : UTF-8 avec BOM
- ~47 000 lignes/jour

**23 colonnes :**

| Colonne | Type | Exemple |
|---------|------|---------|
| `Date de debut` | datetime | `2026/03/29 00:00:00` |
| `Date de fin` | datetime | `2026/03/29 01:00:00` |
| `Organisme` | string | `ATMO GRAND EST` |
| `code zas` | string | `FR44ZAG02` |
| `Zas` | string | `ZAG METZ` |
| `code site` | string | `FR01011` |
| `nom site` | string | `Metz-Centre` |
| `type d'implantation` | string | `Urbaine` |
| `Polluant` | string | `NO2` |
| `type d'influence` | string | `Fond` |
| `discriminant` | string | `B` |
| `Reglementaire` | string | `Oui` |
| `type d'evaluation` | string | `mesures fixes` |
| `procedure de mesure` | string | `Auto NO2_NOx Conf meth CHIMILU` |
| `type de valeur` | string | `moyenne horaire brute` |
| `valeur` | float | `15` |
| `valeur brute` | float | `14.975` |
| `unite de mesure` | string | `ug-m3` |
| `taux de saisie` | float | (souvent vide) |
| `couverture temporelle` | float | (souvent vide) |
| `couverture de donnees` | float | (souvent vide) |
| `code qualite` | string | `A`, `N`, `R` |
| `validite` | int | `1` ou `4` |

### Polluants mesures

| Polluant | Description | Mesures/jour | Unite |
|----------|------------|--------------|-------|
| NO2 | Dioxyde d'azote | ~8 200 | ug/m3 |
| NOX as NO2 | Oxydes d'azote | ~8 200 | ug/m3 |
| NO | Monoxyde d'azote | ~8 200 | ug/m3 |
| PM10 | Particules < 10um | ~7 700 | ug/m3 |
| O3 | Ozone | ~6 500 | ug/m3 |
| PM2.5 | Particules fines | ~6 000 | ug/m3 |
| SO2 | Dioxyde de soufre | ~1 800 | ug/m3 |
| CO | Monoxyde de carbone | ~400 | mg/m3 |
| C6H6 | Benzene | ~120 | ug/m3 |

### Stations pollution

- **482 stations actives** reparties sur la France entiere + Outre-mer
- 18 organismes regionaux (ATMO)
- Coordonnees GPS dans le fichier Excel metadonnees (feuille `AirQualityStations`)
- Jointure CSV <-> stations via le champ `code site` = `NatlStationCode`

### Exemple de donnees brutes

```csv
"Date de debut";"Date de fin";"Organisme";"code zas";"Zas";"code site";"nom site";"type d'implantation";"Polluant";"type d'influence";"discriminant";"Reglementaire";"type d'evaluation";"procedure de mesure";"type de valeur";"valeur";"valeur brute";"unite de mesure";"taux de saisie";"couverture temporelle";"couverture de donnees";"code qualite";"validite"
"2026/03/29 00:00:00";"2026/03/29 01:00:00";"ATMO GRAND EST";"FR44ZAG02";"ZAG METZ";"FR01011";"Metz-Centre";"Urbaine";"NO2";"Fond";"B";"Oui";"mesures fixes";"Auto NO2_NOx Conf meth CHIMILU";"moyenne horaire brute";"15";"14.975";"ug-m3";;;;"A";"1"
```

---

## 3. API Meteo (SYNOP OMM)

### Acces aux donnees

**Archives CSV annuelles compressees** :
```
https://object.files.data.gouv.fr/meteofrance/data/synchro_ftp/OBS/SYNOP/synop_{ANNEE}.csv.gz
```

**Stations GeoJSON** :
```
https://object.files.data.gouv.fr/meteofrance/data/synchro_ftp/OBS/SYNOP/postes_synop.geojson
```

**Annees disponibles** : 1996 a 2026

### Format CSV

- Separateur : `;`
- Compression : `.gz`
- 59 colonnes par observation
- Observations toutes les 3h (00h, 03h, 06h, 09h, 12h, 15h, 18h, 21h UTC)

**Colonnes principales :**

| Colonne | Description | Unite | Piege |
|---------|------------|-------|-------|
| `numer_sta` | Indicatif OMM station | - | - |
| `date` | Date UTC | AAAAMMDDHHMISS | - |
| `t` | Temperature | **Kelvin** | -273.15 pour Celsius ! |
| `td` | Point de rosee | Kelvin | idem |
| `u` | Humidite relative | % | - |
| `dd` | Direction vent | degres | - |
| `ff` | Vitesse vent moyen 10 min | m/s | - |
| `raf10` | Rafale 10 dernieres min | m/s | - |
| `pmer` | Pression niveau mer | **Pascals** | /100 pour hPa ! |
| `pres` | Pression station | Pascals | idem |
| `vv` | Visibilite horizontale | metres | - |
| `n` | Nebulosite totale | % | - |
| `rr1` | Precipitations 1h | mm | - |
| `rr3` | Precipitations 3h | mm | - |
| `rr24` | Precipitations 24h | mm | - |
| `ht_neige` | Hauteur neige au sol | metres | - |

**Valeurs manquantes** : codees `mq` (~53% des champs)

### Stations meteo

- **188 stations** France metropolitaine + Outre-mer + TAAF
- Coordonnees dans le GeoJSON : lat, lng, altitude, nom, date ouverture

Exemples :

| ID OMM | Nom | Lat | Lng | Alt |
|--------|-----|-----|-----|-----|
| 07005 | ABBEVILLE | 50.136 | 1.834 | 69m |
| 07015 | LILLE-LESQUIN | 50.570 | 3.098 | 47m |
| 07027 | CAEN-CARPIQUET | 49.180 | -0.456 | 67m |

### Exemple de donnees brutes

```csv
numer_sta;date;pmer;tend;cod_tend;dd;ff;t;td;u;vv;...
07005;20250101000000;102190;-160;8;200;2.500000;281.150000;278.250000;82;20000;...
```

Decode : station ABBEVILLE, 01/01/2025 00h UTC, temp 281.15K = **8.0C**, humidite 82%, vent SSW 2.5 m/s

---

## 4. Jointure geospatiale

C'est le travail de l'equipe **Data/IA** :
- Stations pollution (482) et meteo (188) n'ont PAS les memes coordonnees
- Rapprochement par proximite GPS (nearest neighbor)
- Generation d'un **indice combine** pollution + meteo avec ponderation
- Mise a disposition via un **endpoint API** que nous (Dev) consommons

**Cote Dev, on consomme l'endpoint de l'equipe Data** — on ne fait pas le calcul nous-memes.

> Prevoir un mock JSON de l'API Data au cas ou leur endpoint n'est pas pret.

---

## 5. Stack technique

### Architecture choisie

```
projet/
├── api/                    # Express (port 4000)
│   ├── server.js
│   ├── routes/
│   │   └── stations.js     # GET /api/stations + filtres
│   └── db.js               # SQLite (better-sqlite3)
├── worker/
│   └── index.js            # node-cron, poll API Data toutes les X min
├── client/                 # React + Vite (port 5173 en dev)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Map.jsx
│   │   │   ├── Filters.jsx
│   │   │   └── StationPopup.jsx
│   │   └── utils/
│   │       └── icons.js
│   └── index.html
├── package.json
└── .env
```

### Choix techniques

| Composant | Choix | Raison |
|-----------|-------|--------|
| Backend | Express | Simple, separation claire, worker en process separe |
| Frontend | React + Vite | HMR rapide, ecosysteme Leaflet, ideal 48h |
| BDD | SQLite (better-sqlite3) | Zero config, fichier embarque, suffisant pour <50k points |
| Carte | Leaflet | Impose par le sujet |
| Worker | node-cron | Syntaxe cron flexible, zero dependance externe |
| Styling | Tailwind CSS | Prototypage rapide |
| State | useState/useContext | Pas besoin de Redux pour 48h |

### Dependances principales

```
# Backend
express, cors, better-sqlite3, node-cron, axios

# Frontend
react, react-dom, leaflet, react-leaflet, react-leaflet-cluster
tailwindcss, @headlessui/react (optionnel)
```

---

## 6. Leaflet & Cartographie

### Cercles avec indice a l'interieur

Utiliser `L.divIcon` (ni CircleMarker ni L.circle — pas de texte natif) :

```javascript
function createPollutionIcon(value, color) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        background-color: ${color};
        width: 36px; height: 36px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        color: white; font-weight: bold; font-size: 14px;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">${value}</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}
```

### Echelle de couleurs

```javascript
function getColor(index) {
  if (index <= 25) return '#22c55e';  // Vert - Bon
  if (index <= 50) return '#eab308';  // Jaune - Moyen
  if (index <= 75) return '#f97316';  // Orange - Mauvais
  return '#ef4444';                    // Rouge - Tres mauvais
}
```

### Popup au clic

```javascript
marker.bindPopup(`
  <h3>${station.name}</h3>
  <p>Indice: ${station.index}/100</p>
  <p>PM2.5: ${station.pm25} ug/m3</p>
  <p>Temperature: ${station.temp}C</p>
`);
```

---

## 7. Clustering

### Client — Leaflet.markercluster

```javascript
const clusterGroup = L.markerClusterGroup({
  iconCreateFunction: function(cluster) {
    const markers = cluster.getAllChildMarkers();
    const avg = markers.reduce((sum, m) => sum + m.options.pollutionIndex, 0) / markers.length;
    const color = getColor(avg);
    const count = cluster.getChildCount();
    return L.divIcon({
      className: '',
      html: `<div style="background:${color}; width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; border:3px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.4);">
        <div style="text-align:center; line-height:1.2;">
          <div style="font-size:16px;">${Math.round(avg)}</div>
          <div style="font-size:10px;">(${count})</div>
        </div>
      </div>`,
      iconSize: [50, 50],
      iconAnchor: [25, 25],
    });
  },
  maxClusterRadius: 60,
});
```

Astuce : stocker `pollutionIndex` dans `marker.options` pour y acceder dans le cluster.

### Serveur — Supercluster (recommande)

```javascript
import Supercluster from 'supercluster';

const index = new Supercluster({ radius: 60, maxZoom: 16 });
index.load(geojsonFeatures);

// Clusters pour une bbox + zoom
const clusters = index.getClusters([west, south, east, north], zoomLevel);
```

Zero dependance BDD spatiale, fonctionne en memoire Node.js.

**Alternatives PostGIS** (si PostgreSQL dispo) :
- `ST_GeoHash(geom, precision)` — grid-based
- `ST_ClusterDBSCAN(geom, eps, minpoints)` — density-based

---

## 8. Criteres de notation

### Equipe Dev — /15 pts

| Critere | Description | Points |
|---------|-------------|--------|
| **Consommation & Persistance** | Worker (recup cyclique toutes les X min) + stockage propre en BDD | /4 |
| **Backend & API Filtres** | Endpoint restitution + filtrage efficace (dates, zones geo, bornes d'index) | /4 |
| **Integration Cartographique** | Maitrise Leaflet, cercles dynamiques, popups, coloration par indice | /4 |
| **IHM & Experience Utilisateur** | Ergonomie formulaires filtrage + reactivite (MAJ sans rechargement page) | /3 |

### Bonus

- Clusterisation cote client (Leaflet.markercluster)
- Clusterisation cote serveur (Supercluster)

---

## Notes et decisions

- [x] Stack confirme : Express + React/Vite + SQLite
- [x] Mock API Data prepare (`/api/mock`)
- [ ] Format de l'endpoint equipe Data a definir avec eux

---

## 9. Avancement

### Etape 1 — Mise en place du projet

Premiere etape : creer la structure du projet, installer les outils necessaires et verifier que tout demarre correctement. On a mis en place trois services independants (serveur API, worker, interface web) qui peuvent tourner en parallele avec une seule commande.

**Resultat :** Le projet demarre, l'API repond sur le port 4000.

---

### Etape 2 — Base de donnees et API

On a cree la base de donnees qui stocke les stations de mesure et leurs releves (pollution, meteo). L'API permet de recuperer ces donnees avec des filtres : par date, par zone geographique ou par niveau de pollution. On a aussi genere des donnees fictives realistes sur 106 stations francaises pour pouvoir tester sans attendre l'equipe Data.

**Resultat :** 106 stations, 20 352 mesures. Les filtres fonctionnent (ex: "Paris 50km" retourne 12 stations).

---

### Etape 3 — Worker de collecte

Le worker est un programme qui tourne en arriere-plan et va regulierement chercher les nouvelles donnees aupres de l'equipe Data. Il les stocke en base de donnees sans creer de doublons. En attendant que l'equipe Data fournisse son endpoint, on utilise un endpoint "mock" qui simule leurs donnees.

**Resultat :** Le worker poll toutes les 5 minutes, detecte et ignore les doublons, gere les erreurs proprement.

---

### Etape 4 — Carte interactive

On a integre une carte Leaflet qui affiche chaque station sous forme de cercle colore avec son indice de pollution a l'interieur. La couleur va du vert (bon) au rouge (tres mauvais). En cliquant sur une station, un popup affiche le detail : polluants mesures, temperature, vent, humidite.

**Resultat :** 106 stations visibles sur la carte de France, popups fonctionnels.

---

### Etape 5 — Interface utilisateur et filtres

Refonte complete de l'interface : sidebar sombre a gauche avec les filtres, la carte prend le reste de l'ecran. Les filtres permettent de chercher par periode, par ville ou region (~50 localisations), et par niveau de pollution. Quand on selectionne une ville, la carte se deplace avec une animation fluide. Une legende et des statistiques en temps reel completent l'interface.

**Resultat :** Filtrage reactif sans rechargement de page, navigation animee vers les villes, stats mises a jour en direct.

---

### Comprendre les donnees affichees

Les stations mesurent 4 polluants principaux :
- **PM2.5** : Particules tres fines, les plus dangereuses pour la sante
- **PM10** : Particules plus grosses (poussiere, pollen)
- **NO₂** : Gaz toxique issu du trafic routier
- **O₃** : Ozone, forme par reaction chimique avec le soleil

L'indice combine (de 0 a 100) resume la qualite de l'air en un seul chiffre. Plus il est bas, meilleur est l'air.

| Indice | Qualite | Couleur |
|--------|---------|---------|
| 0-20 | Bon | Vert |
| 21-40 | Correct | Vert clair |
| 41-60 | Moyen | Jaune |
| 61-80 | Mauvais | Orange |
| 81-100 | Tres mauvais | Rouge |

---

### Etape 6 — Bonus : Clustering

Quand on regarde la carte de France entiere, 106 marqueurs c'est dense. Le clustering regroupe automatiquement les stations proches en un seul cercle plus gros qui affiche l'indice moyen et le nombre de stations regroupees. En zoomant, les groupes se decomposent pour reveler les stations individuelles. Ce regroupement est calcule cote serveur (plus performant) et s'adapte en temps reel au niveau de zoom.

**Resultat :** Vue France = 15 clusters + 55 stations. Clic sur un cluster = zoom anime vers les stations individuelles.

---

## 10. Conclusion

L'application **AirViz** couvre l'ensemble des criteres de notation de l'equipe Dev :

| Critere | Points | Couvert |
|---------|--------|---------|
| Worker + stockage BDD | /4 | Oui — polling cron, SQLite, deduplication |
| API + filtres | /4 | Oui — dates, zones geo, bornes d'indice, combinables |
| Carte Leaflet | /4 | Oui — cercles colores, popups detailles, couleur par indice |
| IHM + reactivite | /3 | Oui — filtres ergonomiques, mise a jour sans rechargement |
| **Bonus clustering** | extra | Oui — client + serveur (Supercluster) |

**Architecture finale :**

```
Y.02/
├── docs/RESEARCH.md        # Ce document
├── server/                  # Backend (API Express + Worker + SQLite)
│   ├── src/                 # Code source API + seed
│   └── worker/              # Service de collecte automatique
├── client/                  # Frontend (React + Vite + Leaflet)
│   └── src/                 # Composants, filtres, carte
└── package.json             # Scripts de lancement
```

Le projet est pret a etre connecte a l'endpoint reel de l'equipe Data (il suffit de modifier `DATA_API_URL` dans le `.env`) et a etre dockerise par l'equipe Infra.
