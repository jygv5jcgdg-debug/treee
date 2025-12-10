import React, { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { PhotoItem, TreeState, CONSTANTS } from '../types';

interface PhotoFramesProps {
  photos: PhotoItem[];
  treeState: TreeState;
  photoScale: number; // New prop for pinch zoom
}

const FrameMesh: React.FC<{ photo: PhotoItem; treeState: TreeState; globalScale: number }> = ({ photo, treeState, globalScale }) => {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useLoader(THREE.TextureLoader, photo.url);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    const isTree = treeState === TreeState.TREE_SHAPE;
    
    // Check if currently zooming (Pinch active)
    const isZooming = globalScale > 2.0;

    // --- SCALE LOGIC ---
    const currentScale = groupRef.current.scale.x; 
    const nextScale = THREE.MathUtils.lerp(currentScale, globalScale, 0.1);
    groupRef.current.scale.setScalar(nextScale);
    
    // --- POSITION & ROTATION LOGIC ---
    
    if (isZooming && groupRef.current.parent) {
        // PRESENTATION MODE (Fixed to Camera/Screen)
        // We want the object to be at World Position (0, 4, 25) 
        // and have World Rotation Identity (0,0,0) (facing Z)
        
        const parent = groupRef.current.parent;
        const offset = parseInt(photo.id.slice(-3)) % 10;
        
        // 1. Calculate Target World Position
        const targetWorldPos = new THREE.Vector3(0, 4, 25 + offset * 0.05);
        
        // 2. Convert World Position to Local Position relative to parent
        // LocalPos = ParentWorldMatrixInverse * WorldPos
        const invParentMatrix = parent.matrixWorld.clone().invert();
        const targetLocalPos = targetWorldPos.applyMatrix4(invParentMatrix);
        
        // Lerp to this compensated local position
        // We use a high lerp factor here because the targetLocalPos changes every frame 
        // as the parent rotates. If we lag too much, it will wobble.
        groupRef.current.position.lerp(targetLocalPos, 0.2);

        // 3. Rotation Compensation
        // We want World Quaternion to be Identity (0,0,0,1)
        // LocalQuat = ParentWorldQuatInverse * TargetWorldQuat
        // Since TargetWorldQuat is Identity, LocalQuat = ParentWorldQuatInverse
        const parentQuat = new THREE.Quaternion();
        parent.getWorldQuaternion(parentQuat);
        const targetLocalQuat = parentQuat.invert();
        
        groupRef.current.quaternion.slerp(targetLocalQuat, 0.2);

    } else {
        // STANDARD MODE (Attached to Tree/Scatter)
        const targetPos = isTree ? photo.treePos : photo.scatterPos;
        groupRef.current.position.lerp(targetPos, isTree ? 0.08 : 0.02);

        if (isTree) {
            // Majestic rotation: Face center then sway
            const lookTarget = new THREE.Vector3(0, photo.treePos.y, 0);
            const dummy = new THREE.Object3D();
            dummy.position.copy(groupRef.current.position);
            dummy.lookAt(lookTarget);
            
            groupRef.current.quaternion.slerp(dummy.quaternion, 0.1);
            groupRef.current.position.y += Math.sin(time * 2 + parseInt(photo.id)) * 0.002;
        } else {
            // Chaotic tumble
            groupRef.current.rotation.x += photo.rotationSpeed * 0.01;
            groupRef.current.rotation.y += photo.rotationSpeed * 0.02;
            groupRef.current.rotation.z += photo.rotationSpeed * 0.005;
        }
    }
  });

  // Reduced dimensions to match ornament size (~0.7 units)
  const width = 0.7;
  const height = width / photo.aspectRatio;
  const frameThickness = 0.03;
  const borderSize = 0.05;

  return (
    <group ref={groupRef}>
       {/* Gold Frame Container */}
       <mesh castShadow receiveShadow position={[0, 0, -0.01]}>
          <boxGeometry args={[width + borderSize * 2, height + borderSize * 2, frameThickness]} />
          <meshStandardMaterial color="#FFD700" metalness={1.0} roughness={0.2} envMapIntensity={2} />
       </mesh>

       {/* Photo Plane */}
       <mesh position={[0, 0, frameThickness / 2 + 0.001]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
       </mesh>
       
       {/* Backing */}
       <mesh position={[0, 0, 0]}>
          <boxGeometry args={[width + borderSize, height + borderSize, frameThickness]} />
          <meshStandardMaterial color="#FFFDD0" roughness={0.8} />
       </mesh>
    </group>
  );
};

export const PhotoFrames: React.FC<PhotoFramesProps> = ({ photos, treeState, photoScale }) => {
  return (
    <group>
      {photos.map((photo) => (
        <FrameMesh key={photo.id} photo={photo} treeState={treeState} globalScale={photoScale} />
      ))}
    </group>
  );
};