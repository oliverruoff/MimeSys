import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { HomeRenderer } from './home.js';

class ShowcaseApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.sceneManager = new SceneManager(this.container);
        this.homeRenderer = new HomeRenderer(this.sceneManager.scene);

        // Setup simple orbiting camera
        this.angle = 0;
        this.radius = 30;
        this.height = 20;

        this.init();
    }

    async init() {
        console.log("Init Showcase...");
        try {
            const homes = await fetch('/api/homes').then(r => r.json());
            if (homes.length > 0) {
                const home = await fetch(`/api/homes/${homes[0].id}`).then(r => r.json());
                this.home = home;
                this.homeRenderer.render(home);

                // Start with just ground floor (Level 0)
                this.currentMaxFloor = 0;
                this.floorDirection = 1; // 1 for up, -1 for down
                this.lastFloorSwitch = performance.now();

                // Force visibility update immediately
                this.homeRenderer.setVisibleFloorLimit(this.currentMaxFloor);

                // Hide Gizmos
                if (this.homeRenderer.setGizmoVisibility) {
                    this.homeRenderer.setGizmoVisibility(false);
                }

                // Start Polling for Light Updates
                this.pollUpdates();
            }
        } catch (e) {
            console.error("Error loading home:", e);
        }

        this.animate();
    }

    async pollUpdates() {
        setInterval(async () => {
            if (!this.home) return;
            try {
                // Fetch latest home state
                // Note: In a production app, we might want a lightweight 'status' endpoint
                // but for now re-fetching the home JSON is fine for this scale.
                const updatedHome = await fetch(`/api/homes/${this.home.id}`).then(r => r.json());

                if (updatedHome && updatedHome.id) {
                    // Update lights
                    this.homeRenderer.updateLights(updatedHome);

                    // Update local ref
                    this.home = updatedHome;
                }
            } catch (err) {
                console.warn("Poll failed", err);
            }
        }, 1000); // Poll every 1 second
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Floor Cycling Logic
        if (this.home && this.home.floors && this.home.floors.length > 0) {
            const now = performance.now();
            if (now - this.lastFloorSwitch > 5000) {
                // Update floor level
                this.currentMaxFloor += this.floorDirection;

                // Ping-pong logic
                if (this.currentMaxFloor >= this.home.floors.length) {
                    this.currentMaxFloor = this.home.floors.length - 2; // Step back down
                    if (this.currentMaxFloor < 0) this.currentMaxFloor = 0; // Safety for single floor
                    this.floorDirection = -1;
                } else if (this.currentMaxFloor < 0) {
                    this.currentMaxFloor = 1; // Step back up
                    if (this.currentMaxFloor >= this.home.floors.length) this.currentMaxFloor = 0; // Safety
                    this.floorDirection = 1;
                }

                // Apply visibility
                this.homeRenderer.setVisibleFloorLimit(this.currentMaxFloor);
                this.lastFloorSwitch = now;
            }
        }

        // Orbit Logic
        this.angle += 0.002; // Slow rotation
        const x = Math.sin(this.angle) * this.radius;
        const z = Math.cos(this.angle) * this.radius;

        this.sceneManager.camera.position.set(x, this.height, z);
        this.sceneManager.camera.lookAt(0, 0, 0);

        // Smart Walls Update
        if (this.homeRenderer.updateSmartWalls) {
            this.homeRenderer.updateSmartWalls(this.sceneManager.camera, new THREE.Vector3(0, 0, 0));
        }

        this.sceneManager.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
    }
}

new ShowcaseApp();
