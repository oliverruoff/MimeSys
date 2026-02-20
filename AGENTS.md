# Agent Guidelines for MimeSys

This document provides guidelines for agentic coding agents working on the MimeSys codebase.

## Project Overview

MimeSys is a Home Assistant custom component with a FastAPI backend that provides a digital twin visualization of homes. The project consists of:
- **Backend**: FastAPI server (`backend/`) - REST API with data models and persistence
- **Home Assistant Integration**: Custom component (`custom_components/mimesys_sync/`) - syncs HA entities to the backend

## Build, Lint, and Test Commands

### Backend Development

```bash
# Start backend server (from backend/ directory)
cd backend
python main.py

# Or use the dev script
./dev.sh

# Install dependencies
cd backend
pip install -r requirements.txt

# Run tests (if any)
cd backend
pytest

# Run a single test
pytest path/to/test_file.py::TestClass::test_method
```

### Home Assistant Integration

```bash
# The custom component is loaded from custom_components/mimesys_sync/
# Copy to Home Assistant config: /config/custom_components/mimesys_sync/

# Run tests (if any) - same as backend
cd backend
pytest
```

### Docker

```bash
# Build and run with Docker
docker build -t mimesys .
docker run -p 8000:8000 mimesys

# Or use docker-compose
docker-compose up
```

## Code Style Guidelines

### General Python Conventions

- **Python Version**: Python 3.x (target 3.10+)
- **Indentation**: 4 spaces
- **Line Length**: Maximum 120 characters (soft guideline)
- **File Encoding**: UTF-8
- **Newlines**: Unix-style (LF)

### Imports

- **Standard library first**, then third-party, then local
- Use absolute imports within packages
- Group imports: stdlib, third-party, local
- Sort alphabetically within groups

```python
# Correct
import json
import os
from glob import glob

import fastapi
import pydantic

from models import Home, Floor
from .const import DOMAIN
```

### Naming Conventions

- **Modules**: lowercase_with_underscores (snake_case)
- **Classes**: CamelCase (e.g., `MimeSysSyncHandler`)
- **Functions/variables**: snake_case (e.g., `get_homes()`, `home_id`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_API_URL`)
- **Private functions**: prefix with underscore (e.g., `_internal_func`)

### Type Hints

- Use type hints for function arguments and return values
- Use `Optional` from typing or `X | None` syntax (Python 3.10+)

```python
def get_home(home_id: str) -> Home | None:
    return homes_db.get(home_id)

def create_home(home: Home) -> Home:
    homes_db[home.id] = home
    return home
```

### Pydantic Models

- Use Pydantic v2 for data validation
- Use `BaseModel` from pydantic
- Define defaults inline

```python
from pydantic import BaseModel

class LightState(BaseModel):
    on: bool = False
    color: str = "#ffffff"
    intensity: float = 1.0
```

### FastAPI Endpoints

- Use `APIRouter` for grouping endpoints
- Always define `response_model` for endpoints that return data
- Use appropriate HTTP status codes (200, 201, 404, 500)
- Use `HTTPException` for error handling

```python
router = APIRouter()

@router.get("/homes/{home_id}", response_model=Home)
async def get_home(home_id: str):
    home = db.get_home(home_id)
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")
    return home
```

### Home Assistant Integration

- Follow HA integration standards
- Use `async_setup_entry`, `async_unload_entry` for config entries
- Use proper typing with HomeAssistant, ConfigEntry
- Follow HA logging conventions (`_LOGGER = logging.getLogger(__name__)`)

```python
_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up MimeSys Sync from a config entry."""
    # Implementation
    return True
```

### Error Handling

- Use try/except blocks for operations that can fail
- Log errors appropriately
- Return meaningful error messages

```python
try:
    with open(path, 'r') as f:
        data = json.load(f)
except json.JSONDecodeError as e:
    logger.error(f"Failed to parse JSON: {e}")
    return None
except Exception as e:
    logger.error(f"Failed to load: {e}")
    return None
```

### Logging

- Use the `logging` module
- Get logger at module level: `_LOGGER = logging.getLogger(__name__)`
- Use appropriate log levels: DEBUG, INFO, WARNING, ERROR
- Include context in log messages

```python
logger.info(f"Loaded home from: {filename}")
logger.warning(f"Save file not found: {path}")
logger.error(f"Failed to connect to API: {e}")
```

### Docstrings

- Use Google-style or simple docstrings for public functions
- Keep brief, focus on what the function does

```python
def get_home(home_id: str) -> Home | None:
    """Get a home by ID from the database."""
    return homes_db.get(home_id)
```

### Database/Persistence

- Currently uses in-memory storage with JSON file persistence
- Use `SAVES_DIR` from db.py for file paths
- Auto-save after modifications

### File Organization

```
backend/
  main.py      - FastAPI app entry point
  api.py       - API routes
  db.py        - Database/persistence layer
  models.py    - Pydantic data models
  requirements.txt

custom_components/mimesys_sync/
  __init__.py  - Integration setup and handlers
  config_flow.py - HA config flow
  const.py     - Constants
```

### Key Technologies

- **Backend**: FastAPI, Uvicorn, Pydantic
- **HA Integration**: Home Assistant Python SDK, voluptuous
- **Testing**: pytest (see requirements.txt)
- **Persistence**: JSON files

### Common Patterns

1. **API URL handling**: Always strip trailing slashes
   ```python
   api_url = api_url.rstrip("/")
   ```

2. **File path sanitization**: Remove path components from uploaded filenames
   ```python
   safe_filename = os.path.basename(original_filename)
   ```

3. **HA entity matching**: Use entity_id as light name for syncing
   ```python
   command = {"name": entity_id, "on": is_on}
   ```
