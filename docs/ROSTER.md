# Combattants d'Elementara (20)

Ordre de difficulté du **Tournoi des Gardiens** (niveau 1 = le plus facile). La force de l'IA, ses points de vie et ses dégâts dépendent du niveau ([src/config/heroes.ts](../src/config/heroes.ts), fonction `aiFor`). En mode Simplifié (espace parents), chaque adversaire joue comme s'il avait 4 niveaux de moins.

| Niv. | Nom | Rang | Élément | Spéciale | Taille | Visuel |
|---|---|---|---|---|---|---|
| 1 | Sami | Apprenti | Vent | trait | 0,94 | à créer |
| 2 | Lila | Apprentie | Eau | trait | 0,93 | à créer |
| 3 | Brahim | Apprenti | Terre | bombe en cloche | 0,97 | à créer |
| 4 | Yara | Apprentie | Feu | trait | 0,94 | à créer |
| 5 | Idris | Apprenti | Lumière | triple trait | 0,96 | à créer |
| 6 | Zephyr | Gardien | Vent | triple trait | 1 | ✅ illustration |
| 7 | Marina | Gardienne | Eau | vague au sol | 1 | ✅ illustration |
| 8 | Tarek | Gardien | Terre | explosion | 1 | ✅ illustration |
| 9 | Nour | Gardienne | Lumière | orbe chercheur | 1 | ✅ illustration |
| 10 | Ignis | Gardien | Feu | charge éclair | 1 | ✅ illustration |
| 11 | Haddou | Maître | Terre | vague au sol | 1,06 | à créer |
| 12 | Ouarda | Maîtresse | Eau | orbe chercheur | 1,02 | à créer |
| 13 | Azzedine | Maître | Feu | charge éclair | 1,05 | à créer |
| 14 | Tilelli | Maîtresse | Vent | triple trait | 1,02 | à créer |
| 15 | Amine | Maître | Lumière | explosion | 1,04 | à créer |
| 16 | Magmor | Gardien élémentaire | Feu | bombe en cloche | 1,3 | à créer |
| 17 | Maréa | Gardienne élémentaire | Eau | vague au sol | 1,15 | à créer |
| 18 | Sahrok | Gardien élémentaire | Terre | explosion | 1,4 | à créer |
| 19 | Aquilon | Gardien élémentaire | Vent | orbe chercheur | 1,2 | à créer |
| 20 | Elementar | Gardien du Temple | les cinq | explosion | 1,5 | à créer |

Les 5 héros sont jouables dès le départ ; chaque adversaire battu dans le tournoi devient jouable.

## Créer les 15 nouveaux personnages

Même procédure que pour les héros : 1) illustration Midjourney validée, 2) détourage, 3) modèle 3D en pose A, 4) squelette Mixamo ([ASSET_PIPELINE.md](ASSET_PIPELINE.md)). Une fois l'illustration validée, la déposer dans `art/original/fighters-<id>.png` et renseigner `art:` dans [src/config/heroes.ts](../src/config/heroes.ts).

Chaque prompt reprend le style de vos héros grâce à `--sref` (référence de style = Ignis). Tous les personnages restent adaptés aux 8-16 ans : tenues couvrantes, aucune arme réaliste, créatures impressionnantes mais pas effrayantes.

Partie commune, à la fin de chaque prompt :

```
semi-realistic 3D game character, realistic proportions, detailed fabric and material textures, cinematic lighting, full body, front view, neutral standing pose, age-appropriate full-coverage outfit, no weapons, no blood, plain dark grey studio background, AAA game concept art --sref https://raw.githubusercontent.com/drissguessous/elementara/main/public/assets/heroes/fire.png --ar 2:3 --v 7 --style raw
```

### Apprentis (niveaux 1 à 5)

**Sami (vent)**
```
young wind apprentice boy, 11 years old, slim, messy black hair, light mint-green and white training tunic with wind swirl patterns, short cloth cape, fingerless gloves, sandals-boots, curious cheeky smile, + partie commune
```
**Lila (eau)**
```
young water apprentice girl, 11 years old, short wavy brown hair with a blue headband, light blue and white training wetsuit with small wave motifs, matching boots, cheerful determined look, + partie commune
```
**Brahim (terre)**
```
young earth apprentice boy, 12 years old, stocky, short curly hair, sand-beige padded training outfit with small clay-coloured shoulder pads, leather belt with pouches, sturdy boots, calm friendly expression, + partie commune
```
**Yara (feu)**
```
young fire apprentice girl, 12 years old, black hair in a high bun with an orange ribbon, coral-red and black training suit with small flame piping, wrist guards, sporty shoes, eager confident grin, + partie commune
```
**Idris (lumière)**
```
young light apprentice boy, 12 years old, neat dark hair, ivory and pale gold training tunic with simple Moroccan zellige border pattern, small glowing pendant, light boots, bright attentive expression, + partie commune
```

### Maîtres (niveaux 11 à 15)

**Haddou (terre, Atlas)**
```
earth master man, about 50 years old, strong build, short grey beard, Amazigh-inspired brown and moss-green layered robe with stone-plated shoulder guards, wide woven belt, mountain boots, wise stern expression, + partie commune
```
**Ouarda (eau, Essaouira)**
```
water master woman, about 40 years old, long dark hair in a braid with shell clasps, deep blue and turquoise flowing coat over a fitted suit, wave-shaped silver trims, elegant calm expression, + partie commune
```
**Azzedine (feu)**
```
fire master man, about 35 years old, athletic, short dark hair, crimson and charcoal armoured martial-arts outfit with gold flame engravings, heat-glowing gauntlets, intense focused expression, + partie commune
```
**Tilelli (vent)**
```
wind master woman, about 30 years old, slender and agile, silver-white hair tied back, light grey-green aerial outfit with layered translucent scarves like wings, aviator goggles, serene confident smile, + partie commune
```
**Amine (lumière)**
```
light master man, about 45 years old, tall, short salt-and-pepper beard, white and gold ceremonial outfit with intricate zellige geometric patterns, glowing medallion on the chest, kind but powerful expression, + partie commune
```

### Gardiens élémentaires (niveaux 16 à 20)

**Magmor (golem de lave)**
```
huge humanoid lava golem, body of dark basalt rock plates with glowing orange cracks, broad shoulders, calm stone face with glowing eyes and a closed mouth, ancient carved rune bands on arms, + partie commune
```
**Maréa (esprit des marées)**
```
tall humanoid tide spirit woman, body made of translucent turquoise water with foam edges, long flowing hair of waves, coral and shell crown, graceful majestic pose, + partie commune
```
**Sahrok (colosse de sable)**
```
giant humanoid sand colossus, body of compacted golden sand and sandstone blocks, carved Amazigh geometric symbols, glowing amber eyes, heavy arms, ancient and calm presence, + partie commune
```
**Aquilon (seigneur des vents)**
```
tall humanoid wind lord, armour of pale silver and jade feathers, long cape that dissolves into swirling wind, mask-like noble face, floating slightly above the ground, + partie commune
```
**Elementar (gardien du Temple)**
```
majestic guardian of the five elements, tall armoured humanoid, armour split into five harmonious sections of fire, water, wind, earth and light, golden crown with five gems, glowing calm eyes, final boss presence but not scary, + partie commune
```
