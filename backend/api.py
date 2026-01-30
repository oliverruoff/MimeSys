from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from models import Home, Floor, Wall, Light, LightState
from pydantic import BaseModel
import db
import base64
import io
import zipfile
import os

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
    
    # Auto-save the home after light state change
    db.auto_save_home(home)
    
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

@router.post("/saves/upload")
async def upload_save(file: UploadFile = File(...)):
    """Upload a new save file"""
    import logging
    import json
    logger = logging.getLogger(__name__)
    
    # Validate file extension
    if not file.filename or not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Only JSON files are supported")
    
    # Validate file size (max 10MB)
    max_size = 10 * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="File is too large (max 10MB)")
    
    try:
        # Validate JSON structure
        data = json.loads(contents)
        
        # Basic validation - check if it looks like a Home save file
        if not isinstance(data, dict) or 'id' not in data or 'floors' not in data:
            raise HTTPException(status_code=400, detail="Invalid save file format - missing required fields")
        
        if not isinstance(data.get('floors'), list):
            raise HTTPException(status_code=400, detail="Invalid save file format - floors must be an array")
        
        # Sanitize filename - remove path components and dangerous characters
        original_filename = file.filename or "uploaded_save.json"
        safe_filename = os.path.basename(original_filename)
        safe_filename = "".join(c for c in safe_filename if c.isalnum() or c in (' ', '-', '_', '.')).strip()
        
        if not safe_filename:
            safe_filename = "uploaded_save.json"
        
        # Ensure .json extension
        if not safe_filename.endswith('.json'):
            safe_filename += '.json'
        
        # Write to saves directory
        target_path = os.path.join(db.SAVES_DIR, safe_filename)
        
        # Check if file already exists - if so, add a number suffix
        base_name = safe_filename[:-5]  # Remove .json
        counter = 1
        while os.path.exists(target_path):
            safe_filename = f"{base_name}_{counter}.json"
            target_path = os.path.join(db.SAVES_DIR, safe_filename)
            counter += 1
        
        with open(target_path, 'wb') as f:
            f.write(contents)
        
        logger.info(f"Uploaded save file: {safe_filename}")
        
        return {
            "status": "success",
            "filename": safe_filename,
            "message": f"File uploaded successfully as {safe_filename}"
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        logger.error(f"Failed to upload save file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.post("/saves/{filename}", response_model=str)
async def save_as(filename: str, home: Home):
    # Update DB state first
    db.homes_db[home.id] = home
    saved_name = db.save_to_file(home, filename)
    return saved_name


@router.get("/saves/export/all")
async def export_all_saves():
    """Export all save files as a ZIP archive for backup"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Create an in-memory ZIP file
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            save_files = db.get_all_save_files()
            
            if not save_files:
                raise HTTPException(status_code=404, detail="No save files found to export")
            
            for filename in save_files:
                file_path = os.path.join(db.SAVES_DIR, filename)
                if os.path.exists(file_path):
                    # Add file to ZIP with just the filename (no path)
                    zip_file.write(file_path, arcname=filename)
                    logger.info(f"Added {filename} to export ZIP")
        
        # Seek to beginning of buffer
        zip_buffer.seek(0)
        
        # Return as downloadable file
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=home-digital-twin-saves.zip"}
        )
    except Exception as e:
        logger.error(f"Failed to export saves: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export saves: {str(e)}")


@router.post("/saves/import")
async def import_saves(file: UploadFile = File(...)):
    """Import save files from a ZIP archive"""
    import logging
    logger = logging.getLogger(__name__)
    
    if not file.filename or not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only ZIP files are supported")
    
    try:
        # Read the uploaded ZIP file
        contents = await file.read()
        zip_buffer = io.BytesIO(contents)
        
        imported_files = []
        
        with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
            # Extract all JSON files
            for filename in zip_file.namelist():
                if filename.endswith('.json'):
                    # Extract to saves directory
                    target_path = os.path.join(db.SAVES_DIR, os.path.basename(filename))
                    
                    # Read file content
                    file_content = zip_file.read(filename)
                    
                    # Write to saves directory
                    with open(target_path, 'wb') as f:
                        f.write(file_content)
                    
                    imported_files.append(os.path.basename(filename))
                    logger.info(f"Imported save file: {filename}")
        
        if not imported_files:
            raise HTTPException(status_code=400, detail="No valid JSON save files found in ZIP")
        
        return {
            "status": "success",
            "imported_files": imported_files,
            "count": len(imported_files)
        }
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")
    except Exception as e:
        logger.error(f"Failed to import saves: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to import saves: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    # Run server on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

