import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONSTANTS, TreeState, OrnamentData, COLORS } from '../types';

const tempObject = new THREE.Object3D();

// --- Precompute Static Geometries ---

// 1. Candy Cane Geometry
const candyCanePath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, -0.6, 0),
  new THREE.Vector3(0, 0.4, 0),    
  new THREE.Vector3(0.1, 0.6, 0),  
  new THREE.Vector3(0.35, 0.45, 0) 
]);
const candyCaneGeometry = new THREE.TubeGeometry(candyCanePath, 24, 0.05, 8, false);

// Generate Striped Texture for Candy Cane
const createStripeTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFFFF'; // White Base
    ctx.fillRect(0, 0, 64, 64);
    
    ctx.fillStyle = '#C41E3A'; // Christmas Red
    // Draw diagonal stripes
    ctx.lineWidth = 20; 
    ctx.lineCap = 'butt';
    
    // Draw multiple lines to ensure coverage
    for (let i = -64; i < 128; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 64, 64);
        ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  // Repeat along the tube length (U) to create spiral effect
  tex.repeat.set(8, 1); 
  return tex;
};
const candyCaneTexture = createStripeTexture();

// 2. Icicle Geometry
const icicleGeometry = new THREE.CylinderGeometry(0.12, 0.0, 1.5, 6);
icicleGeometry.translate(0, -0.4, 0); 

// 3. Bell Geometry (Lathe)
const bellPoints = [];
// Top handle/hook area
bellPoints.push(new THREE.Vector2(0, 0.5));
bellPoints.push(new THREE.Vector2(0.08, 0.45));
// Main body curve
bellPoints.push(new THREE.Vector2(0.12, 0.3)); 
bellPoints.push(new THREE.Vector2(0.25, -0.2)); 
// Rim flare
bellPoints.push(new THREE.Vector2(0.4, -0.4));
bellPoints.push(new THREE.Vector2(0.42, -0.45));
const bellGeometry = new THREE.LatheGeometry(bellPoints, 16);
bellGeometry.translate(0, 0.1, 0); // Center slightly

// 4. Ribbon Geometry (Merged boxes manually)
// Quick merge helper since we don't have BufferGeometryUtils imported
const merge = (geoms: THREE.BufferGeometry[]) => {
    let posCount = 0;
    let normCount = 0;
    let uvCount = 0;
    let indexCount = 0;

    geoms.forEach(g => {
        posCount += g.attributes.position.array.length;
        normCount += g.attributes.normal.array.length;
        uvCount += g.attributes.uv.array.length;
        if(g.index) indexCount += g.index.array.length;
    });

    const posArray = new Float32Array(posCount);
    const normArray = new Float32Array(normCount);
    const uvArray = new Float32Array(uvCount);
    const indexArray = new Uint16Array(indexCount);

    let pOffset = 0;
    let nOffset = 0;
    let uOffset = 0;
    let iOffset = 0;
    let vOffset = 0;

    geoms.forEach(g => {
        posArray.set(g.attributes.position.array, pOffset);
        normArray.set(g.attributes.normal.array, nOffset);
        uvArray.set(g.attributes.uv.array, uOffset);
        
        if (g.index) {
            for(let i=0; i<g.index.array.length; i++) {
                indexArray[iOffset + i] = g.index.array[i] + vOffset;
            }
            iOffset += g.index.array.length;
        }
        
        pOffset += g.attributes.position.array.length;
        nOffset += g.attributes.normal.array.length;
        uOffset += g.attributes.uv.array.length;
        vOffset += g.attributes.position.count;
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(normArray, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
    if(indexCount > 0) geom.setIndex(new THREE.BufferAttribute(indexArray, 1));
    
    return geom;
};

const createRibbonGeometry = () => {
  const band1 = new THREE.BoxGeometry(1.02, 1.02, 0.15);
  const band2 = new THREE.BoxGeometry(0.15, 1.02, 1.02);
  const knot = new THREE.BoxGeometry(0.35, 0.1, 0.35);
  knot.translate(0, 0.51, 0);
  return merge([band1, band2, knot]);
};
const ribbonGeometry = createRibbonGeometry();

// 5. Snowflake Geometry (Detailed Crystal)
const createSnowflakeGeometry = () => {
    const geometries: THREE.BufferGeometry[] = [];
    
    // We will build 6 arms to form the hexagonal crystal structure
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3; // 60 degrees
        
        // 1. Main Shaft (The spine of the arm)
        const shaft = new THREE.BoxGeometry(0.04, 0.5, 0.02);
        shaft.translate(0, 0.25, 0); // Pivot at center
        shaft.rotateZ(angle);
        geometries.push(shaft);
        
        // 2. Inner Branch (Chevron)
        const branchInnerL = new THREE.BoxGeometry(0.03, 0.15, 0.02);
        branchInnerL.translate(0, 0.075, 0); // Pivot base
        branchInnerL.rotateZ(0.785); // 45 deg
        branchInnerL.translate(0, 0.15, 0); // Move up shaft
        branchInnerL.rotateZ(angle); // Rotate with arm
        geometries.push(branchInnerL);

        const branchInnerR = new THREE.BoxGeometry(0.03, 0.15, 0.02);
        branchInnerR.translate(0, 0.075, 0);
        branchInnerR.rotateZ(-0.785); // -45 deg
        branchInnerR.translate(0, 0.15, 0);
        branchInnerR.rotateZ(angle);
        geometries.push(branchInnerR);

        // 3. Outer Branch (Chevron) - Slightly smaller
        const branchOuterL = new THREE.BoxGeometry(0.025, 0.12, 0.02);
        branchOuterL.translate(0, 0.06, 0);
        branchOuterL.rotateZ(0.785); 
        branchOuterL.translate(0, 0.32, 0); 
        branchOuterL.rotateZ(angle);
        geometries.push(branchOuterL);

        const branchOuterR = new THREE.BoxGeometry(0.025, 0.12, 0.02);
        branchOuterR.translate(0, 0.06, 0);
        branchOuterR.rotateZ(-0.785); 
        branchOuterR.translate(0, 0.32, 0); 
        branchOuterR.rotateZ(angle);
        geometries.push(branchOuterR);
    }
    
    // Center Hexagon Cap
    const center = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 6);
    center.rotateX(Math.PI / 2);
    geometries.push(center);

    return merge(geometries);
};
const snowflakeGeometry = createSnowflakeGeometry();


interface OrnamentsProps {
  treeState: TreeState;
}

export const Ornaments: React.FC<OrnamentsProps> = ({ treeState }) => {
  const sphereMeshRef = useRef<THREE.InstancedMesh>(null);
  const boxMeshRef = useRef<THREE.InstancedMesh>(null);
  const boxRibbonMeshRef = useRef<THREE.InstancedMesh>(null); // Ribbon Layer
  const icicleMeshRef = useRef<THREE.InstancedMesh>(null);
  const candyCaneMeshRef = useRef<THREE.InstancedMesh>(null);
  const bellMeshRef = useRef<THREE.InstancedMesh>(null);
  const snowflakeMeshRef = useRef<THREE.InstancedMesh>(null);
  
  // Separate data arrays for each type
  const { spheres, boxes, icicles, candyCanes, bells, snowflakes } = useMemo(() => {
    const sData: OrnamentData[] = [];
    const bData: OrnamentData[] = [];
    const iData: OrnamentData[] = [];
    const cData: OrnamentData[] = [];
    const bellData: OrnamentData[] = [];
    const snowData: OrnamentData[] = [];
    
    // Collision checking helper
    const placedItems: { pos: THREE.Vector3, radius: number }[] = [];
    
    const isColliding = (pos: THREE.Vector3, radius: number) => {
        for (let other of placedItems) {
            const dist = pos.distanceTo(other.pos);
            // Allow small overlap (0.85) for "nestled" look, but avoid hard clipping
            if (dist < (radius + other.radius) * 0.85) {
                return true;
            }
        }
        return false;
    };

    // Helper to create an item
    const createItem = (id: number, overrideY?: number): OrnamentData | null => {
       let attempts = 0;
       const maxAttempts = 50;
       
       while (attempts < maxAttempts) {
          attempts++;
          
          // 1. Determine Type first to get Scale (which is needed for collision radius)
          const typeRand = Math.random();
          let type: 'box' | 'sphere' | 'icicle' | 'candyCane' | 'bell' | 'snowflake' = 'sphere';
          
          if (typeRand < 0.30) type = 'sphere';
          else if (typeRand < 0.50) type = 'box';
          else if (typeRand < 0.65) type = 'icicle';
          else if (typeRand < 0.80) type = 'candyCane';
          else type = 'snowflake'; 

          // Override logic for fillers
          if (overrideY !== undefined) type = 'bell';

          // Properties based on type
          let weight = 0.04;
          let scale = 1.0;
          let color = COLORS.GOLD_METALLIC;
          let secondaryColor: THREE.Color | undefined;
          let collisionRadius = 0.5;

          if (type === 'box') {
            weight = 0.02; // Heavy
            scale = Math.random() * 0.4 + 0.5; // 0.5 to 0.9
            collisionRadius = scale * 0.7; // Box diagonal approx
            const cRand = Math.random();
            if (cRand < 0.4) {
                 color = COLORS.RED_RUBY;
                 secondaryColor = COLORS.GOLD_METALLIC;
            } else if (cRand < 0.7) {
                 color = COLORS.EMERALD_DEEP;
                 secondaryColor = COLORS.GOLD_METALLIC;
            } else {
                 color = COLORS.GOLD_METALLIC;
                 secondaryColor = COLORS.RED_RUBY;
            }
          } 
          else if (type === 'sphere') {
            weight = 0.05; // Light
            scale = Math.random() * 0.4 + 0.3;
            collisionRadius = scale;
            const cRand = Math.random();
            if (cRand < 0.4) color = COLORS.GOLD_METALLIC;
            else if (cRand < 0.7) color = COLORS.GOLD_ROSE;
            else if (cRand < 0.9) color = COLORS.WHITE_WARM;
            else color = COLORS.RED_RUBY;

            if (color === COLORS.GOLD_METALLIC && Math.random() < 0.4) {
              type = 'bell';
            }
          }
          else if (type === 'icicle') {
            weight = 0.04; 
            scale = Math.random() * 0.5 + 0.6; 
            collisionRadius = 0.2; // Thin
            color = COLORS.ICE_BLUE;
          }
          else if (type === 'candyCane') {
            weight = 0.04;
            scale = Math.random() * 0.4 + 0.6;
            collisionRadius = 0.3;
            color = new THREE.Color('#FFFFFF'); 
          }
          else if (type === 'snowflake') {
            weight = 0.03; 
            scale = Math.random() * 0.4 + 0.5;
            collisionRadius = scale * 0.6; // Flat
            color = COLORS.ICE_BLUE;
          }

          if (type === 'bell') {
            weight = 0.03;
            scale = Math.random() * 0.4 + 0.5;
            collisionRadius = scale * 0.6;
            color = COLORS.GOLD_METALLIC;
          }

          // 2. Tree placement calculation
          let y, normalizedY, coneRadiusAtY;
          if (overrideY !== undefined) {
             y = overrideY;
          } else {
             y = (Math.random() * CONSTANTS.TREE_HEIGHT) - (CONSTANTS.TREE_HEIGHT / 2);
          }
          normalizedY = (y + (CONSTANTS.TREE_HEIGHT / 2)) / CONSTANTS.TREE_HEIGHT;
          coneRadiusAtY = CONSTANTS.TREE_RADIUS * (1.0 - normalizedY);
          
          // Angle
          const angle = Math.random() * Math.PI * 2;
          
          // Radius Distribution
          // Refined: Place ornaments between 90% and 115% of cone radius.
          // This keeps them "on" the tree surface, not floating too far or sunk too deep.
          const rBias = 0.9 + Math.random() * 0.25; 
          const r = coneRadiusAtY * rBias; 

          const tx = Math.cos(angle) * r;
          const tz = Math.sin(angle) * r;
          const treePos = new THREE.Vector3(tx, y, tz);

          // 3. Collision Check
          if (!isColliding(treePos, collisionRadius)) {
              // Valid position found!
              placedItems.push({ pos: treePos, radius: collisionRadius });
              
              // Scatter placement
              const sx = (Math.random() - 0.5) * CONSTANTS.SCATTER_RADIUS * 1.5;
              const sy = (Math.random() - 0.5) * CONSTANTS.SCATTER_RADIUS * 1.5;
              const sz = (Math.random() - 0.5) * CONSTANTS.SCATTER_RADIUS * 1.5;

              return {
                id,
                type,
                scatterPos: new THREE.Vector3(sx, sy, sz),
                treePos,
                color,
                secondaryColor,
                weight,
                scale,
                rotationSpeed: Math.random() * 2
              };
          }
          // If collision, loop continues to retry
       }
       // If retries exhausted, return null (skip this ornament)
       return null;
    };

    // Main Generation Loop
    let idCounter = 0;
    // Attempt to fill count, but collision might skip some
    const targetCount = CONSTANTS.ORNAMENT_COUNT; 
    let placedCount = 0;
    
    // We try slightly more times than count to compensate for skips
    for (let i = 0; i < targetCount * 1.5 && placedCount < targetCount; i++) {
      const item = createItem(idCounter++);
      if (item) {
          placedCount++;
          if (item.type === 'box') bData.push(item);
          else if (item.type === 'sphere') sData.push(item);
          else if (item.type === 'icicle') iData.push(item);
          else if (item.type === 'candyCane') cData.push(item);
          else if (item.type === 'bell') bellData.push(item);
          else if (item.type === 'snowflake') snowData.push(item);
      }
    }

    // Bottom Filler Loop (Fill the bottom gap with bells)
    // Bottom range: -9 to -5 roughly
    const extraCount = 120;
    let extraPlaced = 0;
    for (let i = 0; i < extraCount * 1.5 && extraPlaced < extraCount; i++) {
        const bottomY = (Math.random() * 4.0) - (CONSTANTS.TREE_HEIGHT / 2); // -9 to -5
        const item = createItem(idCounter++, bottomY);
        if (item) {
            extraPlaced++;
            // Force type properties for filler specifically if they weren't set correctly by random
            item.type = 'bell'; 
            item.scale = 0.7; // Larger bells at bottom
            item.color = Math.random() > 0.5 ? COLORS.GOLD_METALLIC : COLORS.GOLD_ROSE;
            bellData.push(item);
        }
    }

    return { spheres: sData, boxes: bData, icicles: iData, candyCanes: cData, bells: bellData, snowflakes: snowData };
  }, []);

  // Persistent position storage
  const spherePosRef = useRef(new Float32Array(spheres.length * 3));
  const boxPosRef = useRef(new Float32Array(boxes.length * 3));
  const iciclePosRef = useRef(new Float32Array(icicles.length * 3));
  const candyPosRef = useRef(new Float32Array(candyCanes.length * 3));
  const bellPosRef = useRef(new Float32Array(bells.length * 3));
  const snowflakePosRef = useRef(new Float32Array(snowflakes.length * 3));
  
  const initialized = useRef(false);

  // Initialize scatter positions
  useLayoutEffect(() => {
    if (!initialized.current) {
      const initPositions = (items: OrnamentData[], arr: Float32Array) => {
        items.forEach((d, i) => {
          arr[i * 3] = d.scatterPos.x;
          arr[i * 3 + 1] = d.scatterPos.y;
          arr[i * 3 + 2] = d.scatterPos.z;
        });
      };
      initPositions(spheres, spherePosRef.current);
      initPositions(boxes, boxPosRef.current);
      initPositions(icicles, iciclePosRef.current);
      initPositions(candyCanes, candyPosRef.current);
      initPositions(bells, bellPosRef.current);
      initPositions(snowflakes, snowflakePosRef.current);
      initialized.current = true;
    }

    // Update Colors
    if (sphereMeshRef.current) spheres.forEach((d, i) => sphereMeshRef.current!.setColorAt(i, d.color));
    
    // Update Boxes & Ribbons Colors
    if (boxMeshRef.current) boxes.forEach((d, i) => boxMeshRef.current!.setColorAt(i, d.color));
    if (boxRibbonMeshRef.current) boxes.forEach((d, i) => {
        // Use secondary color if available, else standard gold
        boxRibbonMeshRef.current!.setColorAt(i, d.secondaryColor || COLORS.GOLD_METALLIC);
    });

    if (icicleMeshRef.current) icicles.forEach((d, i) => icicleMeshRef.current!.setColorAt(i, d.color));
    if (candyCaneMeshRef.current) candyCanes.forEach((d, i) => candyCaneMeshRef.current!.setColorAt(i, d.color));
    if (bellMeshRef.current) bells.forEach((d, i) => bellMeshRef.current!.setColorAt(i, d.color));
    if (snowflakeMeshRef.current) snowflakes.forEach((d, i) => snowflakeMeshRef.current!.setColorAt(i, d.color));
    
    [sphereMeshRef, boxMeshRef, boxRibbonMeshRef, icicleMeshRef, candyCaneMeshRef, bellMeshRef, snowflakeMeshRef].forEach(ref => {
      if(ref.current) ref.current.instanceMatrix.needsUpdate = true;
    });

  }, [spheres, boxes, icicles, candyCanes, bells, snowflakes]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const isTree = treeState === TreeState.TREE_SHAPE;

    const updateMesh = (
      mesh: THREE.InstancedMesh | null,
      items: OrnamentData[],
      posArr: Float32Array,
      rotationMode: 'none' | 'vertical' | 'flat' | 'spinZ', 
      secondaryMesh?: THREE.InstancedMesh | null 
    ) => {
      if (!mesh) return;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const target = isTree ? item.treePos : item.scatterPos;
        const idx = i * 3;
        
        // Lerp Position
        const speed = isTree ? item.weight : item.weight * 2.5; 
        
        posArr[idx] = THREE.MathUtils.lerp(posArr[idx], target.x, speed);
        posArr[idx+1] = THREE.MathUtils.lerp(posArr[idx+1], target.y, speed);
        posArr[idx+2] = THREE.MathUtils.lerp(posArr[idx+2], target.z, speed);
        
        tempObject.position.set(posArr[idx], posArr[idx+1], posArr[idx+2]);
        tempObject.scale.setScalar(item.scale);

        // Rotation Logic
        if (isTree) {
            // Tree Mode Rotations
            if (rotationMode === 'vertical') {
                // Hang vertically, slight sway
                tempObject.rotation.set(0, time * 0.5 + item.id, 0); 
                tempObject.rotation.z = Math.sin(time * 2 + item.id) * 0.1;
                if (item.type === 'bell') tempObject.rotation.x = Math.sin(time * 3 + item.id) * 0.1;
            } else if (rotationMode === 'spinZ') {
                // Snowflakes spin flat against the tree? Or just spin?
                // Face outwards and spin
                tempObject.lookAt(0, item.treePos.y, 0); // Look at center
                tempObject.rotateY(Math.PI); // Face out
                tempObject.rotateZ(time + item.id); // Spin
            } else {
                // Spheres/Boxes
                tempObject.rotation.set(0, time * 0.5 + item.id, 0); 
            }
        } else {
          // Scattered: Full chaotic rotation
          tempObject.rotation.x = time * item.rotationSpeed * 0.5;
          tempObject.rotation.y = time * item.rotationSpeed;
          tempObject.rotation.z = time * 0.2;
        }

        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);
        
        if (secondaryMesh) {
            // Apply Bow Tie Animation (Ribbon)
            // Gentle tightening/loosening = slight scale pulse from 1.0 to 1.03
            const pulse = 1.0 + 0.015 * (1.0 + Math.sin(time * 2.5 + item.id));
            
            tempObject.scale.setScalar(item.scale * pulse);
            tempObject.updateMatrix();
            secondaryMesh.setMatrixAt(i, tempObject.matrix);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (secondaryMesh) secondaryMesh.instanceMatrix.needsUpdate = true;
    };

    updateMesh(sphereMeshRef.current, spheres, spherePosRef.current, 'none');
    updateMesh(boxMeshRef.current, boxes, boxPosRef.current, 'none', boxRibbonMeshRef.current);
    updateMesh(icicleMeshRef.current, icicles, iciclePosRef.current, 'vertical');
    updateMesh(candyCaneMeshRef.current, candyCanes, candyPosRef.current, 'vertical');
    updateMesh(bellMeshRef.current, bells, bellPosRef.current, 'vertical');
    updateMesh(snowflakeMeshRef.current, snowflakes, snowflakePosRef.current, 'spinZ');
  });

  return (
    <>
      {/* Spheres */}
      <instancedMesh ref={sphereMeshRef} args={[undefined, undefined, spheres.length]} castShadow receiveShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.9} envMapIntensity={2.5} />
      </instancedMesh>

      {/* Gift Boxes Body */}
      <instancedMesh ref={boxMeshRef} args={[undefined, undefined, boxes.length]} castShadow receiveShadow>
        <boxGeometry args={[1.0, 1.0, 1.0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.3} envMapIntensity={1.0} />
      </instancedMesh>

      {/* Gift Boxes Ribbon (Overlay) */}
      <instancedMesh ref={boxRibbonMeshRef} args={[ribbonGeometry, undefined, boxes.length]} castShadow>
         <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.8} envMapIntensity={2.0} />
      </instancedMesh>

      {/* Icicles */}
      <instancedMesh ref={icicleMeshRef} args={[icicleGeometry, undefined, icicles.length]} castShadow receiveShadow>
        <meshStandardMaterial 
            color="#E0F7FA" 
            roughness={0.1} 
            metalness={0.8} 
            envMapIntensity={3.0}
            emissive="#AEEEEE"
            emissiveIntensity={0.2} 
        />
      </instancedMesh>

      {/* Candy Canes - Now with Striped Texture */}
      <instancedMesh ref={candyCaneMeshRef} args={[candyCaneGeometry, undefined, candyCanes.length]} castShadow receiveShadow>
        <meshStandardMaterial 
            map={candyCaneTexture}
            color="#FFFFFF" 
            roughness={0.2} 
            metalness={0.3} 
            envMapIntensity={1.5} 
        />
      </instancedMesh>

      {/* Bells - Metallic Gold */}
      <instancedMesh ref={bellMeshRef} args={[bellGeometry, undefined, bells.length]} castShadow receiveShadow>
         <meshStandardMaterial 
            color="#FFD700" 
            roughness={0.15} 
            metalness={1.0} 
            envMapIntensity={2.5} 
        />
      </instancedMesh>
      
      {/* Snowflakes - Glowing White */}
      <instancedMesh ref={snowflakeMeshRef} args={[snowflakeGeometry, undefined, snowflakes.length]} castShadow receiveShadow>
         <meshStandardMaterial 
            color="#E0F7FA" 
            emissive="#FFFFFF"
            emissiveIntensity={0.8}
            roughness={0.1} 
            metalness={0.9} 
            envMapIntensity={2.0} 
        />
      </instancedMesh>
    </>
  );
};