import earcut from 'earcut';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Scene } from '@babylonjs/core/scene';
import type { WorldDef } from '../config/worlds';
import { col3 } from './character';

/**
 * Builds the visual environment of a realm: painted backdrop (the original concept art),
 * PBR ground, animated hazard surface, atmospheric fog.
 */
export class WorldView {
  backdrop: Mesh;
  hazardPlane: Mesh | null = null;
  private groundMat: PBRMaterial;
  private topMat: PBRMaterial;
  private hazardTex: Texture | null = null;

  constructor(readonly scene: Scene, readonly world: WorldDef, arena = false) {
    // Backdrop: the concept art, unlit, far behind the action, slight parallax.
    const bg = new StandardMaterial('backdrop', scene);
    // Slightly softened copy (depth-of-field look) so the action stays readable in front of the painting.
    const tex = new Texture(`assets/bg3d/${arena ? world.arenaBg : world.parcoursBg}.webp`, scene);
    bg.diffuseTexture = tex;
    bg.emissiveTexture = tex;
    bg.disableLighting = true;
    bg.fogEnabled = false;
    this.backdrop = MeshBuilder.CreatePlane('backdrop', { width: (1376 / 768) * 64, height: 64 }, scene);
    this.backdrop.material = bg;
    this.backdrop.position.set(0, 10, 42);
    this.backdrop.isPickable = false;

    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.012;
    scene.fogColor = this.fogColor();

    const [top, body] = world.ground;
    this.groundMat = new PBRMaterial('ground', scene);
    const bump = new Texture('textures/brick_bump.jpg', scene);
    bump.uScale = 0.35; bump.vScale = 0.35;
    const alb = new Texture('textures/brick_diffuse.jpg', scene);
    alb.uScale = 0.35; alb.vScale = 0.35;
    this.groundMat.albedoTexture = alb;
    this.groundMat.albedoColor = col3(body).toLinearSpace().scale(2.2);
    this.groundMat.bumpTexture = bump;
    this.groundMat.metallic = 0;
    this.groundMat.roughness = 0.92;
    this.groundMat.environmentIntensity = 0.6;

    this.topMat = new PBRMaterial('groundTop', scene);
    this.topMat.albedoTexture = alb;
    this.topMat.albedoColor = col3(top).toLinearSpace().scale(2.4);
    this.topMat.metallic = 0;
    this.topMat.roughness = 0.95;
    this.topMat.environmentIntensity = 0.6;
    const topBump = new Texture('textures/brick_bump.jpg', scene);
    topBump.uScale = 2; topBump.vScale = 0.3;
    topBump.level = 0.4;
    this.topMat.bumpTexture = topBump;

    this.buildHazard();
  }

  private fogColor(): Color3 {
    switch (this.world.hazard) {
      case 'lava': return new Color3(0.25, 0.08, 0.05);
      case 'water': return new Color3(0.55, 0.72, 0.8);
      case 'wind': return new Color3(0.75, 0.82, 0.9);
      case 'quicksand': return new Color3(0.85, 0.68, 0.45);
      default: return new Color3(0.35, 0.22, 0.3);
    }
  }

  private buildHazard() {
    const s = this.scene;
    const plane = MeshBuilder.CreateGround('hazard', { width: 600, height: 60, subdivisions: 2 }, s);
    plane.position.set(250, -2.2, 10);
    switch (this.world.hazard) {
      case 'lava': {
        // Molten surface: emissive PBR with scrolling texture (glow layer adds the heat bloom).
        const m = new PBRMaterial('lava', s);
        const e = new Texture('textures/lavatile.jpg', s);
        e.uScale = 60; e.vScale = 6;
        m.emissiveTexture = e;
        m.emissiveColor = new Color3(0.75, 0.32, 0.12);
        m.albedoColor = new Color3(0.05, 0.01, 0);
        m.roughness = 0.6;
        const n = new Texture('textures/waternormals.jpg', s);
        n.uScale = 30; n.vScale = 3; n.level = 0.6;
        m.bumpTexture = n;
        this.hazardTex = e;
        plane.material = m;
        break;
      }
      case 'water':
      case 'quicksand':
      case 'wind':
      case 'void': {
        const m = new PBRMaterial('hazardMat', s);
        const n = new Texture('textures/waternormals.jpg', s);
        n.uScale = n.vScale = 40;
        m.bumpTexture = n;
        this.hazardTex = n;
        if (this.world.hazard === 'water') {
          m.albedoColor = new Color3(0.02, 0.28, 0.38); m.metallic = 0.1; m.roughness = 0.08; m.alpha = 0.92;
        } else if (this.world.hazard === 'quicksand') {
          m.albedoColor = new Color3(0.78, 0.58, 0.32); m.roughness = 0.95; n.level = 0.5;
        } else {
          // Peaks and rooftops: the painted backdrop shows through, no surface.
          plane.dispose();
          return;
        }
        plane.material = m;
        break;
      }
    }
    plane.receiveShadows = true;
    this.hazardPlane = plane;
  }

  /** Ground block with a top layer, sized from a gameplay box. */
  groundBlock(x: number, y: number, w: number, h: number, depth = 4): Mesh {
    const body = MeshBuilder.CreateBox('gb', { width: w, height: h, depth }, this.scene);
    body.position.set(x, y, 0.4);
    body.material = this.groundMat;
    const top = MeshBuilder.CreateBox('gt', { width: w + 0.12, height: 0.28, depth: depth + 0.12 }, this.scene);
    top.position.set(0, h / 2 - 0.1, 0);
    top.parent = body;
    top.material = this.topMat;
    body.receiveShadows = true;
    top.receiveShadows = true;
    return body;
  }

  platform(x: number, y: number, w: number, h: number): Mesh {
    const p = MeshBuilder.CreateBox('pf', { width: w, height: h, depth: 2.6 }, this.scene);
    p.position.set(x, y, 0.2);
    p.material = this.topMat;
    p.receiveShadows = true;
    return p;
  }

  rock(x: number, y: number, size: number): Mesh {
    const r = MeshBuilder.CreatePolyhedron('rock', { type: 2, size: size * 0.62 }, this.scene);
    r.position.set(x, y, 0);
    r.rotation.set(0.3, 0.6, 0.2);
    r.scaling.y = 0.9;
    r.material = this.groundMat;
    return r;
  }

  star(x: number, y: number): Mesh {
    const shape: Vector3[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      const rad = i % 2 === 0 ? 0.42 : 0.18;
      shape.push(new Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad));
    }
    const m = MeshBuilder.ExtrudePolygon('star', { shape, depth: 0.12, sideOrientation: 2 }, this.scene, earcut);
    m.rotation.x = -Math.PI / 2;
    m.bakeCurrentTransformIntoVertices();
    m.position.set(x, y, 0);
    let mat = this.scene.getMaterialByName('starMat') as PBRMaterial | null;
    if (!mat) {
      mat = new PBRMaterial('starMat', this.scene);
      mat.albedoColor = new Color3(1, 0.78, 0.25);
      mat.metallic = 1; mat.roughness = 0.25;
      mat.emissiveColor = new Color3(0.9, 0.55, 0.1);
    }
    m.material = mat;
    return m;
  }

  update(dt: number, camX: number) {
    this.backdrop.position.x = camX * 0.82;
    if (this.hazardTex) this.hazardTex.uOffset += dt * 0.02;
  }
}
