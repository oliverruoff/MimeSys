import * as THREE from 'three';

export class HomeRenderer {
    constructor(scene) {
        this.scene = scene;
        this.homeGroup = new THREE.Group();
        this.scene.add(this.homeGroup);
        this.interactables = [];
        this.gizmos = [];
        // Floor transition state tracking
        this.floorTransitions = new Map(); // Maps floor level to { targetScale: 0-1, currentScale: 0-1 }
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

                // Use MeshLambertMaterial for better performance with many lights (no shader limit)
                const mat = new THREE.MeshLambertMaterial({ color: 0x444444 });
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

            // Cubes
            if (floor.cubes) {
                floor.cubes.forEach(cube => {
                    this.createCube(cube, floorGroup, floor.id);
                });
            }

            this.homeGroup.add(floorGroup);
        });

        // Center Base Plate
        if (hasPoints) {
            const cx = (minX + maxX) / 2;
            const cz = (minZ + maxZ) / 2;

            // REMOVED: Base plate repositioning (disk no longer exists)
            // const plate = this.scene.getObjectByName('basePlate');
            // if (plate) {
            //     plate.position.set(cx, -0.25, cz);
            // }
            // const rim = this.scene.getObjectByName('basePlateRim');
            // if (rim) {
            //     rim.position.set(cx, 0, cz);
            // }
        }
    }

    setVisibleFloorLimit(maxLevel, immediate = false) {
        if (!this.homeGroup) return;
        this.homeGroup.children.forEach(floorGroup => {
            const level = floorGroup.userData.level;
            if (level !== undefined) {
                const shouldBeVisible = level <= maxLevel;
                const targetScale = shouldBeVisible ? 1 : 0;
                
                // Initialize transition state if not exists
                if (!this.floorTransitions.has(level)) {
                    this.floorTransitions.set(level, {
                        targetScale: targetScale,
                        currentScale: targetScale  // Start at target (no animation on init)
                    });
                    
                    // Set immediate visibility and scale for initial state
                    floorGroup.visible = shouldBeVisible;
                    floorGroup.scale.y = targetScale;
                    floorGroup.position.y = (level * 2.5) * targetScale;
                    
                    // Set PointLight visibility based on initial state (not sphere meshes)
                    const pointLightsInFloor = floorGroup.children.filter(child => 
                        child.userData && child.userData.type === 'pointLight'
                    );
                    
                    if (shouldBeVisible) {
                        // Floor is visible, show PointLights that are on
                        pointLightsInFloor.forEach(light => {
                            light.visible = light.intensity > 0;
                        });
                    } else {
                        // Floor is hidden, hide all PointLights
                        pointLightsInFloor.forEach(light => {
                            light.visible = false;
                        });
                    }
                } else {
                    // Update target scale for existing floors
                    const transitionState = this.floorTransitions.get(level);
                    transitionState.targetScale = targetScale;
                    
                    // If immediate mode (editor), skip animation and apply instantly
                    if (immediate) {
                        transitionState.currentScale = targetScale;
                        floorGroup.scale.y = targetScale;
                        floorGroup.position.y = (level * 2.5) * targetScale;
                        floorGroup.visible = shouldBeVisible;
                        
                        // Set PointLight visibility in immediate mode (not sphere meshes)
                        const pointLightsInFloor = floorGroup.children.filter(child => 
                            child.userData && child.userData.type === 'pointLight'
                        );
                        
                        if (shouldBeVisible) {
                            pointLightsInFloor.forEach(light => {
                                light.visible = light.intensity > 0;
                            });
                        } else {
                            pointLightsInFloor.forEach(light => {
                                light.visible = false;
                            });
                        }
                    } else {
                        // In animated mode, hide PointLights immediately when starting to transition out
                        if (targetScale === 0) {
                            const pointLightsInFloor = floorGroup.children.filter(child => 
                                child.userData && child.userData.type === 'pointLight'
                            );
                            pointLightsInFloor.forEach(light => {
                                light.visible = false;
                            });
                        }
                    }
                }
            }
        });
    }

    animateFloorTransitions() {
        if (!this.homeGroup) return;
        
        const lerpSpeed = 0.08; // Smooth transition speed
        
        this.homeGroup.children.forEach(floorGroup => {
            const level = floorGroup.userData.level;
            if (level === undefined) return;
            
            const transitionState = this.floorTransitions.get(level);
            if (!transitionState) return;
            
            const { targetScale, currentScale } = transitionState;
            
            // Smoothly interpolate current scale towards target
            const newScale = currentScale + (targetScale - currentScale) * lerpSpeed;
            
            // Update transition state
            transitionState.currentScale = newScale;
            
            // Apply scale to all floor elements
            floorGroup.scale.y = newScale;
            
            // Adjust position to make it grow/shrink from ground up
            const baseY = level * 2.5;
            floorGroup.position.y = baseY * newScale;
            
            // PointLight visibility control based on transition state
            // Hide PointLights immediately when starting to transition out (targetScale = 0)
            // Show PointLights only after transition in is complete (newScale >= 0.99)
            // Note: Light sphere meshes stay hidden via setGizmoVisibility(false) in showcase view
            const pointLightsInFloor = floorGroup.children.filter(child => 
                child.userData && child.userData.type === 'pointLight'
            );
            
            if (targetScale === 0) {
                // Transitioning out - hide all PointLights immediately
                pointLightsInFloor.forEach(light => {
                    light.visible = false;
                });
            } else if (targetScale === 1) {
                // Transitioning in - only show PointLights when transition is complete
                if (newScale >= 0.99) {
                    pointLightsInFloor.forEach(light => {
                        // Only make visible if the light is actually on (check intensity)
                        light.visible = light.intensity > 0;
                    });
                } else {
                    // Still transitioning in - keep PointLights hidden
                    pointLightsInFloor.forEach(light => {
                        light.visible = false;
                    });
                }
            }
            
            // When shrunk to nearly zero, hide the floor completely
            if (targetScale === 0 && newScale < 0.01) {
                floorGroup.visible = false;
                transitionState.currentScale = 0;
            } else if (targetScale > 0 && floorGroup.visible === false) {
                // Make visible when starting to expand
                floorGroup.visible = true;
            }
            
            // Snap to target if very close
            if (Math.abs(targetScale - newScale) < 0.005) {
                transitionState.currentScale = targetScale;
                floorGroup.scale.y = targetScale;
                floorGroup.position.y = baseY * targetScale;
            }
        });
    }

    setGizmoVisibility(visible) {
        this.gizmos.forEach(g => g.visible = visible);
    }

    getHighestVisibleFloorLevel() {
        if (!this.homeGroup) return undefined;

        let highestLevel;
        this.homeGroup.children.forEach(floorGroup => {
            const level = floorGroup.userData.level;
            if (level === undefined) return;

            const transitionState = this.floorTransitions.get(level);
            const scaleY = transitionState ? transitionState.currentScale : floorGroup.scale.y;
            const isShown = floorGroup.visible && scaleY > 0.01;

            if (!isShown) return;
            if (highestLevel === undefined || level > highestLevel) {
                highestLevel = level;
            }
        });

        return highestLevel;
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
        // Use MeshLambertMaterial for better performance with many lights (no shader limit)
        const mat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
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
                // Use MeshLambertMaterial for better performance with many lights
                const wMat = new THREE.MeshLambertMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.6 });
                const wMesh = new THREE.Mesh(wGeo, wMat);
                wMesh.position.set(0, 0, 0);
                mesh.add(wMesh);
            });
        }
    }

    createLight(lightData, parent, homeId, floorId) {
        const { id, position, state, name } = lightData;
        const geo = new THREE.SphereGeometry(0.2, 16, 16);
        // Use MeshBasicMaterial so light bulbs aren't affected by other lights
        // This avoids the WebGL shader compilation limit of ~16 lights
        const mat = new THREE.MeshBasicMaterial({
            color: state.on ? state.color : 0x4a4a4a
        });
        const mesh = new THREE.Mesh(geo, mat);

        // Convert to local coordinates relative to floor group
        const relativeY = position.y - parent.position.y;

        mesh.position.set(position.x, relativeY, position.z);
        mesh.userData = { type: 'light', id, homeId, floorId, state, name, mesh };

        this.interactables.push(mesh);
        this.gizmos.push(mesh);
        parent.add(mesh);

        // Always create a PointLight, but set intensity to 0 when off
        // This ensures the light can be turned on via API updates
        const light = new THREE.PointLight(state.color, state.on ? state.intensity * 5 : 0, 15);
        light.position.set(position.x, relativeY, position.z);
        // Disable shadows on PointLights to avoid WebGL limit (max ~8-16 shadow-casting lights)
        // Sun/directional lights provide global shadows instead
        light.castShadow = false;
        light.userData = { type: 'pointLight', lightId: id };
        
        // Start with lights hidden - they will be shown by animateFloorTransitions when appropriate
        mesh.visible = false;
        light.visible = false;
        
        parent.add(light);
    }

    createCube(cubeData, parent, floorId) {
        const { id, position, size, rotation, color, name } = cubeData;
        const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
        // Use MeshLambertMaterial for better performance with many lights (no shader limit)
        const mat = new THREE.MeshLambertMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);

        const relativeY = position.y - parent.position.y;
        mesh.position.set(position.x, relativeY, position.z);
        mesh.rotation.y = rotation;

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.userData = { type: 'cube', id, floorId, obj: cubeData };

        this.interactables.push(mesh);
        parent.add(mesh);
    }

    updateLights(home) {
        if (!home || !home.floors) return;

        home.floors.forEach(floor => {
            if (!floor.lights) return;
            floor.lights.forEach(lightData => {
                // Find corresponding mesh/light in the scene
                // We stored { type: 'light', id, homeId, floorId, state, name, mesh } in userData
                const obj = this.interactables.find(o =>
                    o.userData.type === 'light' && o.userData.id === lightData.id
                );

                if (obj) {
                    const state = lightData.state;
                    // console.log(`DEBUG: Updating light ${lightData.name}: on=${state.on}`);
                    // Update material color (MeshBasicMaterial only has color, not emissive)
                    if (obj.material) {
                        obj.material.color.setHex(state.on ? parseInt(state.color.replace('#', '0x')) : 0x4a4a4a);
                    }

                    // Update PointLight - find it by userData.lightId
                    if (obj.parent) {
                        const pointLight = obj.parent.children.find(child => 
                            child.userData && child.userData.type === 'pointLight' && child.userData.lightId === lightData.id
                        );
                        
                        if (pointLight) {
                            pointLight.color.setHex(parseInt(state.color.replace('#', '0x')));
                            pointLight.intensity = state.on ? state.intensity * 5 : 0;
                        }
                    }

                    // Update internal state
                    obj.userData.state = state;
                }
            });
        });
    }

    updateSmartWalls(camera, target, targetFloor) {
        if (!this.interactables) return;

        const viewDir = new THREE.Vector3().subVectors(target, camera.position).normalize();
        const distToTarget = camera.position.distanceTo(target);

        // Adjust threshold: walls closer than (Target - offset) are lowered.
        // Previously +1.0, which lowered walls behind the target (side/back in small rooms).
        // Now -0.5: Only walls clearly in FRONT of the target are lowered. Side walls stay up.
        const thresholdCenter = distToTarget - 0.5;
        const buffer = 0.25;

        const resetObjectToFullHeight = (obj) => {
            obj.userData.isLowered = false;
            obj.userData.currentScale = 1.0;
            obj.scale.y = 1.0;

            if (obj.userData.type === 'wall') {
                const originalHeight = obj.userData.obj.height || 2.5;
                obj.position.y = originalHeight / 2;
            } else if (obj.userData.type === 'cube') {
                const relativeY = obj.userData.obj.position.y - obj.parent.position.y;
                obj.position.y = relativeY;
            }
        };

        this.interactables.forEach(obj => {
            // Handle both walls and cubes
            if ((obj.userData.type === 'wall' || obj.userData.type === 'cube') && obj.userData.obj) {
                if (!obj.parent) return;

                // Floors that are currently hidden should never keep smart-wall transforms.
                if (obj.parent.visible === false) {
                    resetObjectToFullHeight(obj);
                    return;
                }

                // Skip objects not on the target floor - always reset them to full height.
                if (targetFloor !== undefined) {
                    const objFloorLevel = obj.parent.userData.level;
                    if (objFloorLevel !== targetFloor) {
                        resetObjectToFullHeight(obj);
                        return;
                    }
                }

                const objPos = new THREE.Vector3();
                obj.getWorldPosition(objPos);

                const toObj = new THREE.Vector3().subVectors(objPos, camera.position);
                const projectDist = toObj.dot(viewDir);
                
                // Get original height based on object type
                let originalHeight;
                if (obj.userData.type === 'wall') {
                    originalHeight = obj.userData.obj.height || 2.5;
                } else if (obj.userData.type === 'cube') {
                    originalHeight = obj.userData.obj.size.y;
                }

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
                
                // Adjust position based on object type
                if (obj.userData.type === 'wall') {
                    obj.position.y = (originalHeight * obj.userData.currentScale) / 2;
                } else if (obj.userData.type === 'cube') {
                    // For cubes, maintain the relative position to floor
                    const relativeY = obj.userData.obj.position.y - obj.parent.position.y;
                    obj.position.y = relativeY * obj.userData.currentScale;
                }
            }
        });
    }
}
