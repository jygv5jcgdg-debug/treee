import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONSTANTS, TreeState, COLORS } from '../types';

// Custom Shader Material for the Foliage
const FoliageShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uMorphFactor: { value: 0 }, // 0 = scattered, 1 = tree
    uColorDeep: { value: COLORS.EMERALD_DEEP },
    uColorLight: { value: COLORS.EMERALD_LIGHT },
    uGold: { value: COLORS.GOLD_METALLIC },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uMorphFactor;
    uniform vec3 uColorDeep;
    uniform vec3 uColorLight;
    uniform vec3 uGold;
    
    attribute vec3 aScatterPos;
    attribute float aRandom;
    attribute float aSize;
    
    varying vec3 vColor;
    varying float vAlpha;

    // Cubic ease out for smoother transition inside shader
    float easeOutCubic(float x) {
      return 1.0 - pow(1.0 - x, 3.0);
    }

    void main() {
      float t = easeOutCubic(uMorphFactor);
      
      // Interpolate between scatter position and tree position (original geometry position)
      vec3 targetPos = position;
      vec3 startPos = aScatterPos;
      
      vec3 finalPos = mix(startPos, targetPos, t);

      // Add "Breathing" / Wind effect only when in tree mode
      // Combined low freq sway and high freq flutter
      float breath = sin(uTime * 1.0 + finalPos.y * 0.5) * 0.05 + sin(uTime * 2.5 + aRandom * 15.0) * 0.03;
      
      // Apply breathing mostly in tree state
      float breathIntensity = t; 
      
      finalPos.x += breath * breathIntensity;
      finalPos.z += breath * breathIntensity;
      finalPos.y += breath * 0.3 * breathIntensity;

      // Add some noise-based wobble in scattered mode to keep them alive
      if (t < 0.9) {
         finalPos.y += sin(uTime + aRandom * 100.0) * 0.2 * (1.0 - t);
         finalPos.x += cos(uTime * 0.5 + aRandom * 50.0) * 0.2 * (1.0 - t);
      }

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      
      // Size attenuation
      gl_PointSize = aSize * (350.0 / -mvPosition.z);

      // Color mixing based on height and random factor
      // Gradient from Deep Emerald at bottom to Lighter at top
      // Adjusted divisor from 15.0 to 25.0 to handle taller tree height (18.0)
      vec3 baseColor = mix(uColorDeep, uColorLight, (position.y / 25.0 + 0.5) * 0.8 + aRandom * 0.2);
      
      // Edge Highlight / Gold Sparkle
      // We use the random factor + time to create sparkling tips
      float sparkleCycle = sin(uTime * 2.0 + aRandom * 50.0);
      float isSparkle = smoothstep(0.95, 1.0, sparkleCycle);
      
      // Mix base color with Gold based on sparkle and tree state
      vColor = mix(baseColor, uGold, isSparkle * t * 0.8); 
      
      // Alpha
      vAlpha = 0.7 + 0.3 * sin(uTime + aRandom * 10.0);

      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      // Circular particle
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      
      if (dist > 0.5) discard;
      
      // Soft edge with exponential falloff for "glow" look
      float strength = 1.0 - (dist * 2.0);
      strength = pow(strength, 2.0);

      gl_FragColor = vec4(vColor, vAlpha * strength);
      
      // HDR boosting for Bloom
      gl_FragColor.rgb *= 1.5; 
    }
  `
};

interface FoliageProps {
  treeState: TreeState;
}

export const Foliage: React.FC<FoliageProps> = ({ treeState }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  // Generate geometry data once
  const { positions, scatterPositions, randoms, sizes } = useMemo(() => {
    const count = CONSTANTS.FOLIAGE_COUNT;
    const pos = new Float32Array(count * 3);
    const scat = new Float32Array(count * 3);
    const rands = new Float32Array(count);
    const sz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Tree Position (Cone Spiral)
      const y = (Math.random() * CONSTANTS.TREE_HEIGHT) - (CONSTANTS.TREE_HEIGHT / 2); 
      
      // Calculate max radius at this height
      const normalizedY = (y + (CONSTANTS.TREE_HEIGHT / 2)) / CONSTANTS.TREE_HEIGHT; // 0 to 1
      const maxRadiusAtY = CONSTANTS.TREE_RADIUS * (1.0 - normalizedY);
      
      // Distribution: Bias towards the surface (Outline)
      const rBias = 0.4 + 0.6 * Math.sqrt(Math.random());
      const radius = maxRadiusAtY * rBias;

      const angle = i * 2.39996 + Math.random() * 0.1; // Golden angle + jitter

      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;
      const ty = y;

      pos[i * 3] = tx;
      pos[i * 3 + 1] = ty;
      pos[i * 3 + 2] = tz;

      // Scatter Position (Random Sphere)
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = CONSTANTS.SCATTER_RADIUS * (0.5 + 0.5 * Math.cbrt(Math.random()));

      scat[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      scat[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      scat[i * 3 + 2] = r * Math.cos(phi);

      rands[i] = Math.random();
      // Vary size: bigger at bottom, smaller at top for detail
      const sizeBase = 0.15 + Math.random() * 0.25;
      sz[i] = sizeBase * (1.2 - normalizedY * 0.4); 
    }

    return {
      positions: pos,
      scatterPositions: scat,
      randoms: rands,
      sizes: sz
    };
  }, []);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      
      // Smoothly interpolate morph factor
      const targetFactor = treeState === TreeState.TREE_SHAPE ? 1.0 : 0.0;
      shaderRef.current.uniforms.uMorphFactor.value = THREE.MathUtils.lerp(
        shaderRef.current.uniforms.uMorphFactor.value,
        targetFactor,
        0.03 // Speed of transition
      );
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScatterPos"
          count={scatterPositions.length / 3}
          array={scatterPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={randoms.length}
          array={randoms}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        args={[FoliageShaderMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};