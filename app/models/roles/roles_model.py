from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Roles(BaseModel):
    id: Optional[int] = None
    name: str
    created_at: Optional[datetime] = Field(default_factory=datetime.now)  
    updated_at: Optional[datetime] = Field(default_factory=datetime.now) 
    deleted_at: Optional[datetime] = None  
    status: Optional[int] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
