# Portfolio Xeax — Noé @ Ynov Lyon

Portfolio full-stack moderne avec panneau d'administration intégré. Construit avec **Next.js 14 (App Router) + TypeScript + Tailwind CSS**, persistance via **fichier JSON**, authentification **JWT** sur **cookie httpOnly**.

---

## ✨ Stack

- Next.js 14 + React 18 + TypeScript strict
- Tailwind CSS, Framer Motion, lucide-react
- JWT (`jose`) + bcryptjs pour l'authentification
- Validation des entrées avec `zod`
- Persistance dans `data/portfolio.json` (créé/mis à jour automatiquement)

---

## 🚀 Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Définir la variable d'environnement (obligatoire en prod, optionnel en dev)
cp .env.example .env.local
# Édite .env.local et remplace JWT_SECRET par une chaîne aléatoire >= 32 caractères

# 3. Lancer en développement
npm run dev
# → http://localhost:3000          (portfolio public)
# → http://localhost:3000/login    (panneau admin)
```

### Identifiants par défaut

| Champ        | Valeur     |
|--------------|------------|
| Username     | `admin`    |
| Password     | `admin123` |

⚠️ **À changer dès la première connexion** depuis `/admin/account`. Le hash bcrypt est généré automatiquement au premier démarrage et écrit dans `data/portfolio.json`.

---

## 🗂️ Structure

```
portfolio-xeax/
├── data/portfolio.json              ← stockage (profil, projets, skills, passions, auth)
├── src/
│   ├── app/
│   │   ├── (public)/                ← pages publiques (Navbar/Footer partagés)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx             ← / (landing terminal-style)
│   │   │   ├── projects/page.tsx    ← /projects
│   │   │   ├── skills/page.tsx      ← /skills
│   │   │   ├── passions/page.tsx    ← /passions (gaming + music)
│   │   │   └── contact/page.tsx     ← /contact
│   │   ├── login/page.tsx           ← /login
│   │   ├── admin/                   ← dashboard admin (protégé)
│   │   │   ├── page.tsx             ← vue d'ensemble + aperçu live
│   │   │   ├── projects/            ← CRUD + réorganisation
│   │   │   ├── skills/              ← CRUD catégories/niveaux
│   │   │   ├── passions/            ← gaming + musique (Spotify embeds)
│   │   │   ├── profile/             ← profil + liens sociaux
│   │   │   └── account/             ← username/password
│   │   └── api/                     ← routes API
│   ├── components/                  ← Hero, Projects, Skills, Passions, Contact, ...
│   ├── lib/
│   │   ├── db.ts                    ← lecture/écriture JSON (auto-migration)
│   │   ├── auth.ts                  ← JWT + cookies httpOnly
│   │   └── types.ts
│   └── middleware.ts                ← protège /admin/*
└── ...
```

## 🧭 Pages publiques

| Route        | Contenu                                                       |
|--------------|---------------------------------------------------------------|
| `/`          | Hero terminal-style + carte des sections + 3 projets featured |
| `/projects`  | Liste complète des projets                                    |
| `/skills`    | Stack par catégorie (Frontend, Backend, DevOps, Tools, Other) |
| `/passions`  | **Gaming** (Faceit CS2, TRN Tracker RL, Steam, …) + **Music** (embeds Spotify auto) |
| `/contact`   | Email, location, liens sociaux                                |

---

## 🔐 Sécurité

- Mots de passe hashés avec **bcrypt** (10 rounds)
- Sessions JWT signées HS256, expiration **7 jours**
- Cookie httpOnly + sameSite=lax + secure en production
- Middleware protégeant toutes les routes `/admin/*`
- Toutes les routes API mutantes vérifient la session
- Validation stricte des entrées avec `zod` côté serveur

---

## 🖼️ Upload d'images

- Endpoint protégé : `POST /api/upload` (multipart, champ `file`)
- Formats : `png`, `jpg`, `jpeg`, `gif`, `webp`, `svg` — **max 5 Mo**
- Stockés dans `public/uploads/<timestamp>_<hash>.<ext>` → URL servie en `/uploads/...`
- Composant `<ImageUpload>` réutilisable dans l'admin (preview, suppression, fallback URL manuelle)
- Disponible pour : **logo de projet** (en fond de carte) et **image de jeu** (carte gaming)

> ⚠️ **Persistance** : sur Vercel le filesystem est en lecture seule en prod — utilise Render/Railway/Fly.io avec un volume monté sur `/app/public/uploads`, ou bascule sur Vercel Blob.

## 🎮 Tester un projet en direct (`/play/[id]`)

Chaque projet a maintenant un champ **`playUrl`** dans l'admin. S'il est rempli :
- Un bouton **`play`** apparaît sur la carte projet du portfolio.
- La route `/play/<id>` charge le projet en **iframe sandboxée** dans une fenêtre terminal-style + bouton plein-écran.

`playUrl` accepte deux formats :
- une **URL absolue** (`https://mon-projet.fly.dev`)
- un **chemin local** (`/runtime/power4-web/index.html`) si tu as buildé ton projet en statique et placé le résultat dans `public/runtime/<slug>/`

### Pour tes 3 projets

| Projet | Source | État dans le portfolio | Action |
|---|---|---|---|
| **power4-web** | branche `dev` (le `main` est vide) — serveur Go + templates HTML | ✅ **Déjà jouable** : porté en JS pur dans `public/runtime/power4-web/` (logique 1:1 avec `models/game.go`, thème futuriste, animations drop/win/pulse). `playUrl` = `/runtime/power4-web/index.html` | Rien à faire — clique simplement sur **`play`** dans la carte projet |
| **Hera** | Monorepo backend + ML | `playUrl` vide | Tu déploies (Fly.io / Render avec Dockerfile depuis `apps/`) → tu colles l'URL publique dans l'admin |
| **Groupie Tracker** | Serveur Go + SQLite + WebSockets (blindtest, petitbac) multi-joueurs | `playUrl` vide | Trop dépendant du serveur (sessions WS, base de données partagée) pour être porté en statique. Déploie sur Fly.io / Render (Go buildpack) → colle l'URL |

> ℹ️ **Note technique sur Power 4** : le projet original est un serveur Go avec rendu HTML server-side et sessions stockées en mémoire. Pour qu'il soit jouable directement depuis le portfolio sans backend, j'ai porté la logique de jeu (`models/game.go`, ~150 lignes) en JavaScript pur dans `public/runtime/power4-web/game.js`. Le HTML/CSS reprend l'esthétique futuriste (Orbitron + JetBrains Mono, néon cyan/magenta, animations). Aucune dépendance externe sauf Google Fonts.

> Les projets Go déployés (Hera, Groupie Tracker) seront chargés par l'iframe `/play/[id]` une fois leur URL ajoutée — sauf si le serveur renvoie `X-Frame-Options: DENY`, auquel cas le bouton **`open_fullscreen`** ouvre dans un nouvel onglet.

## ✏️ Utilisation

1. Ouvre `http://localhost:3000` → portfolio public.
2. Va sur `http://localhost:3000/login`, connecte-toi avec `admin / admin123`.
3. Dans le dashboard :
   - **Projects** : ajouter / modifier / supprimer / réorganiser (boutons ↑↓), **uploader un logo/image** (en fond de carte), définir un **`playUrl`** pour activer le bouton "play".
   - **Skills** : par catégorie (Frontend, Backend, DevOps, Tools, Other), niveau 1 → 5.
   - **Passions** :
     - *Gaming* : ajouter des jeux avec plateforme (Faceit, TRN, Steam, …), pseudo, URL, rang, couleur d'accent et **image** (uploadée ou URL).
     - *Music* : ajouter des albums/playlists/artistes/tracks avec URL Spotify — l'**embed est généré automatiquement** à partir de l'URL `open.spotify.com/{type}/{id}`.
   - **Profile** : nom, titre, bio, email, location, photo, liens sociaux.
   - **Account** : changer username et/ou password (le mot de passe actuel est requis).
4. L'**aperçu live** sur le dashboard reflète les modifications immédiatement.

---

## 📦 Build & Déploiement

```bash
npm run build
npm start
```

### Vercel
- Pousse le projet sur GitHub.
- Importer dans Vercel → définir `JWT_SECRET` dans les variables d'environnement.
- ⚠️ Vercel a un système de fichiers en lecture seule en production : pour persister `data/portfolio.json`, il faut soit utiliser **Vercel Blob / KV**, soit déployer sur **Render / Railway / Fly.io / VPS** où le système de fichiers est persistant.

### Render / Railway / Fly.io
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Variable d'environnement: `JWT_SECRET=...`
- Volume persistant monté sur `/app/data` recommandé.

---

## 🧱 Données initiales

Le projet est livré avec :
- **3 projets pré-remplis** : Power 4 Web, Hera, Groupie Tracker.
- **10 compétences** réparties sur Frontend / Backend / DevOps / Tools.
- **3 entrées gaming** (Faceit CS2, TRN Tracker Rocket League, Steam profile) — pseudos à éditer.
- **3 entrées musique** (playlist + album + artiste) — URLs Spotify d'exemple à remplacer.
- Profil : Noé, Ynov Lyon, sous-titre `"Passionate about web development and creative solutions"`.

Tout est éditable depuis le panneau admin.

---

## 🛠️ Scripts

| Commande         | Effet                              |
|------------------|------------------------------------|
| `npm run dev`    | Démarre Next.js en mode dev        |
| `npm run build`  | Build production                   |
| `npm start`      | Lance l'app en production          |
| `npm run lint`   | Lint le code                       |

---

## 📝 Licence

Personnel — © Noé.
