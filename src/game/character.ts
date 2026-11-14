import '@babylonjs/loaders/glTF';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import type { Scene } from '@babylonjs/core/scene';
import type { HeroDef } from '../config/heroes';

const STAND_IN = 'models/Xbot.glb';
const HEIGHT = 1.8;

export const col3 = (hex: number) => Color3.FromHexString('#' + hex.toString(16).padStart(6, '0'));

/**
 * A playable 3D character.
 * - With `hero.model` set: loads the hero's own rigged model (Mixamo skeleton).
 * - Otherwise: a neutral stand-in rig (same Mixamo skeleton) wearing the hero's colours,
 *   so gameplay, camera and animation code are final and only the model file changes.
 */
export class Character {
  readonly root: TransformNode;
  private groups = new Map<string, AnimationGroup>();
  private facing = 1;
  private yaw = Math.PI / 2;
  private attackT = 0;
  private hurtT = 0;
  private aura: ParticleSystem;
  private light: PointLight;
  meshes: AbstractMesh[] = [];

  private constructor(readonly scene: Scene, readonly hero: HeroDef, root: TransformNode) {
    this.root = root;
    const c = col3(hero.color);
    this.light = new PointLight(`aura-light-${hero.id}`, new Vector3(0, 1.1, -0.6), scene);
    this.light.parent = root;
    this.light.diffuse = c;
    this.light.intensity = 3;
    this.light.range = 4;

    this.aura = new ParticleSystem(`aura-${hero.id}`, 120, scene);
    this.aura.particleTexture = new Texture('textures/spark1.png', scene);
    this.aura.emitter = root as unknown as AbstractMesh;
    this.aura.minEmitBox = new Vector3(-0.35, 0.1, -0.2);
    this.aura.maxEmitBox = new Vector3(0.35, 1.6, 0.2);
    this.aura.color1 = new Color4(c.r, c.g, c.b, 0.9);
    this.aura.color2 = Color4.FromColor3(col3(hero.accent), 0.7);
    this.aura.colorDead = new Color4(c.r, c.g, c.b, 0);
    this.aura.minSize = 0.04; this.aura.maxSize = 0.14;
    this.aura.minLifeTime = 0.3; this.aura.maxLifeTime = 0.8;
    this.aura.emitRate = 40;
    this.aura.blendMode = ParticleSystem.BLENDMODE_ADD;
    this.aura.gravity = new Vector3(0, hero.id === 'earth' ? -1 : 1.5, 0);
    this.aura.direction1 = new Vector3(-0.3, 0.6, -0.3);
    this.aura.direction2 = new Vector3(0.3, 1.2, 0.3);
    this.aura.minEmitPower = 0.2; this.aura.maxEmitPower = 0.6;
    this.aura.start();
  }

  static async create(scene: Scene, hero: HeroDef, shadows?: ShadowGenerator): Promise<Character> {
    const container = await LoadAssetContainerAsync(hero.model ?? STAND_IN, scene);
    const inst = container.instantiateModelsToScene((n) => `${hero.id}-${n}`, true);
    const holder = new TransformNode(`char-${hero.id}`, scene);
    const model = inst.rootNodes[0] as TransformNode;
    model.parent = holder;

    // Normalise height.
    const { min, max } = model.getHierarchyBoundingVectors(true);
    const s = HEIGHT / Math.max(0.01, max.y - min.y);
    model.scaling.scaleInPlace(s);
    model.position.y -= min.y * s;

    const ch = new Character(scene, hero, holder);
    ch.meshes = model.getChildMeshes(false);
    // Rim light: separates the hero from busy, colourful backgrounds (readability on small screens).
    let rim = scene.getLightByName('rim') as DirectionalLight | null;
    if (!rim) {
      rim = new DirectionalLight('rim', new Vector3(-0.25, -0.35, -1), scene);
      rim.intensity = 2.2;
      rim.diffuse = new Color3(0.85, 0.92, 1);
      rim.specular = new Color3(1, 1, 1);
    }
    for (const m of ch.meshes) {
      rim.includedOnlyMeshes.push(m);
      if (m.material && 'maxSimultaneousLights' in m.material) (m.material as PBRMaterial).maxSimultaneousLights = 8;
      shadows?.addShadowCaster(m, true);
      m.receiveShadows = true;
      if (!hero.model && m.material instanceof PBRMaterial) ch.dress(m.material);
    }
    for (const g of inst.animationGroups) {
      ch.groups.set(g.name.replace(`${hero.id}-`, '').toLowerCase(), g);
      g.stop();
    }
    for (const name of ['idle', 'walk', 'run']) {
      const g = ch.groups.get(name);
      if (g) { g.start(true); g.setWeightForAllAnimatables(name === 'idle' ? 1 : 0); }
    }
    return ch;
  }

  /** Stand-in only: suit colours from the hero palette, metallic accents. */
  private dress(mat: PBRMaterial) {
    const joints = /joint/i.test(mat.name);
    mat.albedoColor = joints ? col3(this.hero.accent) : col3(this.hero.color).scale(0.55);
    mat.metallic = joints ? 0.85 : 0.25;
    mat.roughness = joints ? 0.3 : 0.55;
    mat.emissiveColor = joints ? col3(this.hero.color).scale(0.35) : Color3.Black();
  }

  get position() { return this.root.position; }

  face(dir: number) { if (dir) this.facing = Math.sign(dir); }

  attack() { this.attackT = 0.28; const g = this.groups.get('punch'); if (g) g.start(false); }
  hurt() { this.hurtT = 0.35; }

  setVisible(v: boolean) { this.root.setEnabled(v); v ? this.aura.start() : this.aura.stop(); }

  burstAura(rate: number) { this.aura.emitRate = rate; }

  /** speedRatio: |vx| / maxSpeed. */
  update(dt: number, x: number, y: number, speedRatio: number, grounded: boolean) {
    // Face slightly toward the camera for a readable 3/4 view.
    const target = this.facing > 0 ? Math.PI / 2 - 0.35 : -Math.PI / 2 + 0.35;
    this.yaw += (target - this.yaw) * Math.min(1, dt * 14);
    this.root.rotation.y = this.yaw;

    let lean = 0;
    let lunge = 0;
    if (this.attackT > 0) {
      this.attackT -= dt;
      const k = Math.sin((1 - this.attackT / 0.28) * Math.PI);
      lunge = 0.35 * k * this.facing;
      lean = 0.25 * k;
    }
    if (this.hurtT > 0) { this.hurtT -= dt; lean = -0.3 * Math.sin(this.hurtT * 30); }
    this.root.position.set(x + lunge, y, 0);
    this.root.rotation.x = 0;
    this.root.rotation.z = -lean * this.facing;

    const run = grounded ? Math.min(1, Math.max(0, (speedRatio - 0.15) / 0.6)) : 0.6;
    const walk = grounded ? Math.max(0, Math.min(speedRatio, 0.5) * 2 - run) : 0;
    const idle = Math.max(0, 1 - run - walk);
    this.groups.get('idle')?.setWeightForAllAnimatables(idle);
    this.groups.get('walk')?.setWeightForAllAnimatables(walk);
    const r = this.groups.get('run');
    if (r) { r.setWeightForAllAnimatables(run); r.speedRatio = grounded ? 1 : 0.35; }
  }

  dispose() {
    this.aura.dispose();
    this.light.dispose();
    this.groups.forEach((g) => g.dispose());
    this.root.dispose(false, true);
  }
}
