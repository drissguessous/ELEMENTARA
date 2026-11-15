# Elementara

Jeu d'action 3D pour enfants de 8 à 16 ans : **parcours** et **combats d'arène** à travers cinq royaumes élémentaires inspirés du Maroc (Volcan d'Ifrane, Port d'Essaouira, Sommets de l'Atlas, Désert de Merzouga, Médina de Lumière) jusqu'au Temple des Éléments.

Mobile d'abord (Android et iOS via Capacitor), jouable aussi dans le navigateur.

## Jouer

| Où | Comment |
|---|---|
| Navigateur (téléphone ou PC) | https://drissguessous.github.io/ELEMENTARA/ (après activation de GitHub Pages, voir plus bas) |
| Android | Page [Releases → latest-android](https://github.com/drissguessous/ELEMENTARA/releases/tag/latest-android) → télécharger `Elementara.apk` → installer |
| iOS | `npm run ios` sur un Mac avec Xcode (compte Apple Developer requis pour l'App Store) |

**Commandes :** ◀ ▶ se déplacer, ⤒ sauter, ✦ pouvoir / attaque spéciale, ✊ frapper (3 appuis = combo), 🛡 se protéger. Au clavier : flèches, Espace, J (frapper), K (spéciale), L (garde).

Liens directs utiles pour les démos : `?screen=parcours&world=volcano&level=0`, `?screen=arena&me=fire&opponent=magmor`, `?screen=tournament&demo=1`, `?screen=fighters&demo=1`, `?screen=board&demo=1`, `?demo=1` (charge les données simulées).

## Contenu de la version 0.1

- **5 héros** (Ignis/Feu, Marina/Eau, Zephyr/Vent, Tarek/Terre, Nour/Lumière), chacun avec un pouvoir de parcours et un projectile d'arène.
- **5 royaumes × 3 parcours + 1 arène de gardien**, puis le Temple. Niveaux générés de façon déterministe (identiques sur tous les appareils), obstacles propres à chaque monde : geysers de feu, eau, courants de vent, sables mouvants, plateformes mobiles, rochers à briser.
- **Mode Combat** : **20 combattants** (les 5 héros + 15 adversaires, des apprentis aux gardiens élémentaires) avec une difficulté croissante ([docs/ROSTER.md](docs/ROSTER.md)).
  - **Tournoi des Gardiens** : 19 combats du plus facile au plus fort ; chaque adversaire battu devient jouable.
  - **Combat libre** : n'importe quel combattant débloqué contre n'importe quel autre.
  - Combos en 3 coups, garde avec jauge (garde brisée), 7 attaques spéciales (trait, triple trait, bombe en cloche, vague au sol, charge, explosion, orbe chercheur), IA dont la force suit le niveau de l'adversaire.
  - Sans aucune violence réaliste : les KO sont des explosions de lumière, et l'arène est fermée par des barrières (pas de chute hors du terrain).
- **Espace parents** protégé par une question : limite de temps de jeu quotidienne, mode Simplifié (8-11 ans) ou Expert (12-16 ans), son, langue (FR/EN). Jeu en ligne désactivé.
- **Aucune donnée ne quitte le téléphone** : pas de compte, pas de publicité, pas de chat, pas d'achat.
- **Base de données de simulation** (`src/data/simulation/seed.json`) : 12 joueurs fictifs, progression, 40 matchs — pour les démos, les réunions R&D et les tests front-end (Espace parents → « Charger les données de démo »).

## Personnages 3D

Le jeu tourne avec un **mannequin 3D provisoire** (squelette Mixamo standard) aux couleurs de chaque héros. Les modèles définitifs de vos 5 héros remplacent ce mannequin sans autre changement de code : voir [docs/ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md).

## Développement

```bash
npm install
npm run dev        # http://localhost:5173 (accessible depuis le téléphone sur le même Wi-Fi)
npm run build      # vérification TypeScript + build de production dans dist/
npm run android    # build + ouverture dans Android Studio
npm run ios        # build + ouverture dans Xcode (Mac)
```

| Dossier | Rôle |
|---|---|
| [src/core](src/core) | moteur (Babylon.js), rendu réaliste (éclairage HDR, ombres, bloom, tone mapping ACES), interface, commandes tactiles |
| [src/game](src/game) | personnages, physique de plateforme, génération des niveaux, décors, effets |
| [src/screens](src/screens) | écrans : titre, choix du héros, carte, parcours, arène, mode Combat (tournoi, combat libre, sélection), résultats, classement, parents |
| [src/config](src/config) | héros et mondes (statistiques, pouvoirs, décors) |
| [src/data](src/data) | sauvegarde locale et données de simulation |
| [public/assets](public/assets) | visuels du jeu (dérivés de `art/original`) |
| [art/original](art/original) | illustrations d'origine, jamais modifiées |
| [docs](docs) | pipeline des assets, outils gratuits, crédits, feuille de route |

## Automatisations GitHub

- **Web build & play online** ([.github/workflows/web.yml](.github/workflows/web.yml)) : vérifie, construit et publie la version web à chaque push. À activer une fois : *Settings → Pages → Source : GitHub Actions*.
- **Android APK** ([.github/workflows/android.yml](.github/workflows/android.yml)) : construit l'APK installable et le publie sur la release `latest-android`.
- **Generate 3D heroes** ([.github/workflows/generate-3d.yml](.github/workflows/generate-3d.yml)) : conversion automatique image → 3D (TRELLIS), en solution de secours à Midjourney 3D.

## Documentation

- [docs/ROSTER.md](docs/ROSTER.md) : les 20 combattants, leur niveau et les prompts Midjourney des 15 nouveaux
- [docs/ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md) : de l'image au personnage 3D animé dans le jeu
- [docs/FREE_TOOLS.md](docs/FREE_TOOLS.md) : outils et bibliothèques gratuits (3D, animation, vidéo, photo, son)
- [docs/CREDITS.md](docs/CREDITS.md) : licences des éléments tiers
- [docs/ROADMAP.md](docs/ROADMAP.md) : prochaines étapes
