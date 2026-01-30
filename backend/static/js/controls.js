import * as THREE from 'three';

export class Controls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.interactables = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.enabled = true;

        // Simple Orbit-like controls implementation since we don't have OrbitControls interactable
        this.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.domElement.addEventListener('mouseup', () => this.isDragging = false);
        this.domElement.addEventListener('wheel', (e) => this.onWheel(e));
        this.domElement.addEventListener('click', (e) => this.onClick(e));

        // Keyboard controls
        window.addEventListener('keydown', (e) => this.onKeyDown(e));

        // Keyboard states
        this.keys = {
            Space: false,
            Control: false
        };

        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Orbit params
        this.radius = 20;
        this.theta = Math.PI / 4;
        this.phi = Math.PI / 3;
        this.target = new THREE.Vector3(5, 0, 5); // Center of demo room roughly

        this.updateCamera();
    }

    setInteractables(list) {
        this.interactables = list;
    }

    onKeyDown(e) {
        if (!this.enabled) return;

        // Track keys
        if (e.code === 'Space') this.keys.Space = true;
        if (e.key === 'Control') this.keys.Control = true;

        const speed = 0.5;

        // Fix 2: Use actual Camera direction independent of theta/phi variables
        // This ensures movement is always relative to what the user sees
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, this.camera.up).normalize();

        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.target.addScaledVector(forward, speed);
                this.updateCamera();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.target.addScaledVector(forward, -speed);
                this.updateCamera();
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.target.addScaledVector(right, -speed);
                this.updateCamera();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.target.addScaledVector(right, speed);
                this.updateCamera();
                break;
        }
    }

    onKeyUp(e) {
        if (e.code === 'Space') this.keys.Space = false;
        if (e.key === 'Control') this.keys.Control = false;
    }

    update() {
        if (!this.enabled) return;

        const speed = 0.2; // Per frame speed
        let changed = false;

        if (this.keys.Space) {
            this.target.y += speed;
            changed = true;
        }
        if (this.keys.Control) {
            this.target.y -= speed;
            changed = true;
        }

        if (changed) {
            // Clamp height if needed, but user probably wants freedom
            this.target.y = Math.max(0, this.target.y); // Keep above ground?
            this.updateCamera();
        }
    }

    updateCamera() {
        // Spherical to Cartesian
        this.camera.position.x = this.target.x + this.radius * Math.sin(this.phi) * Math.cos(this.theta);
        this.camera.position.y = this.target.y + this.radius * Math.cos(this.phi);
        this.camera.position.z = this.target.z + this.radius * Math.sin(this.phi) * Math.sin(this.theta);
        this.camera.lookAt(this.target);
    }

    onMouseDown(e) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.offsetX, y: e.offsetY };
    }

    onMouseMove(e) {
        if (!this.isDragging) return;

        const deltaMove = {
            x: e.offsetX - this.previousMousePosition.x,
            y: e.offsetY - this.previousMousePosition.y
        };

        this.theta -= deltaMove.x * 0.01;
        this.phi -= deltaMove.y * 0.01;

        // Clamp phi
        this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi));

        this.previousMousePosition = { x: e.offsetX, y: e.offsetY };
        this.updateCamera();
    }

    onWheel(e) {
        this.radius += e.deltaY * 0.05;
        this.radius = Math.max(2, Math.min(50, this.radius));
        this.updateCamera();
    }

    async onClick(e) {
        // Raycasting
        // Normalized device coordinates
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactables);

        if (intersects.length > 0) {
            const obj = intersects[0].object;
            if (obj.userData.type === 'light') {
                await this.toggleLight(obj.userData);
            }
        }
    }

    async toggleLight(data) {
        const { homeId, id, state } = data;
        const newState = { ...state, on: !state.on };

        try {
            await fetch(`/api/homes/${homeId}/lights/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newState)
            });
            // Reload page or re-fetch (simplest for now)
            // Ideally we emit an event to App to re-fetch
            window.location.reload();
        } catch (err) {
            console.error("Failed to toggle light", err);
        }
    }

    zoomIn() {
        this.radius = Math.max(2, this.radius - 2);
        this.updateCamera();
    }

    zoomOut() {
        this.radius = Math.min(50, this.radius + 2);
        this.updateCamera();
    }
}
