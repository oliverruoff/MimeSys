import * as THREE from 'three';

export class Editor {
    constructor(sceneManager, homeRenderer) {
        this.sceneManager = sceneManager;
        this.homeRenderer = homeRenderer;

        this.enabled = false;
        this.mode = 'none';
        this.currentFloorIndex = 0;
        this.currentFilename = 'default.json';
        this.notificationHandler = null;

        this.notificationHandler = null;
        this.selectedObject = null;

        this.previewObj = null;
        this.startPoint = null;
        this.floorPoints = [];

        // Delete mode hover tracking
        this.hoveredDeleteTarget = null;
        this.hoveredDeleteOriginalMaterial = null;

        // Undo history stack
        this.undoStack = [];

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.gridPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        this.sceneManager.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.sceneManager.renderer.domElement.addEventListener('click', this.onClick.bind(this));
        // Use document for keydown so Escape works without canvas focus
        document.addEventListener('keydown', this.onKeyDown.bind(this));

        this.cursorMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        this.sceneManager.scene.add(this.cursorMesh);
        this.cursorMesh.visible = false;

        // Measurement Label
        this.measurementLabel = document.getElementById('wall-measurement-label') || this.createMeasurementLabelFallback();
    }

    createMeasurementLabelFallback() {
        // Fallback if HTML is not updated yet
        const el = document.createElement('div');
        el.className = 'measurement-label';
        el.id = 'wall-measurement-label'; // Ensure ID
        el.textContent = "Fallback Label";
        document.body.appendChild(el);
        return el;
    }

    setNotificationCallback(fn) {
        this.notificationHandler = fn;
    }

    notify(msg) {
        if (this.notificationHandler) this.notificationHandler(msg);
        else console.log("Notify:", msg);
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        this.cursorMesh.visible = enabled;
        if (!enabled) {
            this.setMode('none');
            this.measurementLabel.style.display = 'none';
        }
    }

    setMode(mode) {
        console.log('setMode called with:', mode); // DEBUG

        // Clear delete hover highlight when changing modes
        this.clearDeleteHover();

        this.mode = mode;
        this.startPoint = null;
        this.floorPoints = [];
        if (this.previewObj) {
            this.sceneManager.scene.remove(this.previewObj);
            this.previewObj = null;
        }
        this.measurementLabel.style.display = 'none';
    }

    getRayIntersection(e) {
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        // Raycast logic dependent on floor height
        const floorHeight = this.currentFloorIndex * 2.5;
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorHeight);
        const target = new THREE.Vector3();

        if (this.raycaster.ray.intersectPlane(plane, target)) {
            target.x = Math.round(target.x * 2) / 2;
            target.z = Math.round(target.z * 2) / 2;
            target.y = floorHeight;
            return target;
        }
        return null;
    }

    onMouseMove(e) {
        // Always update mouse position for raycasting, even if disabled
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (!this.enabled) return;
        const point = this.getRayIntersection(e);
        if (point) {
            this.cursorMesh.position.copy(point);
            this.cursorMesh.visible = true;
            if (this.mode === 'wall' && this.startPoint) {
                console.log('onMouseMove: calling updateWallPreview'); // DEBUG
                // Pass raw mouse coordinates for UI label
                this.updateWallPreview(this.startPoint, point, e.clientX, e.clientY);
            } else if (this.mode === 'floor_poly') {
                this.updateFloorPreview(point);
            }
        }

        // Delete mode hover highlight
        if (this.mode === 'delete') {
            this.updateDeleteHover();
        } else {
            this.clearDeleteHover();
        }
    }

    updateDeleteHover() {
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        const intersects = this.raycaster.intersectObjects(this.homeRenderer.interactables, false);

        if (intersects.length > 0) {
            const target = intersects[0].object;

            // If hovering a new object
            if (target !== this.hoveredDeleteTarget) {
                // Restore previous hover target
                this.clearDeleteHover();

                // Store original material and apply red highlight
                this.hoveredDeleteTarget = target;
                this.hoveredDeleteOriginalMaterial = target.material;
                target.material = new THREE.MeshBasicMaterial({
                    color: 0xff0000,
                    transparent: true,
                    opacity: 0.7
                });
            }
        } else {
            // Not hovering anything deletable
            this.clearDeleteHover();
        }
    }

    clearDeleteHover() {
        if (this.hoveredDeleteTarget && this.hoveredDeleteOriginalMaterial) {
            this.hoveredDeleteTarget.material = this.hoveredDeleteOriginalMaterial;
            this.hoveredDeleteTarget = null;
            this.hoveredDeleteOriginalMaterial = null;
        }
    }

    updateFloorPreview(cursorPoint) {
        if (this.previewObj) this.sceneManager.scene.remove(this.previewObj);
        if (this.floorPoints.length === 0) return;
        const points = [...this.floorPoints, cursorPoint];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x00ffff });
        this.previewObj = new THREE.Line(geometry, material);
        this.sceneManager.scene.add(this.previewObj);
    }

    updateWallPreview(p1, p2, mouseX, mouseY) {
        if (!this.previewObj) {
            const geo = new THREE.BoxGeometry(1, 2.5, 0.2);
            // Ensure green color as requested
            const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
            this.previewObj = new THREE.Mesh(geo, mat);
            this.sceneManager.scene.add(this.previewObj);
        }

        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        const cx = (p1.x + p2.x) / 2;
        const cz = (p1.z + p2.z) / 2;

        this.previewObj.position.set(cx, p1.y + 1.25, cz);
        this.previewObj.rotation.y = -angle;
        this.previewObj.scale.set(len || 0.1, 1, 1);

        // Update Label - Fixed Position at Top Center
        console.log(`Updating Wall Preview: ${len.toFixed(2)}m`); // DEBUG LOG

        // Force display with important priority to override inline style
        this.measurementLabel.textContent = `WALL LENGTH: ${len.toFixed(2)}m`;
        this.measurementLabel.style.setProperty('display', 'block', 'important');

        // Debug: log element state
        console.log('Label element:', this.measurementLabel);
        console.log('Label display style:', this.measurementLabel.style.display);
        console.log('Label computed display:', window.getComputedStyle(this.measurementLabel).display);
    }

    onClick(e) {
        // Setup raycaster
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        const intersects = this.raycaster.intersectObjects(this.homeRenderer.interactables, false);

        // If editor is in an active mode, prevent controls from handling the click
        if (this.enabled && ['light', 'cube', 'wall', 'floor_poly', 'delete'].includes(this.mode)) {
            e.stopPropagation();
        }

        // Handle delete mode FIRST (before selection logic)
        if (this.enabled && this.mode === 'delete') {
            if (intersects.length > 0) {
                const hit = intersects[0].object;
                // Delete the object and clear selection
                this.deleteObject(hit.userData);
                this.selectedObject = null;
                this.clearDeleteHover();
                this.notify({ type: 'content_change' });
            }
            return; // Don't continue with other logic
        }

        // Selection Logic - Works even in View mode (when editor disabled)
        if (intersects.length > 0) {
            const hit = intersects[0].object;
            if (hit.userData.type === 'cube') {
                this.selectedObject = hit;
                this.notify({ type: 'content_change' }); // Trigger sidebar update
                if (!this.enabled) return; // If in View mode, selection is all we do
            }
        } else {
            // Deselect if clicked empty space
            if (this.selectedObject) {
                this.selectedObject = null;
                this.notify({ type: 'content_change' });
            }
            if (!this.enabled) return;
        }

        console.log('onClick: enabled=', this.enabled, 'mode=', this.mode); // DEBUG
        if (!this.enabled) return;

        const point = this.getRayIntersection(e);
        if (!point) return;

        if (this.mode === 'cube') {
            this.addCube(point);
        } else if (this.mode === 'wall') {
            console.log('onClick: wall mode, startPoint=', this.startPoint, 'point=', point); // DEBUG
            if (!this.startPoint) {
                this.startPoint = point;
                console.log('onClick: startPoint SET to', point); // DEBUG
            } else {
                this.addWall(this.startPoint, point);
                this.startPoint = null;
                if (this.previewObj) {
                    this.sceneManager.scene.remove(this.previewObj);
                    this.previewObj = null;
                }
                this.measurementLabel.style.display = 'none';
            }
        } else if (this.mode === 'light') {
            this.addLight(point);
        } else if (this.mode === 'floor_poly') {
            this.floorPoints.push({ x: point.x, y: point.y, z: point.z });
            if (this.floorPoints.length > 2) {
                const first = this.floorPoints[0];
                const dist = Math.sqrt(Math.pow(point.x - first.x, 2) + Math.pow(point.z - first.z, 2));
                if (dist < 0.5) {
                    this.floorPoints.pop();
                    this.finishFloorPoly();
                }
            } else if (this.floorPoints.length == 1) {
                this.notify("Click loop points. Click start to finish.");
            }
        }
    }

    onKeyDown(e) {
        console.log('onKeyDown fired:', e.key, 'enabled:', this.enabled, 'mode:', this.mode); // DEBUG
        if (e.key === 'Escape') {
            console.log("Escape Pressed. Mode:", this.mode, "StartPoint:", this.startPoint);
            if (this.mode === 'wall' && this.startPoint) {
                // Cancel current wall pull but stay in wall mode
                this.startPoint = null;
                if (this.previewObj) {
                    this.sceneManager.scene.remove(this.previewObj);
                    this.previewObj = null;
                }
                this.measurementLabel.style.display = 'none';
                this.notify("Wall ended"); // Changed message
            } else {
                this.setMode('none');
                this.notify("Tool cancelled");
            }
        }
        if (e.key === 'Enter' && this.mode === 'floor_poly') this.finishFloorPoly();
    }

    addWall(p1, p2) {
        if (!this.getCurrentFloor()) return;
        const newWall = {
            p1: { x: p1.x, y: p1.y, z: p1.z },
            p2: { x: p2.x, y: p2.y, z: p2.z },
            height: 2.5, thickness: 0.2, windows: []
        };
        this.getCurrentFloor().walls.push(newWall);

        // Record undo action
        this.undoStack.push({
            type: 'add_wall',
            floorIndex: this.currentFloorIndex,
            wall: newWall
        });

        this.refresh();
        this.autoSave(); // Auto-save after adding wall
    }

    addLight(pos) {
        if (!this.getCurrentFloor()) return;
        const newLight = {
            id: crypto.randomUUID(), // Ensure unique ID
            name: "New Light",
            position: { x: pos.x, y: pos.y + 2.0, z: pos.z },
            state: { on: true, color: "#ffffff", intensity: 1.0 }
        };
        this.getCurrentFloor().lights.push(newLight);

        // Record undo action
        this.undoStack.push({
            type: 'add_light',
            floorIndex: this.currentFloorIndex,
            light: newLight
        });

        this.refresh();
        this.notify({ type: 'content_change' });
        this.autoSave(); // Auto-save after adding light
    }

    addCube(pos) {
        if (!this.getCurrentFloor()) return;
        const newCube = {
            id: crypto.randomUUID(),
            name: "Cube",
            position: { x: pos.x, y: pos.y + 0.5, z: pos.z },
            rotation: 0,
            size: { x: 1, y: 1, z: 1 },
            color: "#808080"
        };

        if (!this.getCurrentFloor().cubes) this.getCurrentFloor().cubes = [];
        this.getCurrentFloor().cubes.push(newCube);

        this.undoStack.push({
            type: 'add_cube',
            floorIndex: this.currentFloorIndex,
            cube: newCube
        });

        this.refresh();
        this.notify({ type: 'content_change' });
        this.autoSave(); // Auto-save after adding cube
    }



    deleteObject(data) {
        const floor = this.getFloorById(data.floorId);
        if (!floor) return;

        if (data.type === 'light') {
            const light = floor.lights.find(l => l.id === data.id);
            if (light) {
                // Record undo action before deleting
                this.undoStack.push({
                    type: 'delete_light',
                    floorId: data.floorId,
                    light: JSON.parse(JSON.stringify(light)) // Deep copy
                });
                floor.lights = floor.lights.filter(l => l.id !== data.id);
            }
        } else if (data.type === 'wall') {
            const idx = floor.walls.indexOf(data.obj);
            if (idx > -1) {
                // Record undo action before deleting
                this.undoStack.push({
                    type: 'delete_wall',
                    floorId: data.floorId,
                    wall: JSON.parse(JSON.stringify(data.obj)), // Deep copy
                    wallIndex: idx
                });
                floor.walls.splice(idx, 1);
            }
        } else if (data.type === 'cube') {
            if (!floor.cubes) return;
            const idx = floor.cubes.indexOf(data.obj);
            if (idx > -1) {
                this.undoStack.push({
                    type: 'delete_cube',
                    floorId: data.floorId,
                    cube: JSON.parse(JSON.stringify(data.obj)),
                    cubeIndex: idx
                });
                floor.cubes.splice(idx, 1);
            }
        }

        // Clear delete hover since target is gone
        this.clearDeleteHover();

        this.refresh();
        this.notify({ type: 'content_change' });
        this.autoSave(); // Auto-save after deleting
    }

    undo() {
        if (this.undoStack.length === 0) {
            this.notify("Nothing to undo");
            return;
        }

        const action = this.undoStack.pop();
        console.log('Undoing action:', action); // DEBUG

        if (action.type === 'add_wall') {
            // Undo adding a wall = remove it
            const floor = this.homeRenderer.currentHome.floors[action.floorIndex];
            if (floor) {
                const idx = floor.walls.indexOf(action.wall);
                if (idx > -1) floor.walls.splice(idx, 1);
            }
        } else if (action.type === 'add_light') {
            // Undo adding a light = remove it
            const floor = this.homeRenderer.currentHome.floors[action.floorIndex];
            if (floor) {
                floor.lights = floor.lights.filter(l => l.id !== action.light.id);
            }
        } else if (action.type === 'delete_wall') {
            // Undo deleting a wall = add it back
            const floor = this.getFloorById(action.floorId);
            if (floor) {
                floor.walls.push(action.wall);
            }
        } else if (action.type === 'delete_light') {
            // Undo deleting a light = add it back
            const floor = this.getFloorById(action.floorId);
            if (floor) {
                floor.lights.push(action.light);
            }
        } else if (action.type === 'add_cube') {
            // Undo adding a cube = remove it
            const floor = this.homeRenderer.currentHome.floors[action.floorIndex];
            if (floor && floor.cubes) {
                floor.cubes = floor.cubes.filter(c => c.id !== action.cube.id);
            }
        } else if (action.type === 'delete_cube') {
            // Undo deleting a cube = add it back
            const floor = this.getFloorById(action.floorId);
            if (floor) {
                if (!floor.cubes) floor.cubes = [];
                floor.cubes.splice(action.cubeIndex, 0, action.cube);
            }
        }

        this.refresh();
        this.notify({ type: 'content_change' });
        this.notify("Undone!");
        this.autoSave(); // Auto-save after undo
    }

    finishFloorPoly() {
        if (!this.getCurrentFloor()) return;
        if (this.floorPoints.length < 3) return;
        this.getCurrentFloor().shape = [...this.floorPoints];
        this.floorPoints = [];
        this.refresh();
        this.notify("Floor shape updated!");
        this.autoSave(); // Auto-save after updating floor shape
    }

    async save() {
        if (!this.homeRenderer.currentHome) return;

        let filename = prompt("Enter filename to save as:", this.currentFilename || 'default.json');

        // User cancelled
        if (filename === null) return;

        // Ensure .json extension
        if (!filename.toLowerCase().endsWith('.json')) {
            filename += '.json';
        }

        this.notify(`Saving to ${filename}...`);
        try {
            await fetch(`/api/saves/${filename}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.homeRenderer.currentHome)
            });
            this.currentFilename = filename;
            this.notify("Saved!");
        } catch (e) {
            console.error(e);
            this.notify("Save failed");
        }
    }

    async autoSave() {
        if (!this.homeRenderer.currentHome) return;
        
        // Use the current filename, or default to 'default.json'
        const filename = this.currentFilename || 'default.json';
        
        try {
            await fetch(`/api/saves/${filename}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.homeRenderer.currentHome)
            });
            console.log(`Auto-saved to ${filename}`);
        } catch (e) {
            console.error('Auto-save failed:', e);
        }
    }

    async loadFromFile(filename) {
        this.notify(`Loading ${filename}...`);
        try {
            const home = await fetch(`/api/saves/${filename}/load`, { method: 'POST' }).then(r => r.json());
            this.currentFilename = filename;
            this.homeRenderer.render(home);
            this.homeRenderer.setVisibleFloorLimit(0, true); // immediate = true for editor
            this.notify(`Loaded ${filename}`);

            // Re-init floor index
            this.currentFloorIndex = 0;
            // Notify UI
            if (this.notificationHandler)
                this.notificationHandler({ type: 'floor_change', level: 0 }); // Reset UI

        } catch (e) {
            console.error(e);
            this.notify("Load failed");
        }
    }

    addFloor() {
        if (!this.homeRenderer.currentHome) return;
        const level = this.homeRenderer.currentHome.floors.length;
        this.homeRenderer.currentHome.floors.push({
            level: level,
            name: `Floor ${level}`,
            walls: [],
            lights: [],
            shape: []
        });
        this.currentFloorIndex = level;
        this.refresh();
        this.notify(`Added Floor ${level} (Active)`);

        // Notify UI of update
        if (this.notificationHandler) // HACK: reusing notify to trigger UI updates if we implement a generic event bus later
            this.notify({ type: 'floor_change', level: this.currentFloorIndex });
        
        this.autoSave(); // Auto-save after adding floor
    }

    switchFloor(delta) {
        if (!this.homeRenderer.currentHome) return;
        const newIndex = this.currentFloorIndex + delta;
        if (newIndex >= 0 && newIndex < this.homeRenderer.currentHome.floors.length) {
            this.currentFloorIndex = newIndex;
            this.refresh(); // Triggers visibility check in renderer
            this.notify(`Floor: ${newIndex}`);

            // Notify UI
            if (this.notificationHandler)
                this.notify({ type: 'floor_change', level: this.currentFloorIndex });
        }
    }

    getCurrentFloor() {
        if (!this.homeRenderer.currentHome) return null;
        return this.homeRenderer.currentHome.floors[this.currentFloorIndex];
    }

    getFloorById(id) {
        if (!this.homeRenderer.currentHome) return null;
        return this.homeRenderer.currentHome.floors.find(f => f.id === id);
    }

    refresh() {
        this.homeRenderer.render(this.homeRenderer.currentHome);
        this.homeRenderer.setVisibleFloorLimit(this.currentFloorIndex, true); // immediate = true for editor
    }
}
