import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Image } from '@babylonjs/gui/2D/controls/image';
import type { Game, Screen } from '../core/game';
import { setupGraphics } from '../core/graphics';
import { createUI, place, text, GOLD } from '../core/ui';
import { heroById } from '../config/heroes';
import { repo } from '../data/repository';
import { Character } from '../game/character';
import { t } from '../i18n';

/**
 * Model validation turntable (art direction): the 3D model next to the original artwork.
 * Deep link: ?screen=preview&hero=fire&model=models/preview/fire.glb  (&angle=0|90|180 to freeze a view)
 */
export async function previewScreen(game: Game): Promise<Screen> {
  const scene = new Scene(game.engine);
  const hero = heroById(repo.profile().heroId);
  const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 2.15, 4.2, new Vector3(0, 0.95, 0), scene);
  camera.attachControl(true);
  camera.lowerRadiusLimit = 1.5; camera.upperRadiusLimit = 8;
  const light = setupGraphics(scene, camera, { warm: false, sunDir: new Vector3(-0.4, -1, 0.8) });
  const floor = MeshBuilder.CreateDisc('floor', { radius: 2.2, tessellation: 64 }, scene);
  floor.rotation.x = Math.PI / 2;
  const fm = new PBRMaterial('floorMat', scene); fm.albedoColor = new Color3(0.12, 0.1, 0.16); fm.roughness = 0.8; floor.material = fm;
  floor.receiveShadows = true;
  const ch = await Character.create(scene, hero, light.shadows);
  ch.burstAura(0);
  const hemi = scene.getLightByName('hemi');
  if (hemi) hemi.intensity = 1.1;
  const fixed = new URLSearchParams(location.search).get('angle');
  // angle 0 = facing the camera
  let angle = Math.PI + (fixed ? (Number(fixed) * Math.PI) / 180 : 0);

  const ui = createUI(scene);
  const art = new Image('art', hero.art); art.stretch = Image.STRETCH_UNIFORM; art.widthInPixels = 300; art.heightInPixels = 560;
  place(art, 40, 0, Control.HORIZONTAL_ALIGNMENT_LEFT); ui.addControl(art);
  const title = text(`${hero.name} — ${t('preview.title')}`, 30, GOLD); place(title, 0, 20, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_TOP);
  ui.addControl(title);

  return {
    scene,
    update(dt) {
      if (!fixed) angle += dt * 0.6;
      ch.root.rotation.y = angle;
      ch.root.position.set(0, 0, 0);
    },
    dispose() { ch.dispose(); scene.dispose(); },
  };
}
