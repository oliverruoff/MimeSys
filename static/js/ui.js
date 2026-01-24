export class UI {
    constructor(app) {
        this.app = app;
        this.editor = app.editor;
        this.smartWallsEnabled = false;

        this.container = document.createElement('div');
        this.container.className = 'glass absolute bottom-4 left-1/2 transform -translate-x-1/2 p-2 rounded-lg flex flex-wrap gap-2 justify-center max-w-4xl z-10';
        document.body.appendChild(this.container);

        this.createButton('New Home', async () => {
            if (confirm('Create new home? Unsaved changes will be lost.')) {
                await fetch('/api/homes/reset', { method: 'POST' });
                window.location.reload();
            }
        });

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

        this.createButton('Add Window', () => {
            this.editor.setEnabled(true);
            this.editor.setMode('window');
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
        this.updateSidebar();
    }

    updateSidebar() {
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
            return;
        }

        currentFloor.lights.forEach(light => {
            const card = this.createLightCard(light, currentFloor);
            this.sidebar.appendChild(card);
        });
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
}
