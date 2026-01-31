# MimeSys Digital Twin Sync - Home Assistant Integration

This Home Assistant integration automatically syncs your real smart home light states with your MimeSys 3D Digital Twin, creating a live visualization of your home's lighting.

## Features

- Real-time light state synchronization (on/off, brightness, color)
- Automatic updates when you control lights through Home Assistant
- Support for RGB color lights
- Simple configuration through Home Assistant UI
- Works with the MimeSys addon or standalone deployment

## Prerequisites

1. **MimeSys Backend Running**: You need the MimeSys addon installed and running in Home Assistant, OR the MimeSys API accessible on your network
2. **Matching Light Names**: The light names in your MimeSys 3D model must match the entity names you'll map

## Installation

### Method 1: Manual Installation

1. Copy the `custom_components/mimesys_sync` folder to your Home Assistant `config/custom_components/` directory:
   ```
   config/
     custom_components/
       mimesys_sync/
         __init__.py
         config_flow.py
         const.py
         manifest.json
   ```

2. Restart Home Assistant

3. Go to **Settings** → **Devices & Services** → **Add Integration**

4. Search for "MimeSys Digital Twin Sync" and click to add it

### Method 2: HACS Installation (Future)

Coming soon - this integration will be available through HACS.

## Configuration

### Step 1: API URL

When adding the integration, enter your MimeSys API URL:

- If using the addon: `http://localhost:8000` or `http://homeassistant.local:8000`
- If using external deployment: `http://YOUR_SERVER_IP:8000`

### Step 2: Entity Mappings

Map your MimeSys light names to Home Assistant entity IDs using this format:

```
Light Name in MimeSys = entity_id
```

**Example:**
```
Living Room = light.living_room_main
Kitchen = light.kitchen_ceiling
Bedroom = light.bedroom_lamp
Office Desk = light.office_desk_light
```

**Important Notes:**
- Light names on the left must EXACTLY match the names you used in the MimeSys 3D editor
- Entity IDs on the right must be valid Home Assistant light entities
- One mapping per line
- Use `=` to separate the light name from the entity ID

## How It Works

1. The integration listens for state changes on all mapped light entities
2. When a light state changes (on/off, brightness, color), it sends the update to the MimeSys API
3. The MimeSys 3D model automatically updates to reflect the new state
4. Changes happen in real-time, whether you control lights via:
   - Home Assistant UI
   - Voice assistants (Alexa, Google Assistant, etc.)
   - Automations
   - Physical switches (that report back to HA)

## Setting Up Your Lights in MimeSys

Before using this integration, make sure you've:

1. Opened the MimeSys editor (Edit mode)
2. Added lights to your 3D model using the "Add Light" tool
3. Named each light in the sidebar to match your Home Assistant entity names

**Example:**

If you have a Home Assistant entity `light.living_room_main`, create a light in MimeSys and name it exactly `living_room_main` (or whatever name you prefer, just be consistent in the mapping).

## Troubleshooting

### Lights not syncing

1. **Check the logs**: Go to **Settings** → **System** → **Logs** and search for `mimesys_sync`
2. **Verify API connection**: Make sure the MimeSys API URL is accessible from Home Assistant
3. **Check light names**: Ensure the light names in MimeSys exactly match the names in your entity mappings
4. **Verify entity IDs**: Make sure the entity IDs exist in Home Assistant

### Testing the integration

1. Turn a mapped light on/off in Home Assistant
2. Open the MimeSys showcase view: `http://YOUR_HA:8000/showcase`
3. You should see the light state update in the 3D model

### Reconfiguring mappings

1. Go to **Settings** → **Devices & Services**
2. Find "MimeSys Digital Twin Sync"
3. Click **Configure**
4. Update your mappings or API URL

## Example Configuration

Here's a complete example configuration:

**API URL:**
```
http://localhost:8000
```

**Entity Mappings:**
```
Living Room = light.living_room_ceiling
Kitchen = light.kitchen_main
Bedroom = light.bedroom_overhead
Bathroom = light.bathroom_vanity
Hallway = light.hallway_lights
Garage = light.garage_light
```

## API Details

This integration uses the MimeSys `/api/control/lights` endpoint. The API expects:

```json
[
  {
    "name": "Light Name",
    "on": true,
    "brightness": 75,
    "color": [255, 200, 100]
  }
]
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/oliverruoff/MimeSys/issues
- Documentation: https://github.com/oliverruoff/MimeSys

## License

This integration is part of the MimeSys project.
