import * as THREE from 'three';

export class SceneManager {
    constructor(container, showGrid = true) {
        this.container = container;
        this.scene = new THREE.Scene();
        // Dark Grey Background
        this.scene.background = new THREE.Color(0x222222);
        this.scene.fog = new THREE.Fog(0x222222, 20, 80);

        this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(15, 15, 15);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Lighting - Very Dark (Night Mode)
        const ambient = new THREE.AmbientLight(0xffffff, 0.05); // Reduced from 0.2
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffffff, 0.1); // Reduced from 0.3
        sun.position.set(20, 40, 20);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.bias = -0.0001;
        this.scene.add(sun);

        const fill = new THREE.DirectionalLight(0xeef2ff, 0.05); // Reduced from 0.1
        fill.position.set(-20, 20, -20);
        this.scene.add(fill);

        // Grid (Subtle)
        if (showGrid) {
            const grid = new THREE.GridHelper(50, 50, 0x666666, 0x444444);
            this.scene.add(grid);
        }

        // Base Plate - Frosted Glass Disk (Restored)
        this.addBasePlate();
    }

    addBasePlate() {
        const geometry = new THREE.CylinderGeometry(15, 15, 0.5, 64);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.2,
            transmission: 0.0,
        });
        const plate = new THREE.Mesh(geometry, material);
        plate.position.y = -0.25;
        plate.receiveShadow = true;
        plate.name = "basePlate"; // Named for centering
        this.scene.add(plate);

        // Rim
        const rimGeo = new THREE.TorusGeometry(15, 0.2, 16, 100);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0;
        rim.name = "basePlateRim";
        this.scene.add(rim);
    }

    onResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
}
