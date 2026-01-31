from typing import List, Optional
from pydantic import BaseModel
from uuid import uuid4

class Vector3(BaseModel):
    x: float
    y: float
    z: float

class LightState(BaseModel):
    on: bool = False
    color: str = "#ffffff"
    intensity: float = 1.0

class Light(BaseModel):
    id: str = None
    name: str
    position: Vector3
    state: LightState = LightState()

    def __init__(self, **data):
        super().__init__(**data)
        if self.id is None:
            self.id = str(uuid4())

class Window(BaseModel):
    id: str = None
    p1: Vector3
    p2: Vector3
    height: float = 1.5
    bottom_height: float = 0.8  # Height from floor

    def __init__(self, **data):
        super().__init__(**data)
        if self.id is None:
            self.id = str(uuid4())

class Wall(BaseModel):
    id: str = None
    p1: Vector3
    p2: Vector3
    height: float = 2.5
    thickness: float = 0.2
    windows: List[Window] = []

    def __init__(self, **data):
        super().__init__(**data)
        if self.id is None:
            self.id = str(uuid4())

class Cube(BaseModel):
    id: str = None
    name: str = "Cube"
    position: Vector3
    rotation: float = 0.0
    size: Vector3 = Vector3(x=1, y=1, z=1)
    color: str = "#ababab"

    def __init__(self, **data):
        super().__init__(**data)
        if self.id is None:
            self.id = str(uuid4())

class Floor(BaseModel):
    id: str = None
    level: int
    name: str
    walls: List[Wall] = []
    lights: List[Light] = []
    cubes: List[Cube] = []
    floor_plan_image: Optional[str] = None # Base64 or URL
    shape: List[Vector3] = [] # Ordered points defining the floor polygon

    def __init__(self, **data):
        super().__init__(**data)
        if self.id is None:
            self.id = str(uuid4())

class Home(BaseModel):
    id: str = None
    name: str
    floors: List[Floor] = []
    background_color: str = "#222222"  # Default dark grey

    def __init__(self, **data):
        super().__init__(**data)
        if self.id is None:
            self.id = str(uuid4())
