import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';

/** One-shot particle burst (pickups, hits, KO "poof" made of light — never blood). */
export function burst(scene: Scene, pos: Vector3, color: Color3, count = 60, power = 4, size = 0.18) {
  const ps = new ParticleSystem('burst', count, scene);
  ps.particleTexture = new Texture('textures/spark1.png', scene);
  ps.emitter = pos.clone();
  ps.minEmitBox = ps.maxEmitBox = Vector3.Zero();
  ps.color1 = Color4.FromColor3(color, 1);
  ps.color2 = new Color4(1, 1, 1, 1);
  ps.colorDead = Color4.FromColor3(color, 0);
  ps.minSize = size * 0.4; ps.maxSize = size;
  ps.minLifeTime = 0.25; ps.maxLifeTime = 0.7;
  ps.manualEmitCount = count;
  ps.direction1 = new Vector3(-1, -1, -1);
  ps.direction2 = new Vector3(1, 1, 1);
  ps.minEmitPower = power * 0.4; ps.maxEmitPower = power;
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  ps.gravity = new Vector3(0, -4, 0);
  ps.targetStopDuration = 0.8;
  ps.disposeOnStop = true;
  ps.start();
  return ps;
}

/** Continuous column (geyser, wind updraft). */
export function column(scene: Scene, pos: Vector3, color1: Color4, color2: Color4, height: number, rate = 200, tex = 'textures/spark1.png') {
  const ps = new ParticleSystem('column', rate * 2, scene);
  ps.particleTexture = new Texture(tex, scene);
  ps.emitter = pos.clone();
  ps.minEmitBox = new Vector3(-0.4, 0, -0.4);
  ps.maxEmitBox = new Vector3(0.4, 0, 0.4);
  ps.color1 = color1; ps.color2 = color2;
  ps.colorDead = new Color4(color2.r, color2.g, color2.b, 0);
  ps.minSize = 0.2; ps.maxSize = 0.6;
  ps.minLifeTime = height / 10; ps.maxLifeTime = height / 7;
  ps.emitRate = rate;
  ps.direction1 = new Vector3(-0.15, 1, -0.15);
  ps.direction2 = new Vector3(0.15, 1, 0.15);
  ps.minEmitPower = 7; ps.maxEmitPower = 10;
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  return ps;
}
