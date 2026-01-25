import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { HomeRenderer } from './home.js';
import { Controls } from './controls.js'; // Re-eanbled
import { Editor } from './editor.js';
import { UI } from './ui.js';

class App {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.statusEl = document.getElementById('status') || document.createElement('div');

        this.sceneManager = new SceneManager(this.container);
        this.homeRenderer = new HomeRenderer(this.sceneManager.scene);
        this.controls = new Controls(this.sceneManager.camera, this.container); // Re-enabled
        this.editor = new Editor(this.sceneManager, this.homeRenderer);
        this.ui = new UI(this);

        this.editor.setNotificationCallback((msg) => {
            if (typeof msg === 'object' && msg.type === 'content_change') {
                this.ui.updateSidebar();
            } else if (this.ui.showNotification) {
                this.ui.showNotification(msg);
            } else {
                console.log("Notify:", msg);
            }
        });

        this.init();
    }

    async init() {
        console.log("Init App...");
        try {
            const homes = await fetch('/api/homes').then(r => r.json());
            if (homes.length > 0) {
                const home = await fetch(`/api/homes/${homes[0].id}`).then(r => r.json());
                this.homeRenderer.render(home);
                this.controls.setInteractables(this.homeRenderer.interactables);
                this.homeRenderer.setVisibleFloorLimit(0);

                // Hide Gizmos by default
                if (this.homeRenderer.setGizmoVisibility) {
                    this.homeRenderer.setGizmoVisibility(false);
                }

                // Update UI to reflect loaded home
                this.editor.currentFloorIndex = 0;
                this.ui.updateSidebar();
                if (this.ui.floorIndicator) this.ui.floorIndicator.textContent = "Floor 0";
            } else {
                console.warn("No homes found");
            }
        } catch (e) {
            console.error("Error loading home:", e);
        }

        this.animate();
        this.setupUI();
    }

    setupUI() {
        window.addEventListener('resize', () => {
            this.sceneManager.onResize();
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.controls) this.controls.update();

        // Smart Wall update
        if (this.ui && this.ui.smartWallsEnabled) {
            this.homeRenderer.updateSmartWalls(this.sceneManager.camera, this.controls.target);
        }

        this.sceneManager.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
    }
}

new App();
