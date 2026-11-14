import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { Scene } from '@babylonjs/core/scene';

export interface Lighting {
  sun: DirectionalLight;
  shadows: ShadowGenerator;
  glow: GlowLayer;
}

const lowEnd = () => /Android [4-8]\b/.test(navigator.userAgent) || (navigator.hardwareConcurrency ?? 8) <= 4;

/**
 * Cinematic, physically-based setup shared by every 3D screen:
 * HDR image-based lighting, soft shadows, bloom, ACES tone mapping, FXAA.
 */
export function setupGraphics(scene: Scene, camera: Camera, opts: { warm?: boolean; sunDir?: Vector3; sunColor?: Color3 } = {}): Lighting {
  scene.clearColor = new Color4(0.05, 0.03, 0.1, 1);
  const env = new HDRCubeTexture(opts.warm ? 'env/venice_sunset_1k.hdr' : 'env/quarry_01_1k.hdr', scene, 256, false, true, false, true);
  scene.environmentTexture = env;
  scene.environmentIntensity = 0.9;

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.25;

  const sun = new DirectionalLight('sun', opts.sunDir ?? new Vector3(-0.5, -1, 0.6), scene);
  sun.position = new Vector3(20, 30, -20);
  sun.intensity = 2.4;
  sun.diffuse = opts.sunColor ?? new Color3(1, 0.93, 0.82);

  const shadows = new ShadowGenerator(lowEnd() ? 1024 : 2048, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.002;
  shadows.normalBias = 0.02;

  const glow = new GlowLayer('glow', scene, { mainTextureSamples: 2, blurKernelSize: 48 });
  glow.intensity = 0.7;

  const pipe = new DefaultRenderingPipeline('pipe', true, scene, [camera]);
  pipe.fxaaEnabled = true;
  pipe.samples = lowEnd() ? 1 : 4;
  pipe.bloomEnabled = true;
  pipe.bloomThreshold = 0.75;
  pipe.bloomWeight = 0.35;
  pipe.bloomKernel = 48;
  pipe.imageProcessingEnabled = true;
  pipe.imageProcessing.toneMappingEnabled = true;
  pipe.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  pipe.imageProcessing.exposure = 1.05;
  pipe.imageProcessing.contrast = 1.12;
  pipe.imageProcessing.vignetteEnabled = true;
  pipe.imageProcessing.vignetteWeight = 1.6;
  pipe.sharpenEnabled = !lowEnd();
  if (pipe.sharpenEnabled) pipe.sharpen.edgeAmount = 0.25;

  return { sun, shadows, glow };
}
