# MimeSys Digital Twin Sync - Home Assistant Integration

This Home Assistant integration automatically syncs your real smart home light and switch states with your MimeSys 3D Digital Twin, creating a live visualization of your home's lighting.

## Screenshot

![MimeSys 3D Home Visualization](../Mimesys.gif)

## Features

- Real-time light and switch state synchronization (on/off, brightness, color)
- Automatic updates when you control lights or switches through Home Assistant
- Support for RGB color lights
- Support for switch entities (displayed as lights in 3D)
- Simple configuration through Home Assistant UI
- Works with the MimeSys addon or standalone deployment

## Prerequisites

1. **MimeSys Backend Running**: You need the MimeSys addon installed and running in Home Assistant, OR the MimeSys API accessible on your network
2. **Matching Light Names**: The light names in your MimeSys 3D model must **exactly match** your Home Assistant entity IDs

## Installation via HACS

1. Open **HACS** in Home Assistant
2. Go to **Integrations**
3. Click the **3-dot menu** → **Custom repositories**
4. Add repository URL: `https://github.com/oliverruoff/MimeSys`
5. Select category: **Integration**
6. Click **Add**
7. Search for **"MimeSys Digital Twin Sync"**
8. Click **Download**
9. **Restart Home Assistant**
10. Go to **Settings** → **Devices & Services** → **Add Integration**
11. Search for **"MimeSys Digital Twin Sync"** and configure

## Configuration

### Step 1: API URL

Enter your MimeSys API URL:

- If using the addon: `http://localhost:8000`
- If using external deployment: `http://YOUR_SERVER_IP:8000`

### Step 2: Select Entities

Select the light or switch entities you want to sync from the dropdown list. The entity ID will automatically be used as the light name in MimeSys.

**Examples:**
- You select: `light.eg_flur_licht` → Light entity
- You select: `switch.garden_lights` → Switch entity (will control a light in MimeSys)
- The integration will send these entity IDs to MimeSys
- Your lights in MimeSys must be named exactly the same

**Why switches?** Many users control lights through switch entities (e.g., smart plugs, relay switches). The integration treats these as lights in the 3D model.

## Setting Up Your Lights in MimeSys

**CRITICAL:** Light names in MimeSys must match your Home Assistant entity IDs **exactly** (including switches if you're syncing them).

### Steps:

1. **Open the MimeSys editor** (Edit mode)
2. **Add lights** to your 3D model using the "Add Light" tool
3. **Name each light** in the sidebar to match your HA entity ID **exactly**

### Examples:

If you have these Home Assistant entities:
- `light.eg_flur_licht` (light entity)
- `light.living_room` (light entity)
- `switch.garden_lights` (switch entity controlling lights)
- `switch.porch_lamp` (switch entity)

Then name your MimeSys lights:
- `light.eg_flur_licht` ✅
- `light.living_room` ✅
- `switch.garden_lights` ✅
- `switch.porch_lamp` ✅

**Not:**
- `Flur Licht` ❌
- `Living Room` ❌
- `Garden Lights` ❌ (missing "switch." prefix)
- `Porch Lamp` ❌

## How It Works

1. The integration listens for state changes on your selected light and switch entities
2. When a light/switch turns on or off, it sends the update to the MimeSys API
3. For lights: brightness and color are included
4. For switches: full brightness and white color are used (switches don't have these attributes)
5. The MimeSys API matches the entity ID to the light name
6. The 3D model updates in real-time

## Troubleshooting

### Lights not syncing

**Check the logs:**
1. Go to **Settings** → **System** → **Logs**
2. Search for `mimesys_sync`
3. Look for messages like:
   - `✓ Successfully synced` - Working!
   - `⚠ no lights were updated` - Name mismatch!
   - `✗ Failed to sync` - API connection issue

**If you see "no lights were updated":**
- This means the API call worked but couldn't find a matching light
- Check that the light name in MimeSys **exactly** matches the entity ID
- Remember: `light.eg_flur_licht` ≠ `Flur Licht`

**Verify API connection:**
```bash
curl http://localhost:8000/api/homes
```

**Test the API manually:**
```bash
curl -X POST http://localhost:8000/api/control/lights \
  -H "Content-Type: application/json" \
  -d '[{"name": "light.eg_flur_licht", "on": true, "brightness": 100, "color": [255, 255, 255]}]'
```

### Reconfiguring

1. Go to **Settings** → **Devices & Services**
2. Find "MimeSys Digital Twin Sync"
3. Click the **gear icon** (Configure)
4. Update entities or API URL
5. The integration will reload automatically

## Example Configuration

**Home Assistant:**
- Entity: `light.eg_flur_licht` (light)
- Entity: `light.living_room_main` (light)
- Entity: `switch.bedroom_lamp` (switch)
- Entity: `switch.garden_lights` (switch)

**MimeSys Editor:**
- Light name: `light.eg_flur_licht`
- Light name: `light.living_room_main`
- Light name: `switch.bedroom_lamp`
- Light name: `switch.garden_lights`

**Integration Config:**
- API URL: `http://localhost:8000`
- Selected entities: All four entities from the dropdown

**Result:** When you toggle any of these lights or switches in Home Assistant, the 3D model updates instantly!

## Support

For issues or questions:
- GitHub Issues: https://github.com/oliverruoff/MimeSys/issues
- Documentation: https://github.com/oliverruoff/MimeSys

## License

This integration is part of the MimeSys project.
