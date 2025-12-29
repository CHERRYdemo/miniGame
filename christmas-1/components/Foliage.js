import * as THREE from 'three';

// --- SHADERS (Directly from Foliage.tsx) ---
const vertexShader = `
  uniform float uTime;
  uniform float uProgress;
  
  attribute vec3 aChaosPos;
  attribute vec3 aTargetPos;
  attribute float aRandom;
  
  varying vec3 vColor;
  varying float vAlpha;

  // Cubic Ease In Out
  float cubicInOut(float t) {
    return t < 0.5
      ? 4.0 * t * t * t
      : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    float localProgress = clamp(uProgress * 1.2 - aRandom * 0.2, 0.0, 1.0);
    float easedProgress = cubicInOut(localProgress);

    vec3 newPos = mix(aChaosPos, aTargetPos, easedProgress);
    
    if (easedProgress > 0.9) {
      newPos.x += sin(uTime * 2.0 + newPos.y) * 0.05;
      newPos.z += cos(uTime * 1.5 + newPos.y) * 0.05;
    }

    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    gl_PointSize = (4.0 * aRandom + 2.0) * (20.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    vec3 goldColor = vec3(1.0, 0.84, 0.0);
    vec3 emeraldColor = vec3(0.0, 0.4, 0.1);
    vec3 brightGreen = vec3(0.1, 0.8, 0.2);
    
    float sparkle = sin(uTime * 5.0 + aRandom * 100.0);
    vec3 finalGreen = mix(emeraldColor, brightGreen, aRandom * 0.3);
    
    vColor = mix(goldColor, finalGreen, easedProgress);
    
    if (sparkle > 0.9) {
      vColor += vec3(0.5);
    }

    vAlpha = 1.0;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;

    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 1.5);

    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

export class Foliage {
    constructor(count = 12000) {
        this.count = count;
        this.mesh = this.createMesh();
    }

    createMesh() {
        const geometry = new THREE.BufferGeometry();
        
        const chaosPositions = new Float32Array(this.count * 3);
        const targetPositions = new Float32Array(this.count * 3);
        const randoms = new Float32Array(this.count);
        
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const height = 12;
        const maxRadius = 5;

        for (let i = 0; i < this.count; i++) {
            // Chaos
            const r = 25 * Math.cbrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);
            
            chaosPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            chaosPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 5;
            chaosPositions[i * 3 + 2] = r * Math.cos(phi);

            // Target
            const yNorm = i / this.count;
            const y = yNorm * height;
            const currentRadius = maxRadius * (1 - yNorm);
            const angle = 2 * Math.PI * goldenRatio * i;

            targetPositions[i * 3] = Math.cos(angle) * currentRadius;
            targetPositions[i * 3 + 1] = y;
            targetPositions[i * 3 + 2] = Math.sin(angle) * currentRadius;

            randoms[i] = Math.random();
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(chaosPositions, 3));
        geometry.setAttribute('aChaosPos', new THREE.BufferAttribute(chaosPositions, 3));
        geometry.setAttribute('aTargetPos', new THREE.BufferAttribute(targetPositions, 3));
        geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

        const material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uProgress: { value: 0 }
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        return new THREE.Points(geometry, material);
    }

    update(time, progress) {
        if (this.mesh.material.uniforms) {
            this.mesh.material.uniforms.uTime.value = time;
            this.mesh.material.uniforms.uProgress.value = progress;
        }
    }
}
