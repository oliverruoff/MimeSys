# MimeSys Digital Twin Sync

Sync your Home Assistant lights with your MimeSys 3D Digital Twin in real-time!

## Features

✨ **Real-time synchronization** - Lights update instantly in your 3D model when toggled on/off
🎨 **Full color support** - Syncs brightness and RGB colors
🏠 **Super simple setup** - Just select which lights to sync, no manual mapping needed
🔌 **Works with everything** - Voice assistants, automations, physical switches

## Quick Start

1. **Install the integration** via HACS
2. **Configure**:
   - API URL: `http://localhost:8000` (if using MimeSys addon)
   - Select the light entities you want to sync
3. **Done!** The entity ID is automatically used as the light name in MimeSys

## Important

Make sure your lights in the MimeSys 3D editor are named exactly like your Home Assistant entity IDs.

**Example:**
- Home Assistant entity: `light.living_room`
- MimeSys light name: `light.living_room`

The integration will automatically match them!

## Support

For detailed instructions and troubleshooting, see the [full documentation](https://github.com/oliverruoff/MimeSys/blob/main/custom_components/mimesys_sync/README.md).

**Issues?** Report them at https://github.com/oliverruoff/MimeSys/issues
