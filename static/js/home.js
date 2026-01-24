import * as THREE from 'three';

export class HomeRenderer {
    constructor(scene) {
        this.scene = scene;
        this.homeGroup = new THREE.Group();
        this.scene.add(this.homeGroup);
        this.interactables = [];
        this.gizmos = [];
    }

    render(home) {
        this.currentHome = home;
        // Clear previous
        while (this.homeGroup.children.length > 0) {
            this.homeGroup.remove(this.homeGroup.children[0]);
        }
        this.interactables = [];
        this.gizmos = [];

        // For Centering
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        let hasPoints = false;

        home.floors.forEach((floor, index) => {
            const floorGroup = new THREE.Group();
            floorGroup.position.y = floor.level * 2.5;

            floorGroup.userData = { level: floor.level };

            // Floor Plane
            if (floor.shape && floor.shape.length > 2) {
                const shape = new THREE.Shape();
                shape.moveTo(floor.shape[0].x, floor.shape[0].z);

                // Track bounds
                minX = Math.min(minX, floor.shape[0].x);
                maxX = Math.max(maxX, floor.shape[0].x);
                minZ = Math.min(minZ, floor.shape[0].z);
                maxZ = Math.max(maxZ, floor.shape[0].z);
                hasPoints = true;

                for (let i = 1; i < floor.shape.length; i++) {
                    shape.lineTo(floor.shape[i].x, floor.shape[i].z);
                    minX = Math.min(minX, floor.shape[i].x);
                    maxX = Math.max(maxX, floor.shape[i].x);
                    minZ = Math.min(minZ, floor.shape[i].z);
                    maxZ = Math.max(maxZ, floor.shape[i].z);
                }

                // Extrude for thickness (solves z-fighting and light bleeding)
                // Extrude for thickness (solves z-fighting and light bleeding)
                const extrudeSettings = { depth: 0.25, bevelEnabled: false };
                const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);

                // Standard dark floor
                const mat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
                const mesh = new THREE.Mesh(geo, mat);

                // Rotation X 90: Shape is XY -> XZ. 
                // Extrusion is Z axis (which becomes -Y after rotation).
                mesh.rotation.x = Math.PI / 2;
                mesh.position.y = 0.01; // Slight offset to cover lower walls
                mesh.receiveShadow = true;
                floorGroup.add(mesh);
            }

            // Walls
            floor.walls.forEach(wall => {
                this.createWall(wall, floorGroup, floor.id);
            });

            // Lights
            floor.lights.forEach(light => {
                this.createLight(light, floorGroup, home.id, floor.id);
            });

            this.homeGroup.add(floorGroup);
        });

        // Center Base Plate
        if (hasPoints) {
            const cx = (minX + maxX) / 2;
            const cz = (minZ + maxZ) / 2;

            const plate = this.scene.getObjectByName('basePlate');
            if (plate) {
                plate.position.set(cx, -0.25, cz);
            }
            const rim = this.scene.getObjectByName('basePlateRim');
            if (rim) {
                rim.position.set(cx, 0, cz);
            }
        }
    }

    setVisibleFloorLimit(maxLevel) {
        if (!this.homeGroup) return;
        this.homeGroup.children.forEach(floorGroup => {
            const level = floorGroup.userData.level;
            if (level !== undefined) {
                if (level > maxLevel) {
                    floorGroup.visible = false;
                } else {
                    floorGroup.visible = true;
                }
            }
        });
    }

    setGizmoVisibility(visible) {
        this.gizmos.forEach(g => g.visible = visible);
    }

    createWall(wallData, parent, floorId) {
        const { p1, p2, height, thickness } = wallData;
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        const cx = (p1.x + p2.x) / 2;
        const cz = (p1.z + p2.z) / 2;

        const geo = new THREE.BoxGeometry(len, height, thickness);
        // Bright walls for contrast against dark bg
        const mat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.set(cx, height / 2, cz);
        mesh.rotation.y = -angle;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.userData = { type: 'wall', floorId, obj: wallData };
        this.interactables.push(mesh);
        parent.add(mesh);

        if (wallData.windows) {
            wallData.windows.forEach(win => {
                const wGeo = new THREE.BoxGeometry(1, 1, thickness + 0.1);
                const wMat = new THREE.MeshStandardMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.6 });
                const wMesh = new THREE.Mesh(wGeo, wMat);
                wMesh.position.set(0, 0, 0);
                mesh.add(wMesh);
            });
        }
    }

    createLight(lightData, parent, homeId, floorId) {
        const { id, position, state, name } = lightData;
        const geo = new THREE.SphereGeometry(0.2, 16, 16);
        const mat = new THREE.MeshStandardMaterial({
            color: state.on ? state.color : 0x4a4a4a,
            emissive: state.on ? state.color : 0x000000,
            emissiveIntensity: state.on ? 1 : 0
        });
        const mesh = new THREE.Mesh(geo, mat);

        // Convert to local coordinates relative to floor group
        const relativeY = position.y - parent.position.y;

        mesh.position.set(position.x, relativeY, position.z);
        mesh.userData = { type: 'light', id, homeId, floorId, state, name, mesh };

        this.interactables.push(mesh);
        this.gizmos.push(mesh);
        parent.add(mesh);

        if (state.on) {
            const light = new THREE.PointLight(state.color, state.intensity * 5, 15);
            light.position.set(position.x, relativeY, position.z);
            light.castShadow = true;
            parent.add(light);
        }
    }

    updateSmartWalls(camera, target) {
        if (!this.interactables) return;

        const viewDir = new THREE.Vector3().subVectors(target, camera.position).normalize();
        const distToTarget = camera.position.distanceTo(target);

        const thresholdCenter = distToTarget + 1.0;
        const buffer = 0.5;

        this.interactables.forEach(obj => {
            if (obj.userData.type === 'wall' && obj.userData.obj) {
                if (obj.parent && obj.parent.visible === false) return;

                const wallPos = new THREE.Vector3();
                obj.getWorldPosition(wallPos);

                const toWall = new THREE.Vector3().subVectors(wallPos, camera.position);
                const projectDist = toWall.dot(viewDir);
                const originalHeight = obj.userData.obj.height || 2.5;

                let shouldLower = obj.userData.isLowered || false;
                if (obj.userData.isLowered) {
                    if (projectDist > thresholdCenter + buffer) shouldLower = false;
                } else {
                    if (projectDist < thresholdCenter - buffer) shouldLower = true;
                }
                obj.userData.isLowered = shouldLower;

                const targetScale = shouldLower ? 0.25 : 1.0;

                if (obj.userData.currentScale === undefined) obj.userData.currentScale = 1.0;

                const lerpFactor = 0.1;
                obj.userData.currentScale += (targetScale - obj.userData.currentScale) * lerpFactor;

                if (Math.abs(targetScale - obj.userData.currentScale) < 0.01) {
                    obj.userData.currentScale = targetScale;
                }

                obj.scale.y = obj.userData.currentScale;
                obj.position.y = (originalHeight * obj.userData.currentScale) / 2;
            }
        });
    }
}
