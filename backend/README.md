# 3D Home Digital Twin

A powerful web-based 3D home visualization and design tool that lets you create interactive floor plans with multiple floors, walls, lights, and objects. Perfect for home automation visualization, interior design planning, and smart home management.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-addon-blue.svg)

## Screenshot

![MimeSys 3D Home Visualization](../Mimesys.gif)

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Quick Start](#quick-start)
- [Installation](#installation)
  - [Docker Deployment](#docker-deployment)
  - [Home Assistant Addon](#home-assistant-addon)
  - [Manual Installation](#manual-installation)
- [Usage Guide](#usage-guide)
  - [Editor Mode](#editor-mode)
  - [View Mode](#view-mode)
  - [Showcase Mode](#showcase-mode)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)
- [Home Assistant Integration](#home-assistant-integration)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### 🏗️ **3D Floor Planning**
- **Multi-Floor Support**: Create unlimited floors with independent floor plans
- **Custom Floor Shapes**: Draw custom polygonal floor layouts with point-and-click interface
- **Interactive 3D View**: Real-time Three.js rendering with smooth camera controls
- **Floor Navigation**: Easy floor switching with animated transitions in showcase mode

### 🧱 **Building Elements**
- **Walls**: Add walls by clicking two points, with live measurement display
- **Lights**: Place interactive lights with customizable properties:
  - Toggle on/off
  - Adjustable brightness (0-100%)
  - RGB color picker
  - Position controls (X, Z, height)
- **Cubes/Objects**: Add 3D objects with full customization:
  - Size (width, height, depth)
  - Position (X, Y, Z)
  - Rotation (360°)
  - Color picker
  - Custom naming

### 🎨 **Smart Features**
- **Smart Walls**: Automatically lower walls and objects that block the camera view for better visibility
- **Smooth Animations**: Floor transitions animate smoothly in showcase mode
- **Real-time Updates**: Light states sync in real-time (1-second polling)
- **Auto-Save System**: Save/load multiple project files

### 🎮 **User Interface**
- **Editor Mode**: Full editing capabilities with tool selection
- **View Mode**: Navigate and inspect without editing
- **Showcase Mode**: Automatic camera orbit with floor cycling for presentations
- **Property Panels**: 
  - Right sidebar for lights management
  - Left sidebar for cube/object properties
  - Collapsible sections for clean workspace
- **Undo/Redo**: Full undo support for all operations
- **Delete Mode**: Click to delete with red hover highlight

### 📱 **Responsive Design**
- Works on desktop, tablet, and mobile devices
- Portrait and landscape orientation support
- Touch-friendly controls

### 🔌 **Integration Ready**
- RESTful API for external control
- Home Assistant addon available
- Light control API for automation
- Save/load functionality via API

---

## Demo

**Editor Mode** - Design your home layout:
- Click "Add Wall" and click two points to create walls
- Use "Add Light" to place controllable lights
- "Add Cube" to place furniture and objects
- "Add Ground" to draw custom floor shapes

**View Mode** - Explore your creation:
- Rotate: Left mouse drag
- Pan: Right mouse drag
- Zoom: Mouse wheel or zoom controls
- Click objects to inspect properties

**Showcase Mode** (`/showcase`):
- Automatic camera orbit around your home
- Floors appear/disappear with smooth animations
- Lights reflect real-time state
- Perfect for presentations or digital signage

---

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/oliverruoff/MimeSys.git
cd MimeSys

# Start with Docker Compose
docker-compose up -d

# Access the application
open http://localhost:8000
```

### Using Quick Start Script

```bash
# Clone and start in one command
git clone https://github.com/oliverruoff/MimeSys.git
cd MimeSys
chmod +x start.sh
./start.sh
```

---

## Installation

### Docker Deployment

#### Option 1: Docker Compose (Recommended)

1. Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  home-digital-twin:
    image: ghcr.io/oliverruoff/mimesys:latest
    container_name: home-digital-twin
    ports:
      - "8000:8000"
    volumes:
      - ./saves:/app/saves
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/"]
      interval: 30s
      timeout: 10s
      retries: 3
```

2. Start the container:
```bash
docker-compose up -d
```

#### Option 2: Docker Run

```bash
docker run -d \
  --name home-digital-twin \
  -p 8000:8000 \
  -v $(pwd)/saves:/app/saves \
  --restart unless-stopped \
  ghcr.io/oliverruoff/mimesys:latest
```

#### Option 3: Build from Source

```bash
# Clone repository
git clone https://github.com/oliverruoff/MimeSys.git
cd MimeSys

# Build image
docker build -t home-digital-twin .

# Run container
docker run -d -p 8000:8000 -v $(pwd)/saves:/app/saves home-digital-twin
```

### Home Assistant Addon

The 3D Home Digital Twin can be installed as a Home Assistant addon, allowing it to run directly within your Home Assistant instance with full integration support.

#### Installation Steps

1. **Add the Repository to Home Assistant**:
   - Open Home Assistant
   - Navigate to **Settings** → **Add-ons** → **Add-on Store**
   - Click the **⋮** menu (three dots) in the top right
   - Select **Repositories**
   - Add this repository URL:
     ```
     https://github.com/oliverruoff/MimeSys
     ```
   - Click **Add**

2. **Install the Addon**:
   - Refresh the Add-on Store page
   - Find "3D Home Digital Twin" in the list
   - Click on it and then click **Install**
   - Wait for the installation to complete

3. **Configure the Addon** (Optional):
   - After installation, go to the **Configuration** tab
   - Adjust settings if needed:
     ```yaml
     log_level: info
     ```
   - Available log levels: `debug`, `info`, `warning`, `error`

4. **Start the Addon**:
   - Go to the **Info** tab
   - Click **Start**
   - Enable **Start on boot** if you want it to start automatically
   - Enable **Watchdog** for automatic restart on failure

5. **Access the Application**:
   - Click **Open Web UI** button in the addon info page
   - Or access via: `http://homeassistant.local:8000`
   - Or use the Home Assistant Ingress panel (if configured)

#### Addon Features

- **Full Integration**: Runs natively within Home Assistant
- **Automatic Updates**: Update through the Home Assistant UI
- **Persistent Storage**: Data is stored in Home Assistant's addon data directory
- **Multi-Architecture**: Supports `aarch64`, `amd64`, `armhf`, `armv7`, `i386`
- **Health Monitoring**: Home Assistant monitors the addon's health
- **Ingress Support**: Optional panel integration with Home Assistant UI

#### Configuration Options

The addon supports the following configuration options in the **Configuration** tab:

```yaml
log_level: info  # Options: debug, info, warning, error
```

#### Data Persistence

All your saved home designs are stored in:
```
/data/saves/
```

This directory persists across addon restarts and updates.

#### Troubleshooting

**Addon won't start:**
- Check the **Log** tab for error messages
- Ensure port 8000 is not used by another addon
- Verify your Home Assistant version is up to date

**Can't access the Web UI:**
- Make sure the addon is running (green indicator)
- Check your network configuration
- Try accessing via `http://[homeassistant-ip]:8000`

**Data not persisting:**
- Ensure you're using the **Save** button in the application
- Check addon logs for file system errors
- Verify addon has write permissions to `/data/saves/`

#### Updating the Addon

1. Go to **Settings** → **Add-ons**
2. Find "3D Home Digital Twin"
3. If an update is available, click **Update**
4. The addon will update and restart automatically

### Manual Installation

#### Prerequisites
- Python 3.11+
- Node.js (for Three.js dependencies via CDN)

#### Steps

1. **Clone the repository**:
```bash
git clone https://github.com/oliverruoff/MimeSys.git
cd MimeSys
```

2. **Install Python dependencies**:
```bash
pip install -r requirements.txt
```

3. **Run the application**:
```bash
python main.py
```

4. **Access the application**:
- Open browser to `http://localhost:8000`
- Editor: `http://localhost:8000/`
- Showcase: `http://localhost:8000/showcase`

---

## Usage Guide

### Editor Mode

The main editing interface with full design capabilities.

#### Getting Started

1. **View Mode** (Default):
   - Navigate around with mouse controls
   - Click objects to inspect properties
   - No editing allowed

2. **Switch to Editing**:
   - Click mode buttons in the center toolbar

#### Main Toolbar (Center Bottom)

- **View**: Navigate-only mode, camera controls enabled
- **Add Wall**: Click two points to create a wall
  - Green preview shows while placing
  - Distance measurement displays at top
  - Press `Escape` to cancel current wall
- **Add Light**: Click to place a light sphere
  - Default: white, on, at ceiling height
- **Add Cube**: Click to place a 3D object
  - Default: 1×1×1 gray cube
- **Add Ground**: Draw custom floor shape
  - Click points to define polygon
  - Click near start point to close shape
  - Press `Enter` to finish
- **Delete**: Click objects to delete them
  - Hover shows red highlight
  - Works on walls, lights, and cubes
- **Smart Walls**: Toggle automatic wall lowering
  - ON: Walls/objects lower when blocking camera
  - OFF: All walls at full height
- **Undo**: Undo last operation

#### File Operations (Top Left)

- **Save**: Save current design to file
  - Prompts for filename
  - Auto-adds `.json` extension
- **Load**: Open file browser to load saved design
- **New Home**: Reset everything (with confirmation)
  - ⚠️ WARNING: Deletes current design

#### Floor Navigation (Bottom Left)

- **Floor +**: Add a new floor above current
- **▼**: Switch to floor below
- **Floor N**: Shows current active floor
- **▲**: Switch to floor above

#### Zoom Controls (Bottom Right)

- **+**: Zoom in closer
- **−**: Zoom out further

#### Properties Panels

**Right Sidebar - Lights** (minimizable):
- Shows all lights on current floor
- Per-light controls:
  - **Name**: Editable text field
  - **Toggle**: On/off switch
  - **Placement**: X, Z coordinates and height slider
  - **Brightness**: 0-5.0 intensity
  - **Color**: RGB color picker
  - **Delete**: 🗑️ button removes light

**Left Sidebar - Cube Properties** (appears when cube selected):
- Click any cube to open properties
- Controls:
  - **Name**: Editable identifier
  - **Placement**: X, Z position + elevation slider
  - **Dimensions**: Width, height, depth sliders
  - **Rotation**: 0-360° angle slider
  - **Color**: RGB color picker
  - **Delete**: 🗑️ button removes cube

#### Keyboard Shortcuts

- **Escape**: Cancel current tool operation
- **Enter**: Finish floor polygon (in Add Ground mode)

#### Camera Controls

- **Rotate**: Left mouse button + drag
- **Pan**: Right mouse button + drag
- **Zoom**: Mouse wheel scroll

### View Mode

Non-destructive exploration mode:
- All editing disabled
- Camera controls enabled
- Click objects to select and view properties
- Perfect for presentations or client reviews

### Showcase Mode

Automated presentation mode at `/showcase` endpoint.

**Features**:
- Automatic camera orbit around home center
- Smooth floor transitions (5-second intervals)
  - Floors expand from ground up
  - Floors shrink down when hidden
- Real-time light state updates
- Smart Walls automatically enabled
- Responsive camera positioning
  - Adjusts for portrait/landscape
  - Scales based on house size
- Infinite loop (ground floor → top → ground)

**Access**:
```
http://localhost:8000/showcase
```

**Use Cases**:
- Digital signage displays
- Client presentations
- Home automation demos
- Trade show exhibits

---

## API Documentation

### Base URL
```
http://localhost:8000/api
```

### Endpoints

#### Homes

**List all homes**:
```http
GET /api/homes
```

**Get specific home**:
```http
GET /api/homes/{home_id}
```

**Create new home**:
```http
POST /api/homes
Content-Type: application/json

{
  "name": "My Home",
  "floors": []
}
```

**Update home**:
```http
PUT /api/homes/{home_id}
Content-Type: application/json

{
  "id": "home-id",
  "name": "Updated Home",
  "floors": [...]
}
```

**Reset home** (delete all and create fresh):
```http
POST /api/homes/reset
```

#### Lights

**Update single light state**:
```http
PUT /api/homes/{home_id}/lights/{light_id}
Content-Type: application/json

{
  "on": true,
  "color": "#ff0000",
  "intensity": 1.5
}
```

**Control lights by name** (bulk operation):
```http
POST /api/control/lights
Content-Type: application/json

[
  {
    "name": "Kitchen Light",
    "on": true,
    "brightness": 80,
    "color": [255, 200, 100]
  }
]
```

Parameters:
- `name`: Light name (matches all lights with this name)
- `on`: Boolean, turn on/off
- `brightness`: 0-100 (maps to 0.0-5.0 intensity internally)
- `color`: RGB array `[r, g, b]` (0-255 each)

#### Home Assistant Integration

**Light control** (simplified HA endpoint):
```http
POST /api/ha/light/{light_id}/on
POST /api/ha/light/{light_id}/off
```

#### Save/Load

**List saved files**:
```http
GET /api/saves
```
Returns: `["default.json", "my-design.json", ...]`

**Load from file**:
```http
POST /api/saves/{filename}/load
```
Returns: Full home JSON

**Save to file**:
```http
POST /api/saves/{filename}
Content-Type: application/json

{
  "id": "home-id",
  "name": "My Home",
  "floors": [...]
}
```

### Data Models

**Home**:
```json
{
  "id": "uuid",
  "name": "Home Name",
  "floors": [Floor, ...]
}
```

**Floor**:
```json
{
  "id": "uuid",
  "level": 0,
  "name": "Ground Floor",
  "walls": [Wall, ...],
  "lights": [Light, ...],
  "cubes": [Cube, ...],
  "shape": [
    {"x": 0, "y": 0, "z": 0},
    {"x": 10, "y": 0, "z": 0},
    {"x": 10, "y": 0, "z": 10}
  ]
}
```

**Wall**:
```json
{
  "id": "uuid",
  "p1": {"x": 0, "y": 0, "z": 0},
  "p2": {"x": 5, "y": 0, "z": 0},
  "height": 2.5,
  "thickness": 0.2,
  "windows": []
}
```

**Light**:
```json
{
  "id": "uuid",
  "name": "Living Room Light",
  "position": {"x": 5, "y": 2.5, "z": 5},
  "state": {
    "on": true,
    "color": "#ffffff",
    "intensity": 1.0
  }
}
```

**Cube**:
```json
{
  "id": "uuid",
  "name": "Coffee Table",
  "position": {"x": 3, "y": 0.5, "z": 3},
  "rotation": 0.785,
  "size": {"x": 1.5, "y": 0.5, "z": 0.8},
  "color": "#8b4513"
}
```

---

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=8000                    # Server port (default: 8000)
HOST=0.0.0.0                # Bind address (default: 0.0.0.0)

# Data Storage
SAVES_DIR=./saves           # Directory for saved files
```

### Docker Configuration

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  home-digital-twin:
    image: ghcr.io/oliverruoff/mimesys:latest
    container_name: home-digital-twin
    ports:
      - "8000:8000"
    volumes:
      - ./saves:/app/saves              # Persistent storage
    environment:
      - PORT=8000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Home Assistant Integration

### Setup

1. **Install the Addon** (see [Home Assistant Addon](#home-assistant-addon) section)

2. **Add REST API Integration**:

Edit your Home Assistant `configuration.yaml`:

```yaml
# Light entity for each virtual light
light:
  - platform: rest
    name: "Virtual Living Room Light"
    resource: "http://localhost:8000/api/ha/light/LIGHT_ID_HERE/on"
    method: POST
    state_resource: "http://localhost:8000/api/homes/HOME_ID_HERE"
    value_template: >
      {% set lights = value_json.floors[0].lights %}
      {% set target = lights | selectattr('id', 'equalto', 'LIGHT_ID_HERE') | list %}
      {{ target[0].state.on if target else false }}
    
# Automation example
automation:
  - alias: "Turn on virtual lights at sunset"
    trigger:
      platform: sun
      event: sunset
    action:
      service: light.turn_on
      target:
        entity_id: light.virtual_living_room_light
```

3. **Bulk Light Control** (using RESTful command):

```yaml
rest_command:
  control_virtual_lights:
    url: "http://localhost:8000/api/control/lights"
    method: POST
    content_type: "application/json"
    payload: >
      [
        {
          "name": "{{ name }}",
          "on": {{ on }},
          "brightness": {{ brightness }},
          "color": [{{ r }}, {{ g }}, {{ b }}]
        }
      ]

# Usage in automation
automation:
  - alias: "Movie Mode"
    trigger:
      platform: state
      entity_id: input_boolean.movie_mode
      to: 'on'
    action:
      service: rest_command.control_virtual_lights
      data:
        name: "Living Room Light"
        on: "true"
        brightness: 20
        r: 100
        g: 50
        b: 200
```

### Features

- Control virtual lights from Home Assistant UI
- Visualize home layout in 3D
- Sync real lights with virtual representation
- Use in automations and scenes
- Dashboard integration with iframe card:

```yaml
# Lovelace card
type: iframe
url: http://localhost:8000/showcase
aspect_ratio: 16:9
```

---

## Development

### Tech Stack

**Backend**:
- FastAPI (Python 3.11)
- Pydantic for data models
- Uvicorn ASGI server

**Frontend**:
- Three.js for 3D rendering
- Vanilla JavaScript (ES6 modules)
- TailwindCSS for styling

### Project Structure

```
backend/
├── static/
│   ├── js/
│   │   ├── main.js           # Main editor app
│   │   ├── showcase.js       # Showcase mode
│   │   ├── home.js           # 3D rendering & Smart Walls
│   │   ├── editor.js         # Floor editing & tools
│   │   ├── ui.js             # UI components
│   │   ├── scene.js          # Three.js scene setup
│   │   └── controls.js       # Camera controls
│   ├── css/
│   │   └── styles.css        # Global styles
│   └── index.html            # Editor HTML
├── saves/                     # Saved design files
├── api.py                     # API routes
├── main.py                    # FastAPI app entry
├── models.py                  # Pydantic models
├── db.py                      # In-memory database
├── requirements.txt           # Python dependencies
└── Dockerfile                 # Docker image
```

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run with hot reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Access at http://localhost:8000
```

### Building Docker Image

```bash
# Build
docker build -t home-digital-twin .

# Run
docker run -p 8000:8000 home-digital-twin
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Keep commits atomic and descriptive

---

## Roadmap

- [ ] WebSocket support for real-time multi-user editing
- [ ] Import floor plans from images
- [ ] Export to various formats (OBJ, GLTF)
- [ ] VR/AR support
- [ ] More object types (doors, windows, furniture)
- [ ] Texture support for walls and floors
- [ ] Lighting presets
- [ ] Home Assistant sensor integration
- [ ] Mobile app (React Native)

---

## Troubleshooting

### Common Issues

**Port already in use**:
```bash
# Change port in docker-compose.yml or use:
docker run -p 8080:8000 home-digital-twin
```

**Saves not persisting**:
- Ensure volume is mounted correctly
- Check write permissions on `./saves` directory

**3D view not rendering**:
- Check browser console for WebGL errors
- Ensure WebGL is enabled in browser
- Try different browser (Chrome/Firefox recommended)

**API requests failing**:
- Check CORS settings if accessing from different origin
- Verify server is running: `curl http://localhost:8000/api/homes`

---

## License

MIT License - see [LICENSE](LICENSE) file for details

---

## Acknowledgments

- Three.js for 3D rendering
- FastAPI for backend framework
- Home Assistant community for integration ideas

---

## Support

- **Issues**: [GitHub Issues](https://github.com/oliverruoff/MimeSys/issues)
- **Discussions**: [GitHub Discussions](https://github.com/oliverruoff/MimeSys/discussions)
- **Documentation**: [Full Docs](https://github.com/oliverruoff/MimeSys/wiki)

---

## Screenshots

*(Add screenshots here showing different views and features)*

**Editor Mode**:
- Main interface with toolbars and property panels

**View Mode**:
- Camera navigation and object inspection

**Showcase Mode**:
- Automatic presentation with floor transitions

**Mobile View**:
- Touch controls and responsive layout

---

Made with ❤️ by [Oliver Ruoff](https://github.com/oliverruoff)
