from models import Home, Floor, Wall, Light, LightState, Vector3
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory storage for now
homes_db = {}

def get_homes():
    return list(homes_db.values())

def get_home(home_id: str):
    return homes_db.get(home_id)

def create_home(home: Home):
    homes_db[home.id] = home
    return home

def reset_home():
    homes_db.clear()
    home = Home(name="New Home")
    floor = Floor(level=0, name="Ground Floor")
    home.floors = [floor]
    homes_db[home.id] = home
    return home

def update_home(home_id: str, home: Home):
    homes_db[home_id] = home
    # Auto-save to default.json after updates
    auto_save_home(home)
    return home


# Persistence Logic - Move definitions up to use them immediately
import os
import json
from glob import glob

# Use DATA_DIR environment variable with smart fallback for local development
# In Home Assistant addon: DATA_DIR=/data (persistent across restarts)
# In local dev: defaults to ../saves relative to this file
DATA_DIR = os.getenv('DATA_DIR')
if DATA_DIR:
    SAVES_DIR = os.path.join(DATA_DIR, 'saves')
else:
    # Local development fallback
    SAVES_DIR = os.path.join(os.path.dirname(__file__), '..', 'saves')

# Create saves directory with error handling
try:
    if not os.path.exists(SAVES_DIR):
        os.makedirs(SAVES_DIR, exist_ok=True)
        logger.info(f"Created saves directory: {SAVES_DIR}")
    else:
        logger.info(f"Using existing saves directory: {SAVES_DIR}")
    
    # Verify write permissions
    test_file = os.path.join(SAVES_DIR, '.write_test')
    try:
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        logger.info(f"Verified write permissions for: {SAVES_DIR}")
    except Exception as e:
        logger.error(f"No write permission for saves directory: {SAVES_DIR}. Error: {e}")
        
except Exception as e:
    logger.error(f"Failed to create saves directory: {SAVES_DIR}. Error: {e}")
    # Fallback to temp directory
    import tempfile
    SAVES_DIR = os.path.join(tempfile.gettempdir(), 'home-digital-twin-saves')
    os.makedirs(SAVES_DIR, exist_ok=True)
    logger.warning(f"Using temporary fallback directory: {SAVES_DIR}")

def load_from_file_internal(filename: str):
    """Internal function to load a home from a save file"""
    path = os.path.join(SAVES_DIR, filename)
    if not os.path.exists(path):
        logger.warning(f"Save file not found: {path}")
        return None
    
    try:
        with open(path, 'r') as f:
            data = json.load(f)
            home = Home(**data)
            # Clear existing homes and load only this one
            homes_db.clear()
            homes_db[home.id] = home
            logger.info(f"Successfully loaded home from: {filename} (cleared previous homes)")
            return home
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from {filename}: {e}")
        return None
    except Exception as e:
        logger.error(f"Failed to load home from {filename}: {e}")
        return None


def save_to_file(home: Home, filename: str = "default.json"):
    """Save a home to a specific file"""
    if not filename:
        filename = f"{home.id}.json"
    if not filename.endswith(".json"):
        filename += ".json"
    
    path = os.path.join(SAVES_DIR, filename)
    try:
        with open(path, 'w') as f:
            # Pydantic v2 uses model_dump, v1 uses dict(). assuming v1 based on previous usage
            # usage in previous turns showed .dict()
            json.dump(home.dict(), f, indent=2)
        logger.info(f"Saved home to: {filename}")
        return filename
    except Exception as e:
        logger.error(f"Failed to save home to {filename}: {e}")
        raise


def auto_save_home(home: Home, filename: str = "default.json"):
    """Automatically save a home to the default save file"""
    try:
        save_to_file(home, filename)
        logger.debug(f"Auto-saved home '{home.name}' to {filename}")
    except Exception as e:
        logger.error(f"Failed to auto-save home: {e}")


# Try to load default.json or any existing save
loaded_home = None
default_path = os.path.join(SAVES_DIR, "default.json")

if os.path.exists(default_path):
    logger.info("Found default.json, loading...")
    loaded_home = load_from_file_internal("default.json")
else:
    # Check for any other json
    files = glob(os.path.join(SAVES_DIR, "*.json"))
    if files:
        filename = os.path.basename(files[0])
        logger.info(f"No default.json found, loading: {filename}")
        loaded_home = load_from_file_internal(filename)

if not loaded_home:
    logger.info("No saves found. Creating Demo Home...")
    # Initialize with a demo home
    demo_home = Home(name="Demo Home")
    floor1 = Floor(level=0, name="Ground Floor")
    # Simple box room
    w1 = Wall(p1={"x": 0, "y": 0, "z": 0}, p2={"x": 10, "y": 0, "z": 0})
    w2 = Wall(p1={"x": 10, "y": 0, "z": 0}, p2={"x": 10, "y": 0, "z": 10})
    w3 = Wall(p1={"x": 10, "y": 0, "z": 10}, p2={"x": 0, "y": 0, "z": 10})
    w4 = Wall(p1={"x": 0, "y": 0, "z": 10}, p2={"x": 0, "y": 0, "z": 0})
    floor1.walls = [w1, w2, w3, w4]

    l1 = Light(name="Living Room Main", position={"x": 5, "y": 2.4, "z": 5})
    floor1.lights = [l1]
    floor1.shape = [
        Vector3(x=0, y=0, z=0),
        Vector3(x=10, y=0, z=0),
        Vector3(x=10, y=0, z=10),
        Vector3(x=0, y=0, z=10)
    ]

    demo_home.floors = [floor1]
    homes_db[demo_home.id] = demo_home
    
    # Auto-save the demo home
    logger.info("Auto-saving demo home to default.json...")
    save_to_file(demo_home, "default.json")


def load_from_file(filename: str):
    """Load a home from a save file by filename"""
    if not filename.endswith(".json"):
        filename += ".json"
    path = os.path.join(SAVES_DIR, filename)
    if not os.path.exists(path):
        logger.warning(f"Save file not found: {filename}")
        return None
    
    try:
        with open(path, 'r') as f:
            data = json.load(f)
            home = Home(**data)
            # Clear existing homes and load only this one
            homes_db.clear()
            homes_db[home.id] = home
            logger.info(f"Loaded home from: {filename} (cleared previous homes)")
            return home
    except Exception as e:
        logger.error(f"Failed to load home from {filename}: {e}")
        return None


def get_all_save_files():
    """Get list of all save files"""
    files = glob(os.path.join(SAVES_DIR, "*.json"))
    return [os.path.basename(f) for f in files]

