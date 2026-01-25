export class UI {
    constructor(app) {
        this.app = app;
        this.editor = app.editor;
        this.smartWallsEnabled = false;

        this.container = document.createElement('div');
        this.container.className = 'glass absolute bottom-4 left-1/2 transform -translate-x-1/2 p-2 rounded-lg flex flex-wrap gap-2 justify-center max-w-4xl z-10';
        document.body.appendChild(this.container);




        this.createButton('View', () => {
            this.editor.setEnabled(false);
            this.app.controls.enabled = true;
            if (this.app.homeRenderer.setGizmoVisibility)
                this.app.homeRenderer.setGizmoVisibility(false);
        }, true);

        this.createSeparator();

        this.createButton('Edit Walls', () => {
            this.editor.setEnabled(true);
            this.editor.setMode('wall');
            this.app.controls.enabled = false;
            if (this.app.homeRenderer.setGizmoVisibility)
                this.app.homeRenderer.setGizmoVisibility(true);
        });



        this.createButton('Add Light', () => {
            this.editor.setEnabled(true);
            this.editor.setMode('light');
            this.app.controls.enabled = false;
            if (this.app.homeRenderer.setGizmoVisibility)
                this.app.homeRenderer.setGizmoVisibility(true);
        });

        this.createButton('Custom Floor', () => {
            this.editor.setEnabled(true);
            this.editor.setMode('floor_poly');
            this.app.controls.enabled = false;
            if (this.app.homeRenderer.setGizmoVisibility)
                this.app.homeRenderer.setGizmoVisibility(true);
        });

        this.createButton('Add Cube', () => {
            this.editor.setEnabled(true);
            this.editor.setMode('cube');
            this.app.controls.enabled = false;
            if (this.app.homeRenderer.setGizmoVisibility)
                this.app.homeRenderer.setGizmoVisibility(true);
        });

        this.createSeparator();

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
                    }
                });
            }
        });

        this.createSeparator();
        this.createButton('Delete', () => {
            this.editor.setEnabled(true);
            this.editor.setMode('delete');
            this.app.controls.enabled = false;
            if (this.app.homeRenderer.setGizmoVisibility)
                this.app.homeRenderer.setGizmoVisibility(true);
        });

        this.createSeparator();

        this.createButton('Floor +', () => this.editor.addFloor());
        this.createButton('▼', () => this.editor.switchFloor(-1));

        this.floorIndicator = document.createElement('div');
        this.floorIndicator.className = 'px-3 py-1 text-sm font-bold flex items-center justify-center bg-gray-800/50 rounded';
        this.floorIndicator.textContent = 'Floor 0';
        this.container.appendChild(this.floorIndicator);

        this.createButton('▲', () => this.editor.switchFloor(1));

        this.createSeparator();
        this.createButton('Undo', () => this.editor.undo());
        this.createButton('Save', () => this.editor.save());
        this.createButton('Load', () => this.createFileExplorerModal());

        this.createSeparator();

        const resetBtn = this.createButton('New Home', async () => {
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

        // Initialize: Start in View mode (controls enabled, editor disabled)
        console.log('UI Init: Setting controls.enabled = true'); // DEBUG
        this.editor.setEnabled(false);
        this.app.controls.enabled = true;
        console.log('UI Init: controls.enabled is now', this.app.controls.enabled); // DEBUG

        this.initToasts();
        this.initSidebar();
        this.initZoomControls();
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
            this.sidebar.innerHTML = '<div class="p-4 text-sm text-gray-400">No active floor</div>';
            return;
        }

        const title = document.createElement('h3');
        title.className = 'text-sm font-bold p-2 mb-2 border-b border-white/10';
        title.textContent = `Lights (${currentFloor.lights.length})`;
        this.sidebar.appendChild(title);

        if (currentFloor.lights.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-sm text-center p-4 text-gray-400';
            empty.textContent = "No lights on this floor";
            this.sidebar.appendChild(empty);
            // return; // Don't return, might want to show other things later
        }

        currentFloor.lights.forEach(light => {
            const card = this.createLightCard(light, currentFloor);
            this.sidebar.appendChild(card);
        });
    }

    renderCubeProperties(mesh) {
        const cube = mesh.userData.obj;
        const currentFloor = this.editor.getCurrentFloor();
        if (!currentFloor) return;

        const container = document.createElement('div');
        container.className = 'p-6 flex flex-col gap-12'; // More spacing, removed bottom padding

        // Header: Name + Close + Delete
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between gap-2';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'input-glass flex-grow';
        nameInput.style.fontWeight = '500'; // Medium weight
        nameInput.style.fontSize = '15px';
        nameInput.value = cube.name || 'Untitled Cube';
        nameInput.onchange = (e) => {
            cube.name = e.target.value;
            this.editor.refresh();
        };
        header.appendChild(nameInput);

        // Delete (Trash icon)
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn text-red-500/70 hover:text-red-500 transition-colors p-2';
        delBtn.innerHTML = '🗑️';
        delBtn.style.fontSize = '18px';
        delBtn.title = 'Delete Cube';
        delBtn.onclick = () => {
            this.editor.deleteObject(mesh.userData);
            this.editor.selectedObject = null;
            this.updateSidebar();
        };
        header.appendChild(delBtn);
        container.appendChild(header);

        // Position X / Z (Inputs like lights)
        const posRow = document.createElement('div');
        posRow.className = 'flex gap-2';

        const createPosInput = (axis, label) => {
            const wrap = document.createElement('div');
            wrap.className = 'flex items-center gap-2 flex-1';
            const lbl = document.createElement('span');
            lbl.className = 'text-xs text-gray-500 font-medium';
            lbl.textContent = label;
            wrap.appendChild(lbl);

            const inp = document.createElement('input');
            inp.type = 'number';
            inp.step = '0.1';
            inp.className = 'input-glass';
            inp.style.width = '60px';
            inp.value = cube.position[axis].toFixed(1);
            inp.onchange = (e) => {
                cube.position[axis] = parseFloat(e.target.value);
                this.editor.refresh();
            };
            wrap.appendChild(inp);
            return wrap;
        };
        posRow.appendChild(createPosInput('x', 'X'));
        posRow.appendChild(createPosInput('z', 'Z'));

        const posGroup = document.createElement('div');
        posGroup.className = 'flex flex-col gap-10'; // Increased spacing between settings
        const posHeader = document.createElement('div');
        posHeader.className = 'text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-8 border-b border-white/20 pb-2'; // Thinner font, stronger line
        posHeader.textContent = 'Placement';
        posGroup.appendChild(posHeader);
        posGroup.appendChild(posRow);

        container.appendChild(posGroup);

        // Properties section
        const propsCol = document.createElement('div');
        propsCol.className = 'flex flex-col gap-16'; // Even more spacing between setting groups

        // Helper for sliders
        const createSliderRow = (label, value, min, max, step, onChange) => {
            const row = document.createElement('div');
            row.className = 'flex flex-col gap-6 py-4'; // Extra vertical space

            // Subtle horizontal break
            const hr = document.createElement('div');
            hr.className = 'h-px w-full bg-white/10 mb-6';
            row.appendChild(hr);

            const labelRow = document.createElement('div');
            labelRow.className = 'flex justify-between items-center';
            const lbl = document.createElement('span');
            lbl.className = 'text-[10px] uppercase tracking-widest text-gray-500 font-normal'; // Thinner text
            lbl.textContent = label;
            labelRow.appendChild(lbl);

            const valSpan = document.createElement('span');
            valSpan.className = 'text-xs text-blue-400 font-mono opacity-80';
            valSpan.textContent = value.toFixed(1);
            labelRow.appendChild(valSpan);
            row.appendChild(labelRow);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;
            slider.className = 'form-range w-full';
            slider.oninput = (e) => {
                const val = parseFloat(e.target.value);
                valSpan.textContent = val.toFixed(1);
                onChange(val);
                this.editor.refresh();
            };
            row.appendChild(slider);
            return row;
        };

        // Height (Y Position)
        const floorY = currentFloor.level * 2.5;
        posGroup.appendChild(createSliderRow('Elevation', cube.position.y - floorY, 0, 10, 0.1, (val) => {
            cube.position.y = floorY + val;
        }));

        // Dimensions Group
        const dimGroup = document.createElement('div');
        dimGroup.className = 'flex flex-col gap-10'; // Increased spacing between settings
        const dimHeader = document.createElement('div');
        dimHeader.className = 'text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-8 border-b border-white/20 pb-2'; // Thinner
        dimHeader.textContent = 'Dimensions';
        dimGroup.appendChild(dimHeader);
        dimGroup.appendChild(createSliderRow('Width', cube.size.x, 0.1, 10, 0.1, (val) => {
            cube.size.x = val;
        }));
        dimGroup.appendChild(createSliderRow('Height', cube.size.y, 0.1, 10, 0.1, (val) => {
            cube.size.y = val;
        }));
        dimGroup.appendChild(createSliderRow('Depth', cube.size.z, 0.1, 10, 0.1, (val) => {
            cube.size.z = val;
        }));
        propsCol.appendChild(dimGroup);

        // Rotation
        const rotGroup = document.createElement('div');
        rotGroup.className = 'flex flex-col gap-6';
        const rotHeader = document.createElement('div');
        rotHeader.className = 'text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-8 border-b border-white/20 pb-2'; // Thinner
        rotHeader.textContent = 'Rotation';
        rotGroup.appendChild(rotHeader);
        rotGroup.appendChild(createSliderRow('Angle', cube.rotation, 0, Math.PI * 2, 0.1, (val) => {
            cube.rotation = val;
        }));
        propsCol.appendChild(rotGroup);

        container.appendChild(propsCol);

        // Color Group (Redesigned to match others)
        const colorGroup = document.createElement('div');
        colorGroup.className = 'flex flex-col gap-10'; // Increased spacing

        const colorHeader = document.createElement('div');
        colorHeader.className = 'text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-8 border-b border-white/20 pb-2'; // Thinner + stronger line
        colorHeader.textContent = 'Appearance';
        colorGroup.appendChild(colorHeader);

        const colorRow = document.createElement('div');
        colorRow.className = 'flex items-center justify-between px-1';

        // Add a line before color picker too
        const colorHr = document.createElement('div');
        colorHr.className = 'h-px w-full bg-white/10 mb-6';
        colorGroup.appendChild(colorHr);

        const colorLabel = document.createElement('span');
        colorLabel.className = 'text-[10px] uppercase tracking-widest text-gray-500 font-normal';
        colorLabel.textContent = 'Surface Color';
        colorRow.appendChild(colorLabel);

        const colorPickerWrap = document.createElement('div');
        colorPickerWrap.className = 'color-picker';
        colorPickerWrap.style.width = '28px';
        colorPickerWrap.style.height = '28px';
        colorPickerWrap.style.background = cube.color;
        colorPickerWrap.style.borderRadius = '50%';
        colorPickerWrap.style.border = '2px solid rgba(255,255,255,0.2)';

        const colorInp = document.createElement('input');
        colorInp.type = 'color';
        colorInp.value = cube.color;
        colorInp.style.opacity = '0';
        colorInp.style.width = '100%';
        colorInp.style.height = '100%';
        colorInp.style.cursor = 'pointer';
        colorInp.oninput = (e) => {
            cube.color = e.target.value;
            colorPickerWrap.style.background = e.target.value;
            this.editor.refresh();
        };
        colorPickerWrap.appendChild(colorInp);
        colorRow.appendChild(colorPickerWrap);
        colorGroup.appendChild(colorRow);

        propsCol.appendChild(colorGroup);
        container.appendChild(propsCol);

        this.cubeSidebar.appendChild(container);
    }

    createLightCard(light, floor) {
        const card = document.createElement('div');
        card.className = 'light-card';

        // Header: Name + Toggle + Delete
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between gap-2 mb-2';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'input-glass font-bold flex-grow';
        nameInput.style.textAlign = 'left'; // Override center align for name
        nameInput.value = light.name || 'Light';
        nameInput.onchange = (e) => {
            light.name = e.target.value;
            this.editor.refresh();
        };
        header.appendChild(nameInput);

        // Toggle Switch
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'toggle';
        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = light.state.on;
        toggleInput.onchange = (e) => {
            light.state.on = e.target.checked;
            this.editor.refresh();
        };
        const toggleSpan = document.createElement('span');
        toggleSpan.className = 'slider';
        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(toggleSpan);
        header.appendChild(toggleLabel);

        // Delete
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn text-red-400 hover:text-red-300';
        delBtn.innerHTML = '×';
        delBtn.title = 'Remove Light';
        delBtn.onclick = () => {
            // Use Editor's delete logic to ensure clean removal
            this.editor.deleteObject({ type: 'light', id: light.id, floorId: floor.id });
            this.updateSidebar();
        };
        header.appendChild(delBtn);

        card.appendChild(header);

        // Position X / Z
        const posRow = document.createElement('div');
        posRow.className = 'flex gap-2 mb-2';

        const createPosInput = (axis, label) => {
            const wrap = document.createElement('div');
            wrap.className = 'flex items-center gap-2'; // Increased gap

            const lbl = document.createElement('span');
            lbl.className = 'text-xs text-gray-400 w-3 font-bold';
            lbl.textContent = label;
            wrap.appendChild(lbl);

            const inp = document.createElement('input');
            inp.type = 'number';
            inp.step = '0.1';
            // Frosted glass input style
            inp.className = 'input-glass';
            inp.style.width = '50px';
            inp.value = light.position[axis].toFixed(1);
            inp.onchange = (e) => {
                light.position[axis] = parseFloat(e.target.value);
                this.editor.refresh();
            };
            wrap.appendChild(inp);
            return wrap;
        };

        posRow.appendChild(createPosInput('x', 'X'));
        posRow.appendChild(createPosInput('z', 'Z'));
        card.appendChild(posRow);

        // Properties: Height + Brightness
        const propsCol = document.createElement('div');
        propsCol.className = 'flex flex-col gap-2 mb-2';

        // Height
        const heightRow = document.createElement('div');
        heightRow.className = 'flex items-center gap-2';
        const heightLabel = document.createElement('div');
        heightLabel.className = 'text-xs text-gray-400 w-4';
        heightLabel.textContent = 'H';
        heightRow.appendChild(heightLabel);

        const heightSlider = document.createElement('input');
        heightSlider.type = 'range';
        heightSlider.min = '0';
        heightSlider.max = '2.5';
        heightSlider.step = '0.1';
        const floorY = floor.level * 2.5;
        heightSlider.value = (light.position.y - floorY).toFixed(1);
        heightSlider.className = 'form-range flex-grow';
        heightSlider.oninput = (e) => {
            const relY = parseFloat(e.target.value);
            light.position.y = floorY + relY;
            this.editor.refresh();
        };
        heightRow.appendChild(heightSlider);
        propsCol.appendChild(heightRow);

        // Brightness
        const briRow = document.createElement('div');
        briRow.className = 'flex items-center gap-2';
        const briLabel = document.createElement('div');
        briLabel.className = 'text-xs text-gray-400 w-4';
        briLabel.textContent = 'B';
        briRow.appendChild(briLabel);

        const briSlider = document.createElement('input');
        briSlider.type = 'range';
        briSlider.min = '0';
        briSlider.max = '5';
        briSlider.step = '0.1';
        briSlider.value = light.state.intensity || 1.0;
        briSlider.className = 'form-range flex-grow';
        briSlider.oninput = (e) => {
            light.state.intensity = parseFloat(e.target.value);
            this.editor.refresh();
        };
        briRow.appendChild(briSlider);
        propsCol.appendChild(briRow);

        card.appendChild(propsCol);

        // Color Picker (Separate Row)
        const colorRow = document.createElement('div');
        colorRow.className = 'flex items-center gap-4';

        const colorLabel = document.createElement('span');
        colorLabel.className = 'text-xs text-gray-400 font-bold';
        colorLabel.style.marginRight = '16px'; // Force spacing with inline style
        colorLabel.textContent = 'Color';
        colorRow.appendChild(colorLabel);

        const colorWrapper = document.createElement('div');
        colorWrapper.className = 'color-picker';
        colorWrapper.style.backgroundColor = light.state.color;

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = light.state.color;
        colorInput.oninput = (e) => {
            light.state.color = e.target.value;
            colorWrapper.style.backgroundColor = e.target.value;
            this.editor.refresh();
        };
        colorWrapper.appendChild(colorInput);
        colorRow.appendChild(colorWrapper);

        card.appendChild(colorRow);

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
                .file-list { flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; padding-right: 4px; max-height: 400px; }
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
}
