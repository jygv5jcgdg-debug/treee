import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState, CONSTANTS } from '../types';

interface TopStarProps {
  treeState: TreeState;
}

export const TopStar: React.FC<TopStarProps> = ({ treeState }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const { scatterPos, treePos, shape } = useMemo(() => {
    // 1. Define 5-Pointed Star Shape
    const outerRadius = 1.2;
    const innerRadius = 0.5;
    const numPoints = 5;
    
    const starShape = new THREE.Shape();
    
    for (let i = 0; i < numPoints * 2; i++) {
      const angle = (i / (numPoints * 2)) * Math.PI * 2;
      // Rotate -PI/2 to align the first point upwards (12 o'clock)
      // Actually, standard math starts at 3 o'clock. 
      // cos(a + PI/2) rotates it to start at 12.
      const r = (i % 2 === 0) ? outerRadius : innerRadius;
      const x = Math.cos(angle + Math.PI / 2) * r;
      const y = Math.sin(angle + Math.PI / 2) * r;
      
      if (i === 0) starShape.moveTo(x, y);
      else starShape.lineTo(x, y);
    }
    starShape.closePath();

    // 2. Positions
    // Tree Top: slightly above y=9 (since height is 18, centered at 0 means -9 to 9)
    // Increased offset to 2.5 to ensure it floats majestically above the foliage without clipping
    const tPos = new THREE.Vector3(0, (CONSTANTS.TREE_HEIGHT / 2) + 2.5, 0);
    
    // Scatter: High above and slightly forward to avoid clipping foliage
    const sPos = new THREE.Vector3(
      (Math.random() - 0.5) * 30, // Wider horizontal spread
      25 + Math.random() * 8,     // Higher scatter start (25 to 33)
      12 + Math.random() * 8      // Push forward towards camera so it's visible
    );

    return { scatterPos: sPos, treePos: tPos, shape: starShape };
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    const isTree = treeState === TreeState.TREE_SHAPE;
    
    // Lerp Position
    const target = isTree ? treePos : scatterPos;
    // Smooth lerp: Tree mode snaps tighter, scatter mode drifts
    meshRef.current.position.lerp(target, isTree ? 0.05 : 0.015);
    
    if (isTree) {
        // Majestic Spin in Tree Mode
        // Reset X/Z rotation to face forward/upright roughly, then spin Y
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, Math.sin(time * 0.5) * 0.1, 0.05);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, 0.05);
        meshRef.current.rotation.y += 0.01;
    } else {
        // Chaotic Tumble in Scatter Mode
        meshRef.current.rotation.x += 0.005;
        meshRef.current.rotation.y += 0.005;
        meshRef.current.rotation.z += 0.002;
    }
    
    // Gentle floating bob (always active for life)
    meshRef.current.position.y += Math.sin(time * 2.0) * 0.005;
  });

  const extrudeSettings = {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 3,
  };

  return (
    <mesh ref={meshRef} castShadow>
      <extrudeGeometry args={[shape, extrudeSettings]} />
      {/* 
        Light Gold Material with strong Emissive property to trigger Bloom.
        Color: #FDE68A (Light Gold/Creamy)
        Emissive: #FFD700 (Gold)
      */}
      <meshStandardMaterial 
        color="#FDE68A" 
        emissive="#FFD700"
        emissiveIntensity={3.0}
        roughness={0.1}
        metalness={1.0}
        envMapIntensity={2.0}
      />
    </mesh>
  );
};