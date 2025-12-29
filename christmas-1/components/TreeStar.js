import * as THREE from 'three';

export class TreeStar {
    constructor() {
        this.mesh = this.createMesh();
    }

    createMesh() {
        const starGeo = new THREE.OctahedronGeometry(1);
        const starMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const mesh = new THREE.Mesh(starGeo, starMat);
        mesh.position.y = 12.5;
        return mesh;
    }
}
