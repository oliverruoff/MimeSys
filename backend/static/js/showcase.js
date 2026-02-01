import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { HomeRenderer } from './home.js';

class ShowcaseApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.sceneManager = new SceneManager(this.container, false); // No Grid
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

                // Track applied background color
                this.currentBackgroundColor = null;

                // Apply background color from home data
                if (home.background_color) {
                    this.sceneManager.setBackgroundColor(home.background_color);
                    this.currentBackgroundColor = home.background_color;
                }

                // Calculate house center and bounds
                this.calculateHouseCenter(home);

                // Adjust camera distance based on house size and viewport aspect ratio
                this.adjustCameraForViewport();

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

                // Listen for window resize
                window.addEventListener('resize', () => this.adjustCameraForViewport());
            }
        } catch (e) {
            console.error("Error loading home:", e);
        }

        this.animate();
    }

    calculateHouseCenter(home) {
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        let maxLevel = 0;

        home.floors.forEach(floor => {
            if (floor.shape && floor.shape.length > 2) {
                floor.shape.forEach(point => {
                    minX = Math.min(minX, point.x);
                    maxX = Math.max(maxX, point.x);
                    minZ = Math.min(minZ, point.z);
                    maxZ = Math.max(maxZ, point.z);
                });
            }
            maxLevel = Math.max(maxLevel, floor.level);
        });

        // Calculate center and size
        this.houseCenter = {
            x: (minX + maxX) / 2,
            y: (maxLevel * 2.5) / 2, // Vertical center based on floors
            z: (minZ + maxZ) / 2
        };

        this.houseSize = {
            width: maxX - minX,
            depth: maxZ - minZ,
            height: maxLevel * 2.5
        };

        // Calculate diagonal size for camera distance
        this.houseDiagonal = Math.sqrt(
            this.houseSize.width * this.houseSize.width +
            this.houseSize.depth * this.houseSize.depth +
            this.houseSize.height * this.houseSize.height
        );
    }

    adjustCameraForViewport() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        
        // Base radius on house size
        let baseRadius = Math.max(this.houseDiagonal * 1.2, 30);

        // For portrait mode (aspect < 1), increase radius to fit house
        if (aspect < 1) {
            baseRadius *= (1 / aspect) * 0.8; // Scale up for portrait
        }

        this.radius = baseRadius;
        this.height = this.houseCenter.y + this.houseDiagonal * 0.6; // Height relative to house center

        // Update camera aspect ratio
        this.sceneManager.onResize();
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

                    // Check and update background color if changed
                    if (updatedHome.background_color && updatedHome.background_color !== this.currentBackgroundColor) {
                        this.sceneManager.setBackgroundColor(updatedHome.background_color);
                        this.currentBackgroundColor = updatedHome.background_color;
                    }

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
        const x = this.houseCenter.x + Math.sin(this.angle) * this.radius;
        const z = this.houseCenter.z + Math.cos(this.angle) * this.radius;

        this.sceneManager.camera.position.set(x, this.height, z);
        this.sceneManager.camera.lookAt(this.houseCenter.x, this.houseCenter.y, this.houseCenter.z);

        // Smart Walls Update
        if (this.homeRenderer.updateSmartWalls) {
            this.homeRenderer.updateSmartWalls(
                this.sceneManager.camera, 
                new THREE.Vector3(this.houseCenter.x, this.houseCenter.y, this.houseCenter.z)
            );
        }

        // Floor Transitions Update
        if (this.homeRenderer.animateFloorTransitions) {
            this.homeRenderer.animateFloorTransitions();
        }

        this.sceneManager.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
    }
}

new ShowcaseApp();
