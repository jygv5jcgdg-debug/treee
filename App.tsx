import React, { useState } from 'react';
import { Scene } from './components/Scene';
import { UI } from './components/UI';
import { GestureController } from './components/GestureController';
import { TreeState, PhotoItem, CONSTANTS } from './types';
import * as THREE from 'three';

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.SCATTERED);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photoScale, setPhotoScale] = useState<number>(1.0); // State for pinch zoom
  const [rotationMod, setRotationMod] = useState<number>(0); // State for hand-controlled rotation
  const [isCameraEnabled, setIsCameraEnabled] = useState<boolean>(false); // State for camera permission

  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      
      const img = new Image();
      img.onload = () => {
          const aspectRatio = img.width / img.height;
          
          const newPhoto: PhotoItem = {
            id: Date.now().toString(),
            url: url,
            scatterPos: new THREE.Vector3(
                (Math.random() - 0.5) * CONSTANTS.SCATTER_RADIUS,
                (Math.random() - 0.5) * CONSTANTS.SCATTER_RADIUS,
                (Math.random() - 0.5) * CONSTANTS.SCATTER_RADIUS
            ),
            treePos: calculateTreePos(photos.length),
            rotationSpeed: Math.random() * 2 + 1,
            aspectRatio: aspectRatio
          };
          
          setPhotos(prev => [...prev, newPhoto]);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const calculateTreePos = (index: number): THREE.Vector3 => {
     const h = CONSTANTS.TREE_HEIGHT;
     const y = (Math.random() * (h - 4)) - (h / 2 - 2); 
     const normalizedY = (y + (h / 2)) / h;
     const rBase = CONSTANTS.TREE_RADIUS * (1.0 - normalizedY);
     const r = rBase * 1.25; 
     const theta = Math.random() * Math.PI * 2;
     
     return new THREE.Vector3(
        Math.cos(theta) * r,
        y,
        Math.sin(theta) * r
     );
  };

  return (
    <div className="w-full h-screen relative bg-black">
      <Scene 
        treeState={treeState} 
        photos={photos} 
        photoScale={photoScale} 
        rotationMod={rotationMod} 
      />
      <UI 
        treeState={treeState} 
        setTreeState={setTreeState} 
        onPhotoUpload={handlePhotoUpload} 
        isCameraEnabled={isCameraEnabled}
        toggleCamera={() => setIsCameraEnabled(prev => !prev)}
        photoScale={photoScale}
        setPhotoScale={setPhotoScale}
      />
      
      {/* Gesture Controller - Only active if enabled by user */}
      {isCameraEnabled && (
        <GestureController 
          setTreeState={setTreeState} 
          setPhotoScale={setPhotoScale} 
          setRotationMod={setRotationMod}
        />
      )}
    </div>
  );
};

export default App;