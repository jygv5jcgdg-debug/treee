
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SnowShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#E0F7FA') }, // Icy white
    uHeight: { value: 60 }, // Increased vertical range
    uRange: { value: 50 }, // Horizontal range
    uSpeed: { value: 3.0 },
    uWind: { value: 0.5 }
  },
  vertexShader: `
    uniform float uTime;
    uniform float uHeight;
    uniform float uRange;
    uniform float uSpeed;
    uniform float uWind;
    
    attribute float aSpeed;
    attribute float aRandom;
    attribute float aSize;
    attribute vec3 aVelocity; // Intrinsic drift velocity
    
    varying float vAlpha;
    varying float vRandom;

    void main() {
      vec3 pos = position;
      
      // 1. Vertical Fall with Wrapping
      float fallOffset = uTime * uSpeed * aSpeed;
      float y = pos.y - fallOffset;
      // Modulo arithmetic to wrap y within [-uHeight/2, uHeight/2]
      y = mod(y + uHeight/2.0, uHeight) - uHeight/2.0;
      pos.y = y;
      
      // 2. Horizontal Movement (Wind + Turbulence)
      float t = uTime * 0.5;
      
      // Macro Wind (Large sweeping movement)
      float swayX = sin(y * 0.1 + t) * 1.5;
      float swayZ = cos(y * 0.15 + t * 0.8) * 1.5;
      
      // Micro Turbulence (Fluttering)
      float flutterX = sin(t * 3.0 + aRandom * 100.0) * 0.3;
      float flutterZ = cos(t * 2.5 + aRandom * 50.0) * 0.3;
      
      // Apply drift
      // We add aVelocity * time to create constant drift, then wrap it
      float driftX = (aVelocity.x * uTime * 0.5) + swayX * uWind + flutterX;
      float driftZ = (aVelocity.z * uTime * 0.5) + swayZ * uWind + flutterZ;
      
      pos.x += driftX;
      pos.z += driftZ;
      
      // Infinite Wrapping for X and Z to keep density constant
      pos.x = mod(pos.x + uRange/2.0, uRange) - uRange/2.0;
      pos.z = mod(pos.z + uRange/2.0, uRange) - uRange/2.0;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      
      // Size attenuation (Perspective)
      gl_PointSize = aSize * (250.0 / -mvPosition.z);
      
      gl_Position = projectionMatrix * mvPosition;
      
      // 3. Fading Logic
      // Fade top/bottom edges slightly
      float edgeFade = 1.0 - smoothstep(0.4, 0.5, abs(y / uHeight));
      
      // Fade distant particles
      float distFade = 1.0 - smoothstep(20.0, 70.0, -mvPosition.z);
      
      vAlpha = edgeFade * distFade;
      vRandom = aRandom;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uTime;
    varying float vAlpha;
    varying float vRandom;

    void main() {
      // Circular soft particle
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      
      if (dist > 0.5) discard;
      
      // Gradient glow from center
      float strength = 1.0 - (dist * 2.0);
      strength = pow(strength, 1.8); // Slightly tighter glow
      
      // "Twinkle" effect simulates tumbling
      // Flake brightness pulses slowly based on time and random offset
      float twinkle = 0.7 + 0.3 * sin(uTime * 4.0 + vRandom * 50.0);

      gl_FragColor = vec4(uColor, strength * vAlpha * twinkle);
    }
  `
};

export const Snow: React.FC = () => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  const { positions, speeds, randoms, sizes, velocities } = useMemo(() => {
    const count = 2500; // Increased density
    const range = 50; // Increased spread
    
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const rnd = new Float32Array(count);
    const sz = new Float32Array(count);
    const vel = new Float32Array(count * 3); // Drift velocity
    
    for (let i = 0; i < count; i++) {
      // Random initial positions
      pos[i * 3] = (Math.random() - 0.5) * range;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60; 
      pos[i * 3 + 2] = (Math.random() - 0.5) * range;
      
      // Physical properties
      spd[i] = 0.5 + Math.random() * 0.8; // Varied fall speed
      rnd[i] = Math.random();
      sz[i] = Math.random() * 2.5 + 1.5; // Slightly varied sizes
      
      // Intrinsic wind drift (some move left, some right naturally)
      vel[i * 3] = (Math.random() - 0.5) * 2.0;
      vel[i * 3 + 1] = 0;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 2.0;
    }

    return { positions: pos, speeds: spd, randoms: rnd, sizes: sz, velocities: vel };
  }, []);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
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
          attach="attributes-aSpeed"
          count={speeds.length}
          array={speeds}
          itemSize={1}
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
        <bufferAttribute
          attach="attributes-aVelocity"
          count={velocities.length / 3}
          array={velocities}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        args={[SnowShaderMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
