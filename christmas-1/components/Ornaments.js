import * as THREE from 'three';

export class Ornaments {
    constructor(count = 600) {
        this.count = count;
        this.ballsData = [];
        this.giftsData = [];
        this.lightsData = [];
        this.dummy = new THREE.Object3D();
        
        this.initData();
        this.group = this.createMeshes();
    }

    initData() {
        const height = 11;
        const maxRadius = 4.5;
        const gold = new THREE.Color("#D4AF37");
        const red = new THREE.Color("#8B0000");
        const whiteGold = new THREE.Color("#F5E6BF");
        const palette = [gold, red, gold, whiteGold];

        for (let i = 0; i < this.count; i++) {
            const rnd = Math.random();
            let type = 'ball';
            if (rnd > 0.8) type = 'gift';
            if (rnd > 0.9) type = 'light';

            // Target
            const yNorm = Math.pow(Math.random(), 2.5);
            const y = yNorm * height + 0.5;
            const rScale = (1 - yNorm);
            const theta = y * 10 + Math.random() * Math.PI * 2;
            const r = maxRadius * rScale + (Math.random() * 0.5);
            const targetPos = new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));

            // Chaos
            const cR = 15 + Math.random() * 15;
            const cTheta = Math.random() * Math.PI * 2;
            const cPhi = Math.acos(2 * Math.random() - 1);
            const chaosPos = new THREE.Vector3(
                cR * Math.sin(cPhi) * Math.cos(cTheta),
                cR * Math.sin(cPhi) * Math.sin(cTheta) + 5,
                cR * Math.cos(cPhi)
            );

            const scale = type === 'light' ? 0.15 : (0.2 + Math.random() * 0.25);
            const color = type === 'light' ? new THREE.Color("#FFFFAA") : palette[Math.floor(Math.random() * palette.length)];

            const data = {
                chaosPos, targetPos, type, color, scale,
                speed: 0.5 + Math.random() * 1.5,
                rotationOffset: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0)
            };

            if (type === 'ball') this.ballsData.push(data);
            else if (type === 'gift') this.giftsData.push(data);
            else this.lightsData.push(data);
        }
    }

    createMeshes() {
        // Materials - Adjusted for visibility without HDRI
        // Reduced metalness so they respond to lights, increased roughness
        const ballMat = new THREE.MeshStandardMaterial({ 
            roughness: 0.3, metalness: 0.6, envMapIntensity: 1.0 
        });
        const giftMat = new THREE.MeshStandardMaterial({ 
            roughness: 0.5, metalness: 0.3, color: 0xffffff 
        });
        const lightMat = new THREE.MeshStandardMaterial({ 
            emissive: 0xffffff, emissiveIntensity: 3, toneMapped: false, color: 0xffffff 
        });

        this.ballsMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 32, 32), ballMat, this.ballsData.length);
        this.giftsMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), giftMat, this.giftsData.length);
        this.lightsMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 8), lightMat, this.lightsData.length);

        const setColor = (mesh, data) => {
            for (let i = 0; i < data.length; i++) {
                mesh.setColorAt(i, data[i].color);
            }
            mesh.instanceColor.needsUpdate = true;
        };

        setColor(this.ballsMesh, this.ballsData);
        setColor(this.giftsMesh, this.giftsData);
        setColor(this.lightsMesh, this.lightsData);

        const group = new THREE.Group();
        group.add(this.ballsMesh, this.giftsMesh, this.lightsMesh);
        return group;
    }

    update(delta, time, isFormed) {
        const updateMesh = (mesh, data) => {
            let needsUpdate = false;
            for (let i = 0; i < data.length; i++) {
                const d = data[i];
                const dest = isFormed ? d.targetPos : d.chaosPos;
                
                mesh.getMatrixAt(i, this.dummy.matrix);
                this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);

                const step = delta * d.speed;
                this.dummy.position.lerp(dest, step);

                if (isFormed && this.dummy.position.distanceTo(d.targetPos) < 0.5) {
                    this.dummy.position.y += Math.sin(time * 2 + d.chaosPos.x) * 0.002;
                }

                if (d.type === 'gift') {
                    this.dummy.rotation.x += delta * 0.5;
                    this.dummy.rotation.y += delta * 0.2;
                } else {
                    this.dummy.lookAt(0, this.dummy.position.y, 0);
                }

                this.dummy.scale.setScalar(d.scale);
                if (d.type === 'light') {
                    const pulse = 1 + Math.sin(time * 5 + d.chaosPos.y) * 0.3;
                    this.dummy.scale.multiplyScalar(pulse);
                }

                this.dummy.updateMatrix();
                mesh.setMatrixAt(i, this.dummy.matrix);
                needsUpdate = true;
            }
            if (needsUpdate) mesh.instanceMatrix.needsUpdate = true;
        };

        updateMesh(this.ballsMesh, this.ballsData);
        updateMesh(this.giftsMesh, this.giftsData);
        updateMesh(this.lightsMesh, this.lightsData);
    }
}
