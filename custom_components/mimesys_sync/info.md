# MimeSys Digital Twin Sync

Sync your Home Assistant lights with your MimeSys 3D Digital Twin in real-time!

## Features

✨ **Real-time synchronization** - Lights update instantly in your 3D model
🎨 **Full color support** - Syncs brightness and RGB colors
🏠 **Easy setup** - Simple UI configuration through Home Assistant
🔌 **Works with everything** - Voice assistants, automations, physical switches

## Quick Start

1. **Install the integration** via HACS
2. **Configure API URL**: `http://localhost:8000` (if using MimeSys addon)
3. **Map your lights** using simple text format:
   ```
   Living Room = light.living_room_main
   Kitchen = light.kitchen_ceiling
   Bedroom = light.bedroom_lamp
   ```
4. **Done!** Your 3D model now reflects real-time light states

## Prerequisites

- MimeSys addon installed and running (or standalone deployment)
- Lights created in MimeSys 3D editor
- Light names in MimeSys should match your mapping configuration

## How It Works

The integration listens for Home Assistant light state changes and automatically sends updates to your MimeSys API. Any light control (UI, voice, automation, or physical switch) instantly reflects in your 3D visualization.

## Support

For detailed instructions and troubleshooting, see the [full documentation](https://github.com/oliverruoff/MimeSys/blob/main/custom_components/mimesys_sync/README.md).

**Issues?** Report them at https://github.com/oliverruoff/MimeSys/issues
