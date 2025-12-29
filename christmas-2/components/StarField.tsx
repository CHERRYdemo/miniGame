import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const StarField: React.FC = () => {
  const meshRef = useRef<THREE.Points>(null);
  
  const particleCount = 2000;
  
  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const siz = new Float32Array(particleCount);
    
    const colorOptions = [
      new THREE.Color('#FFFACD'), // LemonChiffon
      new THREE.Color('#FFD700'), // Gold
      new THREE.Color('#E0FFFF'), // LightCyan
      new THREE.Color('#F0F8FF'), // AliceBlue
    ];

    for (let i = 0; i < particleCount; i++) {
      // Random position in a large sphere around the scene
      const r = 30 + Math.random() * 40; // Distance 30-70
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      
      // Random color
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
      
      // Random size
      siz[i] = Math.random() * 1.5;
    }
    
    return { positions: pos, colors: col, sizes: siz };
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      // Very slow rotation
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default StarField;

