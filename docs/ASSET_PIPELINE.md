# Pipeline des assets

Règle absolue : **les personnages ne sont jamais redessinés ni réinterprétés.** Les illustrations d'origine sont conservées telles quelles dans [art/original](../art/original). Chaque modèle 3D est validé par la direction artistique avant d'entrer dans le jeu.

## 1. Personnages : de l'image au héros animé

| Étape | Outil (gratuit) | Résultat |
|---|---|---|
| 1. Illustration de référence | Midjourney (déjà fait) | `art/original/heroes-*.png` |
| 2. Détourage (fond retiré, aucune autre retouche) | `rembg` (open source) | [public/assets/heroes](../public/assets/heroes) |
| 3. Modèle 3D en pose A, sans effets | Midjourney 3D (prompts ci-dessous). Secours : TRELLIS ou Hunyuan3D (open source), via le workflow `generate-3d.yml` | `models/source/<héros>.glb` |
| 4. **Validation** visage, tenue, couleurs | Direction artistique | ✅ / ❌ |
| 5. Squelette + animations | [Mixamo](https://www.mixamo.com) (gratuit, compte Adobe) : *Upload* → placer les repères → télécharger en FBX « With Skin » + animations | squelette `mixamorig:*` |
| 6. Conversion et optimisation | Blender (import FBX → export glTF binaire), puis `npx @gltf-transform/cli optimize` (Draco, textures WebP 2048) | `public/models/heroes/<héros>.glb` |
| 7. Branchement | Dans [src/config/heroes.ts](../src/config/heroes.ts), remplacer `model: null` par `model: 'models/heroes/<héros>.glb'` | le héros remplace le mannequin |

### Animations attendues (noms des clips dans le GLB)

`idle`, `walk`, `run` (obligatoires, déjà gérées), `punch` (utilisée dès qu'elle est présente), puis `jump`, `hit`, `victory` (branchées en v0.2). Mixamo propose toutes ces animations gratuitement ; cocher *In Place* pour `walk` et `run`.

### Contraintes techniques des modèles

- Hauteur indifférente : le jeu remet chaque modèle à 1,80 m.
- 30 000 triangles maximum par héros, 1 texture 2048 px (couleur, normal map, rugosité/métal).
- Pose A, face caméra, sans particules, flammes, eau ou halo : les effets élémentaires sont ajoutés par le jeu.

### Prompts Midjourney 3D (référence = image d'origine)

Chaque prompt utilise `--oref` vers l'image détourée du héros et `--ow 400` pour une fidélité maximale. Les prompts complets ont été fournis dans la conversation de lancement du projet ; la structure est :

```
full body 3D game character model of the exact same <description fidèle à l'image>,
A-pose, arms away from body, front view, no effects, no particles, neutral studio lighting,
plain light grey background, semi-realistic PBR, game-ready
--oref https://raw.githubusercontent.com/drissguessous/elementara/main/public/assets/heroes/<héros>.png --ow 400 --ar 3:4 --v 7 --style raw
```

## 2. Décors

Les illustrations des arènes et parcours servent de toile de fond peinte derrière la scène 3D :
- [public/assets/bg](../public/assets/bg) : versions nettes (menus).
- [public/assets/bg3d](../public/assets/bg3d) : versions légèrement adoucies (effet de profondeur de champ en jeu).

Trois illustrations contiennent une interface de jeu dessinée (coeurs, score) et ne sont pas utilisées en jeu : `parcours-merzouga-dunes`, `parcours-essaouira-water`, `parcours-volcano`. Pour les remplacer, régénérer les mêmes prompts en ajoutant `no UI, no text, no HUD`.

## 3. Textures, éclairage, sons

- Textures PBR : remplacer les textures provisoires (`public/textures`) par des équivalents CC0 d'[ambientCG](https://ambientcg.com) ou [Poly Haven](https://polyhaven.com) (roche volcanique, pierre de l'Atlas, pisé, zellige).
- Éclairage : HDRI CC0 de Poly Haven dans `public/env` (format `.hdr` 1k).
- Sons : voir [FREE_TOOLS.md](FREE_TOOLS.md). Les effets actuels sont synthétisés par le code ([src/systems/audio.ts](../src/systems/audio.ts)).
