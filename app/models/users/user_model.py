from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class User(BaseModel):
    id: Optional[int] = None
    name: str
    last_name: str
    email: EmailStr  
    document_number: Optional[str] = None 
    age: Optional[str] = None  
    password: Optional[str] = None
    role_id: Optional[int]
    created_at: Optional[datetime] = Field(default_factory=datetime.now)  
    updated_at: Optional[datetime] = Field(default_factory=datetime.now) 
    deleted_at: Optional[datetime] = None  

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
