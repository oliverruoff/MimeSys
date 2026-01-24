from fastapi import APIRouter, HTTPException, UploadFile, File
from models import Home, Floor, Wall, Light, LightState
import db
import base64

router = APIRouter()

@router.get("/homes", response_model=list[Home])
async def list_homes():
    return db.get_homes()

@router.get("/homes/{home_id}", response_model=Home)
async def get_home(home_id: str):
    home = db.get_home(home_id)
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")
    return home

@router.post("/homes", response_model=Home)
async def create_home(home: Home):
    return db.create_home(home)

@router.post("/homes/reset", response_model=Home)
async def reset_home():
    return db.reset_home()

@router.put("/homes/{home_id}", response_model=Home)
async def update_home(home_id: str, home: Home):
    # Ensure IDs match if provided, or handle mismatch policy
    # For now, we trust the body or overwrite
    home.id = home_id 
    return db.update_home(home_id, home)

@router.put("/homes/{home_id}/lights/{light_id}", response_model=Light)
async def update_light(home_id: str, light_id: str, state: LightState):
    home = db.get_home(home_id)
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")
    
    # Find light across all floors
    target_light = None
    for floor in home.floors:
        for light in floor.lights:
            if light.id == light_id:
                target_light = light
                break
        if target_light:
            break
            
    if not target_light:
        raise HTTPException(status_code=404, detail="Light not found")
        
    target_light.state = state
    # In a real app we'd save the DB state here
    return target_light

# GenAI endpoint removed

# HA Integration specific endpoints (simplified)
@router.post("/ha/light/{light_id}/{action}")
async def ha_light_control(light_id: str, action: str):
    # Action: on, off
    # Search all homes for the light (inefficient but works for small scale)
    target_light = None
    target_home_id = None
    
    for home in db.get_homes():
        for floor in home.floors:
            for light in floor.lights:
                if light.id == light_id:
                    target_light = light
                    target_home_id = home.id
                    break
            if target_light: break
        if target_light: break
        
    if not target_light:
        raise HTTPException(status_code=404, detail="Light not found")
        
    if action == "on":
        target_light.state.on = True
    elif action == "off":
        target_light.state.on = False
    
    return {"status": "success", "light": target_light}

@router.get("/saves", response_model=list[str])
async def list_saves():
    return db.get_all_save_files()

@router.post("/saves/{filename}/load", response_model=Home)
async def load_save(filename: str):
    home = db.load_from_file(filename)
    if not home:
        raise HTTPException(status_code=404, detail="Save file not found")
    return home

@router.post("/saves/{filename}", response_model=str)
async def save_as(filename: str, home: Home):
    # Update DB state first
    db.homes_db[home.id] = home
    saved_name = db.save_to_file(home, filename)
    return saved_name

if __name__ == "__main__":
    import uvicorn
    # Run server on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
