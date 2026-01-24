from fastapi import APIRouter, HTTPException, UploadFile, File
from models import Home, Floor, Wall, Light, LightState
from pydantic import BaseModel
import db
import base64

class LightControlCommand(BaseModel):
    name: str # Control all lights with this name
    on: bool | None = None
    brightness: float | None = None # 0 - 100
    color: list[int] | None = None # [255, 0, 0]

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
    home.id = home_id 
    return db.update_home(home_id, home)

@router.put("/homes/{home_id}/lights/{light_id}", response_model=Light)
async def update_light(home_id: str, light_id: str, state: LightState):
    home = db.get_home(home_id)
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")
    
    target_light = None
    for floor in home.floors:
        for light in floor.lights:
            if light.id == light_id:
                target_light = light
                break
        if target_light: break
            
    if not target_light:
        raise HTTPException(status_code=404, detail="Light not found")
        
    target_light.state = state
    return target_light

# HA Integration specific endpoints (simplified)
@router.post("/ha/light/{light_id}/{action}")
async def ha_light_control(light_id: str, action: str):
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

@router.post("/control/lights")
async def control_lights(commands: list[LightControlCommand]):
    print(f"DEBUG: Received control commands: {commands}")
    homes = db.get_homes()
    updates = 0
    
    for cmd in commands:
        for home in homes:
            for floor in home.floors:
                for light in floor.lights:
                    if light.name == cmd.name:
                        # Update state
                        if cmd.on is not None:
                            light.state.on = cmd.on
                            
                        if cmd.brightness is not None:
                            # Map 0-100 to 0.0-5.0 (internal intensity)
                            # 100 => 5.0
                            val = max(0.0, min(100.0, cmd.brightness))
                            light.state.intensity = (val / 100.0) * 5.0
                            
                        if cmd.color is not None and len(cmd.color) == 3:
                            # Convert RGB [r, g, b] to Hex String "#RRGGBB"
                            r, g, b = cmd.color
                            hex_color = "#{:02x}{:02x}{:02x}".format(r, g, b)
                            light.state.color = hex_color
                            
                        updates += 1
                        print(f"DEBUG: Updated light '{light.name}' to on={light.state.on}, brightness={light.state.intensity}, color={light.state.color}")
                        
            # Save home state
            db.update_home(home.id, home)
            
    return {"status": "success", "updated_lights": updates}

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
