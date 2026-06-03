from pydantic import BaseModel
from typing import Dict, Any

class UserCreate(BaseModel):
    data: Dict[str, Any]
class RoleCreate(BaseModel):
    role_name: str
    permissions: Dict[str, Any]