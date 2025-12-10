import React, { useRef } from 'react';
import { TreeState } from '../types';

interface UIProps {
  treeState: TreeState;
  setTreeState: (state: TreeState) => void;
  onPhotoUpload: (file: File) => void;
  isCameraEnabled: boolean;
  toggleCamera: () => void;
  photoScale: number;
  setPhotoScale: (scale: number) => void;
}

export const UI: React.FC<UIProps> = ({ 
  treeState, 
  setTreeState, 
  onPhotoUpload, 
  isCameraEnabled, 
  toggleCamera,
  photoScale,
  setPhotoScale
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onPhotoUpload(e.target.files[0]);
    }
  };

  const toggleZoom = () => {
    setPhotoScale(photoScale > 1.5 ? 1.0 : 10.0);
  };

  const isTree = treeState === TreeState.TREE_SHAPE;

  return (
    <div className="absolute inset-0 pointer-events-none p-8 z-10 overflow-hidden">
      {/* Header - Top Left */}
      <header className="absolute top-8 left-8 flex flex-col items-start z-0">
        <h1 className="text-3xl md:text-4xl font-light tracking-widest text-[#E6BE8A] uppercase font-serif drop-shadow-lg">
          Yang's
        </h1>
        <p className="text-[10px] tracking-[0.3em] text-emerald-100/60 mt-1 uppercase">
          Interactive Christmas Tree
        </p>
      </header>

      {/* Top Right Controls (Camera & Upload) */}
      {/* Moved down on mobile (top-24) to avoid clipping with header text */}
      <div className="absolute top-24 right-6 md:top-8 md:right-8 flex flex-col items-end gap-3 md:gap-4 pointer-events-auto z-20">
        
        {/* Camera Toggle Button */}
        <button
          onClick={toggleCamera}
          className={`
            px-3 py-2 md:px-5 
            text-[9px] md:text-[10px] tracking-[0.1em] md:tracking-[0.2em] font-bold uppercase
            rounded-full border backdrop-blur-md transition-all duration-300
            ${isCameraEnabled 
              ? 'bg-[#002419]/90 border-[#FFD700] text-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.3)]' 
              : 'bg-black/40 border-white/20 text-white/60 hover:text-white hover:border-white/40'}
          `}
        >
          {/* Responsive Text: Short on mobile, Long on desktop */}
          <span className="md:hidden">{isCameraEnabled ? 'NO CAM' : 'CAMERA'}</span>
          <span className="hidden md:inline">{isCameraEnabled ? 'Disable Camera' : 'Enable Camera'}</span>
        </button>

        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="
            px-3 py-2 md:px-5 
            rounded-full 
            bg-[#002419]/80 border border-[#E6BE8A]/30 backdrop-blur-md
            text-[#E6BE8A] text-[9px] md:text-[10px] tracking-[0.1em] md:tracking-[0.2em] font-bold uppercase
            hover:border-[#FFD700] hover:text-[#FFD700] transition-all duration-300
            shadow-[0_0_15px_rgba(0,36,25,0.5)]
          "
        >
          <span className="md:hidden">UPLOAD</span>
          <span className="hidden md:inline">UPLOAD FILES</span>
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange}
        />
      </div>

      {/* Bottom Controls (Interaction Buttons) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 md:gap-8 pointer-events-auto">
        
        {/* 🔔 Scatter Button */}
        <button
          onClick={() => setTreeState(TreeState.SCATTERED)}
          className={`
            group flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full
            border backdrop-blur-md text-xl md:text-2xl transition-all duration-300
            ${!isTree 
               ? 'bg-[#E6BE8A]/20 border-[#FFD700] scale-110 shadow-[0_0_20px_rgba(255,215,0,0.4)]' 
               : 'bg-[#002419]/60 border-[#E6BE8A]/30 text-white/70 hover:scale-105 hover:border-[#FFD700] hover:text-white'}
          `}
          title="Scatter"
        >
          🔔
        </button>

        {/* 🎄 Tree Assemble Button */}
        <button
          onClick={() => setTreeState(TreeState.TREE_SHAPE)}
          className={`
            group flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full
            border backdrop-blur-md text-2xl md:text-3xl transition-all duration-300
            ${isTree 
               ? 'bg-[#E6BE8A]/20 border-[#FFD700] scale-110 shadow-[0_0_20px_rgba(255,215,0,0.4)]' 
               : 'bg-[#002419]/60 border-[#E6BE8A]/30 text-white/70 hover:scale-105 hover:border-[#FFD700] hover:text-white'}
          `}
          title="Assemble Tree"
        >
          🎄
        </button>

        {/* 🔍 Zoom Button */}
        <button
          onClick={toggleZoom}
          className={`
            group flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full
            border backdrop-blur-md text-xl md:text-2xl transition-all duration-300
            ${photoScale > 1.5
               ? 'bg-[#E6BE8A]/20 border-[#FFD700] scale-110 shadow-[0_0_20px_rgba(255,215,0,0.4)]' 
               : 'bg-[#002419]/60 border-[#E6BE8A]/30 text-white/70 hover:scale-105 hover:border-[#FFD700] hover:text-white'}
          `}
          title="Zoom Photos"
        >
          🔍
        </button>

      </div>
    </div>
  );
};