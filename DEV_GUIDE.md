# Local Development Guide

## Quick Start

```bash
# Option 1: Use the dev script
./dev.sh

# Option 2: Manual start
cd backend
python main.py
```

Then open: http://localhost:8000

## Important: Browser Caching Issue

**Problem**: Browser caches JavaScript files, so you see old code even after updates.

**Solution**: Always do a **Hard Refresh** after pulling code updates:
- **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`
- **Or**: Open DevTools (F12) → Network tab → Enable "Disable cache"

## Troubleshooting

### "File upload button is missing"
- **Cause**: Browser is showing cached old version
- **Fix**: Hard refresh (Ctrl+Shift+R)

### "Can't place lights/cubes by clicking"
- **Cause**: Browser is showing cached old JavaScript
- **Fix**: Hard refresh (Ctrl+Shift+R)

### "Wrong directory" errors
- **Cause**: Running from root instead of backend/
- **Fix**: Always run from backend directory: `cd backend && python main.py`

## Development Features

- **Hot Reload**: Python code changes auto-restart server
- **Port**: 8000
- **Data**: Saves stored in `../saves/` (one level up from backend)

## Testing Changes

1. Make code changes
2. Python changes: Auto-reload (just refresh browser normally)
3. JavaScript/CSS changes: **MUST hard refresh** (Ctrl+Shift+R)
4. HTML changes: **MUST hard refresh** (Ctrl+Shift+R)

## Comparing to Production

If you see different behavior between local and Home Assistant:
1. Check if you're using the latest code (`git pull`)
2. Hard refresh your browser
3. Check browser console (F12) for errors
4. Verify you're in the backend directory
