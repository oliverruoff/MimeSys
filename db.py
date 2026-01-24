from models import Home, Floor, Wall, Light, LightState, Vector3

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
    return home


# Persistence Logic - Move definitions up to use them immediately
import os
import json
from glob import glob

SAVES_DIR = "saves"
if not os.path.exists(SAVES_DIR):
    os.makedirs(SAVES_DIR)

def load_from_file_internal(filename: str):
    path = os.path.join(SAVES_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path, 'r') as f:
        data = json.load(f)
        home = Home(**data)
        homes_db[home.id] = home
        return home

# Try to load default.json or any existing save
loaded_home = None
default_path = os.path.join(SAVES_DIR, "default.json")

if os.path.exists(default_path):
    print("Loading default.json...")
    loaded_home = load_from_file_internal("default.json")
else:
    # Check for any other json
    files = glob(os.path.join(SAVES_DIR, "*.json"))
    if files:
        print(f"Loading found save: {files[0]}")
        loaded_home = load_from_file_internal(os.path.basename(files[0]))

if not loaded_home:
    print("No saves found. Creating Demo Home...")
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




def save_to_file(home: Home, filename: str = None):
    if not filename:
        filename = f"{home.id}.json"
    if not filename.endswith(".json"):
        filename += ".json"
    
    path = os.path.join(SAVES_DIR, filename)
    with open(path, 'w') as f:
        # Pydantic v2 uses model_dump, v1 uses dict(). assuming v1 based on previous usage
        # usage in previous turns showed .dict()
        json.dump(home.dict(), f, indent=2)
    return filename

def load_from_file(filename: str):
    if not filename.endswith(".json"):
        filename += ".json"
    path = os.path.join(SAVES_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path, 'r') as f:
        data = json.load(f)
        home = Home(**data)
        homes_db[home.id] = home
        return home

def get_all_save_files():
    files = glob(os.path.join(SAVES_DIR, "*.json"))
    return [os.path.basename(f) for f in files]
