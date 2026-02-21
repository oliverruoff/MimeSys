export class UI {
    constructor(app) {
        this.app = app;
        this.editor = app.editor;
        this.smartWallsEnabled = false;

        this.container = document.createElement('div');
        this.container.className = 'glass absolute bottom-4 left-1/2 transform -translate-x-1/2 p-3 rounded-lg z-10';
        this.container.style.display = 'flex';
        this.container.style.gap = '8px';
        this.container.style.alignItems = 'center';
        document.body.appendChild(this.container);

        // View Mode
        this.createButton('View', () => {
            this.editor.setEnabled(false);
            this.app.controls.enabled = true;
            if (this.app.homeRenderer.setGizmoVisibility)
                this.app.homeRenderer.setGizmoVisibility(true);
        }, true);

        this.createSeparator();

        // Add Wall
        this.createButton('Add Wall', () => {
            this.editor.setEnabled(true);
            this.editor.setMode('wall');
            this.app.controls.enabled = false;
            if (this.app.homeRenderer.setGizmoVisibility)
                this.app.homeRenderer.setGizmoVisibility(true);
        });

        this.createSeparator();

        // Add Light
        this.createButton('Add Light', () => {
            this.editor.setEnabled(true);
            this.editor.setMode('light');
            this.app.controls.enabled = false;
            if (this.app.homeRenderer.setGizmoVisibility)
                this.app.homeRenderer.setGizmoVisibility(true);
        });

        this.createSeparator();

        // Add Cube
        this.createButton('Add Cube', () => {
            this.editor.setEnabled(true);
            this.editor.setMode('cube');
            this.app.controls.enabled = false;
            if (this.app.homeRenderer.setGizmoVisibility)
                this.app.homeRenderer.setGizmoVisibility(true);
        });

        this.createSeparator();

        // Add Ground
        this.createButton('Add Ground', () => {
            this.editor.setEnabled(true);
            this.editor.setMode('floor_poly');
            this.app.controls.enabled = false;
            if (this.app.homeRenderer.setGizmoVisibility)
                this.app.homeRenderer.setGizmoVisibility(true);
        });

        this.createSeparator();

        // Delete
        this.createButton('Delete', () => {
            this.editor.setEnabled(true);
            this.editor.setMode('delete');
            this.app.controls.enabled = false;
            if (this.app.homeRenderer.setGizmoVisibility)
                this.app.homeRenderer.setGizmoVisibility(true);
        });

        this.createSeparator();

        // Smart Walls Toggle
        this.createButton('Smart Walls: OFF', (e) => {
            this.smartWallsEnabled = !this.smartWallsEnabled;
            e.target.textContent = `Smart Walls: ${this.smartWallsEnabled ? 'ON' : 'OFF'}`;
            if (this.smartWallsEnabled) e.target.classList.add('btn-active');
            else e.target.classList.remove('btn-active');

            if (!this.smartWallsEnabled) {
                this.app.homeRenderer.interactables.forEach(o => {
                    if (o.userData.type === 'wall') {
                        o.scale.y = 1.0;
                        o.position.y = (o.userData.obj.height || 2.5) / 2;
                        o.userData.currentScale = 1.0; // Reset lerp state
                    } else if (o.userData.type === 'cube') {
                        o.scale.y = 1.0;
                        const relativeY = o.userData.obj.position.y - o.parent.position.y;
                        o.position.y = relativeY;
                        o.userData.currentScale = 1.0; // Reset lerp state
                    }
                });
            }
        });

        this.createSeparator();

        // Undo Operation
        this.createButton('Undo', () => this.editor.undo());

        // Initialize: Start in View mode (controls enabled, editor disabled)
        console.log('UI Init: Setting controls.enabled = true'); // DEBUG
        this.editor.setEnabled(false);
        this.app.controls.enabled = true;
        console.log('UI Init: controls.enabled is now', this.app.controls.enabled); // DEBUG

        this.initToasts();
        this.initSidebar();
        this.initZoomControls();
        this.initFloorNavigation();
        this.initFileOperations();
    }

    initFileOperations() {
        // Create file operations container
        const fileOps = document.createElement('div');
        fileOps.className = 'glass';
        fileOps.style.position = 'absolute';
        fileOps.style.top = '32px';
        fileOps.style.left = '32px';
        fileOps.style.display = 'flex';
        fileOps.style.gap = '8px';
        fileOps.style.padding = '8px';
        fileOps.style.alignItems = 'center';
        fileOps.style.borderRadius = '12px';
        fileOps.style.zIndex = '10';
        document.body.appendChild(fileOps);

        // Save button
        this.createButtonInContainer(fileOps, 'Save', () => this.editor.save());

        // Load button
        this.createButtonInContainer(fileOps, 'Load', () => this.createFileExplorerModal());

        // Download button
        this.createButtonInContainer(fileOps, 'Download', () => this.downloadSaveFile());

        // Separator
        this.createSeparatorInContainer(fileOps);

        // Background color picker
        const bgColorLabel = document.createElement('span');
        bgColorLabel.textContent = 'BG:';
        bgColorLabel.style.color = 'white';
        bgColorLabel.style.fontSize = '12px';
        bgColorLabel.style.fontWeight = 'bold';
        fileOps.appendChild(bgColorLabel);

        const bgColorInput = document.createElement('input');
        bgColorInput.type = 'color';
        bgColorInput.value = '#222222';
        bgColorInput.style.width = '40px';
        bgColorInput.style.height = '30px';
        bgColorInput.style.border = '2px solid rgba(255, 255, 255, 0.3)';
        bgColorInput.style.borderRadius = '6px';
        bgColorInput.style.cursor = 'pointer';
        bgColorInput.style.backgroundColor = 'transparent';
        bgColorInput.title = 'Background Color';
        
        bgColorInput.addEventListener('change', async (e) => {
            const color = e.target.value;
            try {
                // Update via API
                const response = await fetch('/api/background/color', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ color })
                });
                
                if (response.ok) {
                    // Update scene background immediately using SceneManager method
                    if (this.app.sceneManager && this.app.sceneManager.setBackgroundColor) {
                        this.app.sceneManager.setBackgroundColor(color);
                    }
                    
                    // Update local home model so save() operations include the new color
                    if (this.app.homeRenderer && this.app.homeRenderer.currentHome) {
                        this.app.homeRenderer.currentHome.background_color = color;
                    }
                    
                    this.showToast(`Background color updated to ${color}`);
                }
            } catch (err) {
                console.error('Failed to update background color:', err);
                this.showToast('Failed to update background color', 'error');
            }
        });
        
        fileOps.appendChild(bgColorInput);
        
        // Store reference for later updates
        this.bgColorInput = bgColorInput;

        // Separator
        this.createSeparatorInContainer(fileOps);

        // New Home button (red and distinct)
        const resetBtn = this.createButtonInContainer(fileOps, 'New Home', async () => {
            if (confirm('⚠️ Reset EVERYTHING?\n\nThis will delete your current home and start fresh.\nUnsaved changes will be lost forever.')) {
                await fetch('/api/homes/reset', { method: 'POST' });
                window.location.reload();
            }
        });
        // Make it red and distinct
        resetBtn.style.background = 'rgba(220, 38, 38, 0.4)'; // Red 600
        resetBtn.style.border = '1px solid rgba(220, 38, 38, 0.6)';
        resetBtn.style.backdropFilter = 'blur(4px)';
        resetBtn.style.color = 'white'; // Ensure text is white

        // Hover effects
        resetBtn.onmouseenter = () => resetBtn.style.background = 'rgba(220, 38, 38, 0.8)';
        resetBtn.onmouseleave = () => resetBtn.style.background = 'rgba(220, 38, 38, 0.4)';
    }

    initFloorNavigation() {
        // Create floor navigation container
        const floorNav = document.createElement('div');
        floorNav.className = 'glass';
        floorNav.style.position = 'absolute';
        floorNav.style.bottom = '32px';
        floorNav.style.left = '32px';
        floorNav.style.display = 'flex';
        floorNav.style.gap = '8px';
        floorNav.style.padding = '8px';
        floorNav.style.alignItems = 'center';
        floorNav.style.borderRadius = '12px';
        floorNav.style.zIndex = '10';
        document.body.appendChild(floorNav);

        // Floor + button
        this.createButtonInContainer(floorNav, 'Floor +', () => this.editor.addFloor());

        // Down arrow
        this.createButtonInContainer(floorNav, '▼', () => this.editor.switchFloor(-1));

        // Floor indicator
        this.floorIndicator = document.createElement('div');
        this.floorIndicator.className = 'px-3 py-1 text-sm font-bold flex items-center justify-center bg-gray-800/50 rounded';
        this.floorIndicator.textContent = 'Floor 0';
        floorNav.appendChild(this.floorIndicator);

        // Up arrow
        this.createButtonInContainer(floorNav, '▲', () => this.editor.switchFloor(1));
    }

    initZoomControls() {
        const zoomContainer = document.createElement('div');
        // Use the same .glass class as the main toolbar for consistency
        zoomContainer.className = 'glass absolute bottom-8 right-8 flex flex-col z-10 p-0 overflow-hidden';
        // Tweak border radius for this specifically if needed, but glass class handles most
        zoomContainer.style.borderRadius = '12px';

        const createZoomBtn = (text, onClick, isFirst) => {
            const btn = document.createElement('button');
            // Explicitly reset background and border to avoid 'oldschool' default button look
            btn.className = 'w-10 h-10 flex items-center justify-center text-xl text-white outline-none transition-colors hover:bg-white/10 active:bg-white/20 cursor-pointer bg-transparent border-none';
            btn.style.background = 'transparent';
            btn.style.border = 'none';
            btn.style.color = 'white';
            btn.style.fontFamily = 'system-ui, -apple-system, sans-serif';
            btn.style.fontWeight = '300';
            btn.textContent = text;
            btn.onclick = onClick;

            if (isFirst) {
                btn.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
            }
            return btn;
        };

        const zoomIn = createZoomBtn('+', () => this.app.controls.zoomIn(), true);
        const zoomOut = createZoomBtn('−', () => this.app.controls.zoomOut(), false); // U+2212 Minus Sign for better vert align

        zoomContainer.appendChild(zoomIn);
        zoomContainer.appendChild(zoomOut);
        document.body.appendChild(zoomContainer);
    }

    initNewHomeButton() {
        const btn = document.createElement('button');
        btn.textContent = 'New Home';
        // Red transparent background, bottom right placement
        btn.className = 'absolute bottom-8 right-24 glass px-4 py-2 rounded-lg font-bold text-white transition hover:bg-red-600/80 bg-red-600/40 z-20 cursor-pointer border-none backdrop-blur-md';
        btn.style.border = '1px solid rgba(255, 0, 0, 0.3)';

        btn.onclick = async () => {
            if (confirm('⚠️ DANGER: Reset EVERYTHING?\n\nThis will delete your current home and start fresh.\nUnsaved changes will be lost forever.')) {
                await fetch('/api/homes/reset', { method: 'POST' });
                window.location.reload();
            }
        };
        document.body.appendChild(btn);
    }

    updateFloorIndicator(level) {
        if (this.floorIndicator) this.floorIndicator.textContent = `Floor ${level}`;
    }

    createButtonInContainer(container, text, onClick, active = false) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = `px-3 py-1 btn-glass rounded text-sm transition cursor-pointer ${active ? 'btn-active' : ''}`;
        btn.onclick = onClick;
        container.appendChild(btn);
        return btn;
    }

    createSeparatorInContainer(container) {
        const sep = document.createElement('div');
        sep.className = 'w-px bg-white/20';
        sep.style.height = '24px';
        sep.style.alignSelf = 'center';
        container.appendChild(sep);
    }

    createButton(text, onClick, active = false) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = `px-3 py-1 btn-glass rounded text-sm transition cursor-pointer ${active ? 'btn-active' : ''}`;
        btn.onclick = onClick;
        this.container.appendChild(btn);
        return btn;
    }

    createSeparator() {
        const sep = document.createElement('div');
        sep.className = 'w-px bg-white/20 mx-1';
        this.container.appendChild(sep);
    }

    initToasts() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        document.body.appendChild(this.toastContainer);
    }

    initSidebar() {
        this.sidebar = document.createElement('div');
        this.sidebar.className = 'sidebar glass';
        document.body.appendChild(this.sidebar);

        // Cube sidebar on the left
        this.cubeSidebar = document.createElement('div');
        this.cubeSidebar.className = 'cube-sidebar glass';
        document.body.appendChild(this.cubeSidebar);

        // Track minimized state
        this.lightsPaneMinimized = false;

        this.updateSidebar();
    }

    toggleLightsPane() {
        this.lightsPaneMinimized = !this.lightsPaneMinimized;
        this.updateSidebar();
    }

    updateSidebar() {
        // Update cube sidebar
        if (this.cubeSidebar) {
            this.cubeSidebar.innerHTML = '';
            if (this.editor.selectedObject && this.editor.selectedObject.userData.type === 'cube') {
                this.cubeSidebar.style.display = 'flex';
                this.renderCubeProperties(this.editor.selectedObject);
            } else {
                this.cubeSidebar.style.display = 'none';
            }
        }

        // Update lights sidebar
        if (!this.sidebar) return;
        this.sidebar.innerHTML = '';

        const currentFloor = this.editor.getCurrentFloor();
        if (!currentFloor) {
            const empty = document.createElement('div');
            empty.style.padding = '20px';
            empty.style.textAlign = 'center';
            empty.style.color = 'rgba(255, 255, 255, 0.3)';
            empty.style.fontSize = '13px';
            empty.textContent = 'No active floor';
            this.sidebar.appendChild(empty);
            return;
        }

        // Header
        const header = document.createElement('div');
        header.className = 'lights-sidebar-header';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        
        const title = document.createElement('h3');
        title.className = 'lights-sidebar-title';
        title.textContent = `Lights (${currentFloor.lights.length})`;
        header.appendChild(title);
        
        // Minimize/Maximize button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'icon-btn';
        toggleBtn.innerHTML = this.lightsPaneMinimized ? '▼' : '▲';
        toggleBtn.title = this.lightsPaneMinimized ? 'Maximize' : 'Minimize';
        toggleBtn.style.fontSize = '12px';
        toggleBtn.style.padding = '4px 8px';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.onclick = () => this.toggleLightsPane();
        header.appendChild(toggleBtn);
        
        this.sidebar.appendChild(header);

        // Lights container
        const container = document.createElement('div');
        container.className = 'lights-container';
        container.style.display = this.lightsPaneMinimized ? 'none' : 'flex';

        if (currentFloor.lights.length === 0) {
            const empty = document.createElement('div');
            empty.style.textAlign = 'center';
            empty.style.padding = '20px';
            empty.style.color = 'rgba(255, 255, 255, 0.3)';
            empty.style.fontSize = '13px';
            empty.textContent = "No lights on this floor";
            container.appendChild(empty);
        } else {
            currentFloor.lights.forEach(light => {
                const card = this.createLightCard(light, currentFloor);
                container.appendChild(card);
            });
        }

        this.sidebar.appendChild(container);
    }

    renderCubeProperties(mesh) {
        const cube = mesh.userData.obj;
        const currentFloor = this.editor.getCurrentFloor();
        if (!currentFloor) return;

        const container = document.createElement('div');
        container.className = 'prop-panel';

        // Header: Name + Delete
        const header = document.createElement('div');
        header.className = 'prop-header';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'input-glass flex-grow'; // Keeping input-glass as it is defined in css
        nameInput.style.fontWeight = '500';
        nameInput.value = cube.name || 'Untitled Cube';
        nameInput.onchange = (e) => {
            cube.name = e.target.value;
            this.editor.refresh();
        };
        header.appendChild(nameInput);

        // Delete Button
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn text-red-500/70 hover:text-red-500'; // Keep some util classes if they work, but mainly icon-btn
        delBtn.style.color = '#ef4444'; // Red-500 manual fallback
        delBtn.innerHTML = '🗑️';
        delBtn.title = 'Delete Cube';
        delBtn.onclick = () => {
            this.editor.deleteObject(mesh.userData);
            this.editor.selectedObject = null;
            this.updateSidebar();
        };
        header.appendChild(delBtn);
        container.appendChild(header);

        // Position Section
        const posSection = document.createElement('div');
        posSection.className = 'prop-section';

        const posHeader = document.createElement('div');
        posHeader.className = 'prop-section-header';
        posHeader.textContent = 'Placement';
        posSection.appendChild(posHeader);

        // X and Z Group
        const xzRow = document.createElement('div');
        xzRow.className = 'prop-row-dual';

        const createPosInput = (axis, label) => {
            const group = document.createElement('div');
            group.className = 'prop-input-group';

            const lbl = document.createElement('span');
            lbl.className = 'prop-input-label';
            lbl.textContent = label;
            group.appendChild(lbl);

            const inp = document.createElement('input');
            inp.type = 'number';
            inp.step = '0.1';
            inp.className = 'prop-input-number';
            inp.value = cube.position[axis].toFixed(1);
            inp.onchange = (e) => {
                cube.position[axis] = parseFloat(e.target.value);
                this.editor.refresh();
            };
            group.appendChild(inp);
            return group;
        };

        xzRow.appendChild(createPosInput('x', 'X'));
        xzRow.appendChild(createPosInput('z', 'Z'));
        posSection.appendChild(xzRow);

        // Elevation Slider
        const floorY = currentFloor.level * 2.5;
        this.createPropSlider(posSection, 'Elevation', cube.position.y - floorY, 0, 10, 0.1, (val) => {
            cube.position.y = floorY + val;
        });

        container.appendChild(posSection);

        // Dimensions Section
        const dimSection = document.createElement('div');
        dimSection.className = 'prop-section';

        const dimHeader = document.createElement('div');
        dimHeader.className = 'prop-section-header';
        dimHeader.textContent = 'Dimensions';
        dimSection.appendChild(dimHeader);

        this.createPropSlider(dimSection, 'Width', cube.size.x, 0.1, 10, 0.1, (val) => cube.size.x = val);
        this.createPropSlider(dimSection, 'Height', cube.size.y, 0.1, 10, 0.1, (val) => cube.size.y = val);
        this.createPropSlider(dimSection, 'Depth', cube.size.z, 0.1, 10, 0.1, (val) => cube.size.z = val);

        container.appendChild(dimSection);

        // Rotation Section
        const rotSection = document.createElement('div');
        rotSection.className = 'prop-section';

        const rotHeader = document.createElement('div');
        rotHeader.className = 'prop-section-header';
        rotHeader.textContent = 'Rotation';
        rotSection.appendChild(rotHeader);

        this.createPropSlider(rotSection, 'Angle', cube.rotation, 0, Math.PI * 2, 0.1, (val) => cube.rotation = val);

        container.appendChild(rotSection);

        // Appearance Section
        const appeSection = document.createElement('div');
        appeSection.className = 'prop-section';

        const appeHeader = document.createElement('div');
        appeHeader.className = 'prop-section-header';
        appeHeader.textContent = 'Appearance';
        appeSection.appendChild(appeHeader);

        const colorRow = document.createElement('div');
        colorRow.className = 'prop-color-row';

        const colorLabel = document.createElement('span');
        colorLabel.className = 'prop-slider-label';
        colorLabel.textContent = 'Color';
        colorRow.appendChild(colorLabel);

        const colorPreview = document.createElement('div');
        colorPreview.className = 'prop-color-preview';
        colorPreview.style.background = cube.color;

        const colorInp = document.createElement('input');
        colorInp.type = 'color';
        colorInp.className = 'prop-color-input';
        colorInp.value = cube.color;
        colorInp.oninput = (e) => {
            cube.color = e.target.value;
            colorPreview.style.background = e.target.value;
            this.editor.refresh();
        };

        colorPreview.appendChild(colorInp);
        colorRow.appendChild(colorPreview);
        appeSection.appendChild(colorRow);

        container.appendChild(appeSection);

        this.cubeSidebar.appendChild(container);
    }

    createPropSlider(parent, label, value, min, max, step, onChange) {
        const row = document.createElement('div');
        row.className = 'prop-slider-row';

        const header = document.createElement('div');
        header.className = 'prop-slider-header';

        const lbl = document.createElement('span');
        lbl.className = 'prop-slider-label';
        lbl.textContent = label;
        header.appendChild(lbl);

        const valDisplay = document.createElement('span');
        valDisplay.className = 'prop-slider-value';
        valDisplay.textContent = value.toFixed(1);
        header.appendChild(valDisplay);
        row.appendChild(header);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'form-range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = value;
        slider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            valDisplay.textContent = val.toFixed(1);
            onChange(val);
            this.editor.refresh();
        };
        row.appendChild(slider);

        parent.appendChild(row);
    }

    createLightCard(light, floor) {
        const card = document.createElement('div');
        card.className = 'light-card';

        // Header: Name + Toggle + Delete
        const header = document.createElement('div');
        header.className = 'prop-header';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'input-glass flex-grow';
        nameInput.style.fontWeight = '500';
        nameInput.value = light.name || 'Light';
        nameInput.onchange = (e) => {
            light.name = e.target.value;
            this.editor.refresh();
        };
        header.appendChild(nameInput);

        // Toggle Switch
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'toggle';
        toggleLabel.style.flexShrink = '0';
        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = light.state.on;
        toggleInput.onchange = (e) => {
            light.state.on = e.target.checked;
            if (light.state.on) {
                const parsedIntensity = Number(light.state.intensity);
                if (!Number.isFinite(parsedIntensity) || parsedIntensity < 0) {
                    light.state.intensity = 1.0;
                }
            }
            this.editor.refresh();
        };
        const toggleSpan = document.createElement('span');
        toggleSpan.className = 'slider';
        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(toggleSpan);
        header.appendChild(toggleLabel);

        // Delete
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn';
        delBtn.style.color = '#ef4444';
        delBtn.innerHTML = '🗑️';
        delBtn.title = 'Remove Light';
        delBtn.onclick = () => {
            this.editor.deleteObject({ type: 'light', id: light.id, floorId: floor.id });
            this.updateSidebar();
        };
        header.appendChild(delBtn);

        card.appendChild(header);

        // Position Section
        const posSection = document.createElement('div');
        posSection.className = 'prop-section';

        const posHeader = document.createElement('div');
        posHeader.className = 'prop-section-header';
        posHeader.textContent = 'Placement';
        posSection.appendChild(posHeader);

        // X and Z inputs
        const xzRow = document.createElement('div');
        xzRow.className = 'prop-row-dual';

        const createPosInput = (axis, label) => {
            const group = document.createElement('div');
            group.className = 'prop-input-group';

            const lbl = document.createElement('span');
            lbl.className = 'prop-input-label';
            lbl.textContent = label;
            group.appendChild(lbl);

            const inp = document.createElement('input');
            inp.type = 'number';
            inp.step = '0.1';
            inp.className = 'prop-input-number';
            inp.value = light.position[axis].toFixed(1);
            inp.onchange = (e) => {
                light.position[axis] = parseFloat(e.target.value);
                this.editor.refresh();
            };
            group.appendChild(inp);
            return group;
        };

        xzRow.appendChild(createPosInput('x', 'X'));
        xzRow.appendChild(createPosInput('z', 'Z'));
        posSection.appendChild(xzRow);

        // Height slider
        const floorY = floor.level * 2.5;
        this.createPropSlider(posSection, 'Height', light.position.y - floorY, 0, 2.5, 0.1, (val) => {
            light.position.y = floorY + val;
        });

        card.appendChild(posSection);

        // Properties Section
        const propsSection = document.createElement('div');
        propsSection.className = 'prop-section';

        const propsHeader = document.createElement('div');
        propsHeader.className = 'prop-section-header';
        propsHeader.textContent = 'Properties';
        propsSection.appendChild(propsHeader);

        // Brightness slider
        const initialIntensity = Number.isFinite(Number(light.state.intensity))
            ? Math.max(0, Number(light.state.intensity))
            : 1.0;
        this.createPropSlider(propsSection, 'Brightness', initialIntensity, 0, 5, 0.1, (val) => {
            light.state.intensity = val;
        });

        card.appendChild(propsSection);

        // Appearance Section
        const appeSection = document.createElement('div');
        appeSection.className = 'prop-section';

        const appeHeader = document.createElement('div');
        appeHeader.className = 'prop-section-header';
        appeHeader.textContent = 'Appearance';
        appeSection.appendChild(appeHeader);

        const colorRow = document.createElement('div');
        colorRow.className = 'prop-color-row';

        const colorLabel = document.createElement('span');
        colorLabel.className = 'prop-slider-label';
        colorLabel.textContent = 'Color';
        colorRow.appendChild(colorLabel);

        const colorPreview = document.createElement('div');
        colorPreview.className = 'prop-color-preview';
        colorPreview.style.background = light.state.color;

        const colorInp = document.createElement('input');
        colorInp.type = 'color';
        colorInp.className = 'prop-color-input';
        colorInp.value = light.state.color;
        colorInp.oninput = (e) => {
            light.state.color = e.target.value;
            colorPreview.style.background = e.target.value;
            this.editor.refresh();
        };

        colorPreview.appendChild(colorInp);
        colorRow.appendChild(colorPreview);
        appeSection.appendChild(colorRow);

        card.appendChild(appeSection);

        return card;
    }

    showNotification(message) {
        if (typeof message === 'object') {
            if (message.type === 'floor_change') {
                this.updateFloorIndicator(message.level);
                this.updateSidebar();
                return;
            } else if (message.type === 'content_change') {
                this.updateSidebar();
                return;
            }
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        this.toastContainer.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    async createFileExplorerModal() {
        // Inject Styles if not present
        if (!document.getElementById('file-explorer-styles')) {
            const style = document.createElement('style');
            style.id = 'file-explorer-styles';
            style.textContent = `
                .file-explorer-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(5px); }
                .file-explorer-modal { background: rgba(30, 30, 30, 0.9); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; width: 500px; max-width: 90%; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: white; }
                .file-explorer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .file-explorer-header h2 { margin: 0; font-size: 1.25rem; font-weight: 600; }
                .file-explorer-close { background: none; border: none; color: #9ca3af; font-size: 1.5rem; cursor: pointer; padding: 0 8px; transition: color 0.2s; }
                .file-explorer-close:hover { color: white; }
                .file-upload-section { margin-bottom: 20px; padding: 16px; background: rgba(59, 130, 246, 0.1); border: 2px dashed rgba(59, 130, 246, 0.3); border-radius: 8px; text-align: center; }
                .file-upload-section h3 { margin: 0 0 10px 0; font-size: 1rem; font-weight: 500; color: rgba(255, 255, 255, 0.9); }
                .file-upload-input { display: none; }
                .file-upload-button { background: rgba(59, 130, 246, 0.8); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
                .file-upload-button:hover { background: rgba(59, 130, 246, 1); transform: translateY(-1px); }
                .file-upload-status { margin-top: 10px; font-size: 0.85rem; color: #9ca3af; }
                .file-list { flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; padding-right: 4px; max-height: 400px; }
                .file-list-header { font-size: 0.9rem; color: #9ca3af; margin-bottom: 8px; font-weight: 500; }
                .file-item { background: rgba(255, 255, 255, 0.05); padding: 12px 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; transition: all 0.2s; border: 1px solid transparent; }
                .file-item:hover { background: rgba(255, 255, 255, 0.1); transform: translateX(2px); }
                .file-item.selected { background: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.5); }
                .file-name { flex-grow: 1; font-size: 0.95rem; }
            `;
            document.head.appendChild(style);
        }

        // Fetch saves
        let saves = [];
        try {
            saves = await fetch('/api/saves').then(r => r.json());
        } catch (e) {
            console.error(e);
            this.showNotification("Failed to list saves");
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'file-explorer-overlay';

        const modal = document.createElement('div');
        modal.className = 'file-explorer-modal';

        // Header
        const header = document.createElement('div');
        header.className = 'file-explorer-header';
        header.innerHTML = `<h2>Load Project</h2><button class="file-explorer-close">×</button>`;
        modal.appendChild(header);

        // Upload Section
        const uploadSection = document.createElement('div');
        uploadSection.className = 'file-upload-section';
        uploadSection.innerHTML = `
            <h3>Upload New Save File</h3>
            <input type="file" id="file-upload-input" class="file-upload-input" accept=".json">
            <button class="file-upload-button" id="upload-button">Choose File</button>
            <div class="file-upload-status" id="upload-status"></div>
        `;
        modal.appendChild(uploadSection);

        // File upload handler
        const fileInput = uploadSection.querySelector('#file-upload-input');
        const uploadButton = uploadSection.querySelector('#upload-button');
        const uploadStatus = uploadSection.querySelector('#upload-status');

        uploadButton.onclick = () => fileInput.click();
        
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            uploadStatus.textContent = 'Uploading...';
            uploadStatus.style.color = '#3b82f6';

            try {
                const result = await this.uploadSaveFile(file);
                uploadStatus.textContent = `✓ ${file.name} uploaded successfully!`;
                uploadStatus.style.color = '#10b981';
                
                // Load the uploaded file automatically
                setTimeout(() => {
                    this.editor.loadFromFile(result.filename);
                    document.body.removeChild(overlay);
                }, 500);
            } catch (error) {
                uploadStatus.textContent = `✗ ${error.message}`;
                uploadStatus.style.color = '#ef4444';
                fileInput.value = ''; // Reset input
            }
        };

        // Divider
        const divider = document.createElement('div');
        divider.className = 'file-list-header';
        divider.textContent = 'OR SELECT EXISTING FILE:';
        modal.appendChild(divider);

        // File List
        const list = document.createElement('div');
        list.className = 'file-list';

        if (saves.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding: 20px; color: #6b7280;">No saved files found</div>';
        }

        saves.forEach(filename => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `<span class="file-icon">📄</span><span class="file-name">${filename}</span>`;
            item.onclick = () => {
                this.editor.loadFromFile(filename);
                document.body.removeChild(overlay);
            };
            list.appendChild(item);
        });

        modal.appendChild(list);
        overlay.appendChild(modal);

        // Close handlers
        const close = () => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        };

        header.querySelector('.file-explorer-close').onclick = close;
        overlay.onclick = (e) => {
            if (e.target === overlay) close();
        };

        document.body.appendChild(overlay);
    }

    async downloadSaveFile() {
        try {
            // Fetch the current home data
            const response = await fetch('/api/homes');
            if (!response.ok) {
                throw new Error('Failed to fetch home data');
            }
            
            const homes = await response.json();
            if (!homes || homes.length === 0) {
                this.showToast('No home data to download', 'error');
                return;
            }
            
            const homeData = homes[0];
            
            // Convert to JSON string with pretty formatting
            const jsonString = JSON.stringify(homeData, null, 2);
            
            // Create a blob from the JSON string
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Create a download link and trigger it
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            link.download = `mimesys-save-${timestamp}.json`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the URL object
            URL.revokeObjectURL(url);
            
            this.showToast('Save file downloaded successfully!');
        } catch (error) {
            console.error('Download failed:', error);
            this.showToast('Failed to download save file', 'error');
        }
    }

    async uploadSaveFile(file) {
        // Validate file type
        if (!file.name.endsWith('.json')) {
            throw new Error('Only JSON files are supported');
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('File is too large (max 10MB)');
        }

        // Validate JSON structure
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Basic validation - check if it looks like a Home save file
            if (!data.id || !data.floors || !Array.isArray(data.floors)) {
                throw new Error('Invalid save file format - missing required fields');
            }
        } catch (e) {
            if (e instanceof SyntaxError) {
                throw new Error('Invalid JSON file');
            }
            throw e;
        }

        // Upload file
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/saves/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Upload failed');
        }

        const result = await response.json();
        this.showNotification(`File uploaded: ${result.filename}`);
        return result;
    }
}
