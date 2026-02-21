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

        // Config from URL
        this.config = {
            revolve: true,
            floor: 'auto',
            angle: 0
        };
        this.lastHref = window.location.href;
        this.updateConfigFromURL();

        this.eventSource = null;
        this.sseConnected = false;
        this.reconnectTimer = null;
        this.reconnectDelayMs = 1000;
        this.maxReconnectDelayMs = 30000;
        this.lastAppliedVersion = 0;
        this.fallbackPollIntervalMs = 60000;
        this.fallbackPollTimer = null;

        // Listen for URL changes
        window.addEventListener('popstate', () => this.updateConfigFromURL());
        window.addEventListener('beforeunload', () => this.cleanupSync());

        this.init();
    }

    updateConfigFromURL() {
        const params = new URLSearchParams(window.location.search);
        
        // revolve=true|false (case-insensitive)
        const revolveParam = params.get('revolve');
        if (revolveParam !== null) {
            this.config.revolve = revolveParam.toLowerCase() !== 'false';
        } else {
            this.config.revolve = true;
        }

        // floor=auto|<int>
        const floorParam = params.get('floor');
        if (floorParam === null || floorParam.toLowerCase() === 'auto') {
            this.config.floor = 'auto';
        } else {
            const floorInt = parseInt(floorParam);
            if (isNaN(floorInt) || floorInt < 0) {
                this.config.floor = 0;
            } else {
                this.config.floor = floorInt;
            }
        }

        // angle=<number> (degrees)
        const angleParam = params.get('angle');
        let angleDeg = 0;
        if (angleParam !== null) {
            angleDeg = parseFloat(angleParam);
            if (isNaN(angleDeg)) angleDeg = 0;
        }
        // Normalize degrees to 0-359 and convert to radians
        this.config.angle = (((angleDeg % 360) + 360) % 360) * (Math.PI / 180);

        // If not revolving, set current angle to the one from URL
        if (!this.config.revolve) {
            this.angle = this.config.angle;
        }

        // Apply immediately if home is loaded
        if (this.home && this.config.floor !== 'auto') {
            // "If floor is invalid or out of range... fallback to floor 0"
            let targetFloor = this.config.floor;
            if (this.maxLevel !== undefined && targetFloor > this.maxLevel) {
                targetFloor = 0;
            }
            this.currentMaxFloor = targetFloor;
            this.homeRenderer.setVisibleFloorLimit(this.currentMaxFloor);
        }
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

                // Start with requested floor or default to 0
                if (this.config.floor === 'auto') {
                    this.currentMaxFloor = 0;
                } else {
                    this.currentMaxFloor = this.config.floor;
                    if (this.currentMaxFloor > this.maxLevel) this.currentMaxFloor = 0;
                }

                this.floorDirection = 1; // 1 for up, -1 for down
                this.lastFloorSwitch = performance.now();

                // Force visibility update immediately
                this.homeRenderer.setVisibleFloorLimit(this.currentMaxFloor);

                // Hide Gizmos
                if (this.homeRenderer.setGizmoVisibility) {
                    this.homeRenderer.setGizmoVisibility(false);
                }

                // Start stream-based sync with low-frequency fallback polling
                this.startSync();

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

        this.maxLevel = maxLevel; // Store for range checking

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

    startSync() {
        this.startEventStream();
        this.startFallbackPolling();
    }

    cleanupSync() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.fallbackPollTimer) {
            clearInterval(this.fallbackPollTimer);
            this.fallbackPollTimer = null;
        }
    }

    startEventStream() {
        if (!this.home || !this.home.id) return;

        if (this.eventSource) {
            this.eventSource.close();
        }

        const streamUrl = `/api/homes/${this.home.id}/stream?since=${this.lastAppliedVersion}`;
        const eventSource = new EventSource(streamUrl);
        this.eventSource = eventSource;

        eventSource.addEventListener('open', () => {
            this.sseConnected = true;
            this.reconnectDelayMs = 1000;
        });

        eventSource.addEventListener('hello', (event) => {
            try {
                const data = JSON.parse(event.data);
                if (typeof data.version === 'number') {
                    this.lastAppliedVersion = Math.max(this.lastAppliedVersion, data.version);
                }
            } catch (err) {
                console.warn('Failed to parse hello event', err);
            }
        });

        eventSource.addEventListener('lights_changed', (event) => {
            try {
                const data = JSON.parse(event.data);
                this.applyLightDelta(data);
            } catch (err) {
                console.warn('Failed to parse lights_changed event', err);
            }
        });

        eventSource.addEventListener('background_changed', (event) => {
            try {
                const data = JSON.parse(event.data);
                this.applyBackgroundDelta(data);
            } catch (err) {
                console.warn('Failed to parse background_changed event', err);
            }
        });

        eventSource.addEventListener('resync_required', async (event) => {
            try {
                const data = JSON.parse(event.data);
                if (typeof data.current_version === 'number') {
                    this.lastAppliedVersion = Math.max(this.lastAppliedVersion, data.current_version);
                }
            } catch (err) {
                console.warn('Failed to parse resync_required event', err);
            }
            await this.performFullResync();
        });

        eventSource.addEventListener('ping', () => {
            // Heartbeat; no-op
        });

        eventSource.onerror = () => {
            this.sseConnected = false;
            if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
            }

            if (!this.reconnectTimer) {
                const delay = this.reconnectDelayMs;
                this.reconnectTimer = setTimeout(() => {
                    this.reconnectTimer = null;
                    this.startEventStream();
                }, delay);
                this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, this.maxReconnectDelayMs);
            }
        };
    }

    startFallbackPolling() {
        if (this.fallbackPollTimer) return;
        this.fallbackPollTimer = setInterval(async () => {
            if (!this.home || !this.home.id) return;
            if (this.sseConnected) return;
            await this.performFullResync();
        }, this.fallbackPollIntervalMs);
    }

    async performFullResync() {
        if (!this.home || !this.home.id) return;

        try {
            const updatedHome = await fetch(`/api/homes/${this.home.id}`).then(r => r.json());
            if (!updatedHome || !updatedHome.id) return;

            this.homeRenderer.updateLights(updatedHome);

            if (updatedHome.background_color && updatedHome.background_color !== this.currentBackgroundColor) {
                this.sceneManager.setBackgroundColor(updatedHome.background_color);
                this.currentBackgroundColor = updatedHome.background_color;
            }

            this.home = updatedHome;
        } catch (err) {
            console.warn('Full resync failed', err);
        }
    }

    applyLightDelta(eventData) {
        if (!eventData || !Array.isArray(eventData.lights)) return;

        eventData.lights.forEach(lightData => {
            if (!lightData || !lightData.id || !lightData.state) return;
            this.homeRenderer.updateLightById(lightData.id, lightData.state);
            this.updateLocalLightState(lightData.id, lightData.state);
        });

        if (typeof eventData.version === 'number') {
            this.lastAppliedVersion = Math.max(this.lastAppliedVersion, eventData.version);
        }
    }

    applyBackgroundDelta(eventData) {
        if (!eventData) return;
        if (eventData.background_color && eventData.background_color !== this.currentBackgroundColor) {
            this.sceneManager.setBackgroundColor(eventData.background_color);
            this.currentBackgroundColor = eventData.background_color;
            if (this.home) {
                this.home.background_color = eventData.background_color;
            }
        }

        if (typeof eventData.version === 'number') {
            this.lastAppliedVersion = Math.max(this.lastAppliedVersion, eventData.version);
        }
    }

    updateLocalLightState(lightId, state) {
        if (!this.home || !this.home.floors) return;
        for (const floor of this.home.floors) {
            if (!floor.lights) continue;
            const target = floor.lights.find(light => light.id === lightId);
            if (target) {
                target.state = state;
                return;
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Check for URL changes (handles pushState)
        if (this.lastHref !== window.location.href) {
            this.updateConfigFromURL();
            this.lastHref = window.location.href;
        }

        // Floor Cycling Logic
        if (this.home && this.home.floors && this.home.floors.length > 0) {
            if (this.config.floor === 'auto') {
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
        }

        // Orbit Logic
        if (this.config.revolve) {
            this.angle += 0.002; // Slow rotation
        }
        const x = this.houseCenter.x + Math.sin(this.angle) * this.radius;
        const z = this.houseCenter.z + Math.cos(this.angle) * this.radius;

        this.sceneManager.camera.position.set(x, this.height, z);
        this.sceneManager.camera.lookAt(this.houseCenter.x, this.houseCenter.y, this.houseCenter.z);


        // Floor Transitions Update
        if (this.homeRenderer.animateFloorTransitions) {
            this.homeRenderer.animateFloorTransitions();
        }

        // Smart Walls Update (only highest currently shown floor)
        if (this.homeRenderer.updateSmartWalls) {
            const highestShownFloor = this.homeRenderer.getHighestVisibleFloorLevel
                ? this.homeRenderer.getHighestVisibleFloorLevel()
                : this.currentMaxFloor;

            this.homeRenderer.updateSmartWalls(
                this.sceneManager.camera,
                new THREE.Vector3(this.houseCenter.x, this.houseCenter.y, this.houseCenter.z),
                highestShownFloor
            );
        }

        this.sceneManager.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
    }
}

new ShowcaseApp();
