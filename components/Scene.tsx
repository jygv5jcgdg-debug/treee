import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { Snow } from './Snow';
import { TopStar } from './TopStar';
import { PhotoFrames } from './PhotoFrames';
import { TreeState, PhotoItem } from '../types';

interface SceneProps {
  treeState: TreeState;
  photos: PhotoItem[];
  photoScale: number;
  rotationMod: number; // Added
}

const TreeGroup: React.FC<{ 
  treeState: TreeState; 
  photos: PhotoItem[]; 
  photoScale: number; 
  rotationMod: number; 
}> = ({ treeState, photos, photoScale, rotationMod }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Logic update: 
      // If SCATTERED: No automatic rotation (baseSpeed = 0), only rotationMod.
      // If TREE_SHAPE: Automatic rotation (0.15) + rotationMod.
      const baseSpeed = treeState === TreeState.SCATTERED ? 0 : 0.15;
      
      groupRef.current.rotation.y += delta * (baseSpeed + rotationMod);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <Foliage treeState={treeState} />
      <Ornaments treeState={treeState} />
      <TopStar treeState={treeState} />
      <PhotoFrames photos={photos} treeState={treeState} photoScale={photoScale} />
    </group>
  );
};

export const Scene: React.FC<SceneProps> = ({ treeState, photos, photoScale, rotationMod }) => {
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: false }}>
      <PerspectiveCamera makeDefault position={[0, 4, 35]} fov={45} />
      
      <OrbitControls 
        enablePan={false} 
        minDistance={15} 
        maxDistance={50} 
        autoRotate={false} 
        dampingFactor={0.05}
      />

      {/* Ambient Light shifted to cool blue to match Blue Hour background */}
      <ambientLight intensity={0.4} color="#0B1026" />
      
      <spotLight 
        position={[10, 30, 10]} 
        angle={0.3} 
        penumbra={1} 
        intensity={200} 
        color="#fffdd0" 
        castShadow 
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />
      <pointLight position={[-15, 10, -15]} intensity={60} color="#E6BE8A" />

      <Environment preset="city" />

      <Suspense fallback={null}>
        <TreeGroup 
            treeState={treeState} 
            photos={photos} 
            photoScale={photoScale} 
            rotationMod={rotationMod} 
        />
        <Snow />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </Suspense>

      <EffectComposer enableNormalPass={false}>
        <Bloom 
            luminanceThreshold={0.4}
            mipmapBlur 
            intensity={2.8} 
            radius={0.8} 
        />
        <Noise opacity={0.02} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>

      {/* Blue Hour Background */}
      <color attach="background" args={['#0B1026']} />
    </Canvas>
  );
};