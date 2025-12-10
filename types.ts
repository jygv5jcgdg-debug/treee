import * as THREE from 'three';

export enum TreeState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE',
}

export interface OrnamentData {
  id: number;
  type: 'box' | 'sphere' | 'star' | 'icicle' | 'candyCane' | 'bell' | 'snowflake';
  scatterPos: THREE.Vector3;
  treePos: THREE.Vector3;
  color: THREE.Color;
  secondaryColor?: THREE.Color; // Added for ribbons/details
  weight: number; // 0.1 (light) to 1.0 (heavy)
  scale: number;
  rotationSpeed: number;
}

export interface PhotoItem {
  id: string;
  url: string;
  scatterPos: THREE.Vector3;
  treePos: THREE.Vector3;
  rotationSpeed: number;
  aspectRatio: number;
}

export const COLORS = {
  EMERALD_DEEP: new THREE.Color('#002419'),
  EMERALD_LIGHT: new THREE.Color('#0F5238'),
  GOLD_METALLIC: new THREE.Color('#FFD700'),
  GOLD_ROSE: new THREE.Color('#E6BE8A'),
  WHITE_WARM: new THREE.Color('#FFFDD0'),
  RED_RUBY: new THREE.Color('#8A0303'),
  ICE_BLUE: new THREE.Color('#E0F7FA'),
};

export const CONSTANTS = {
  FOLIAGE_COUNT: 24000,
  ORNAMENT_COUNT: 600,
  TREE_HEIGHT: 18,
  TREE_RADIUS: 6.5,
  SCATTER_RADIUS: 35,
};