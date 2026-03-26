from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from app.models.validation_utils import (
    TEXT_MAX_LENGTH,
    validate_age,
    validate_numeric_string,
    validate_password_strength,
    validate_person_name,
    require_trimmed_text,
)

class User(BaseModel):
    model_config = ConfigDict(
        json_encoders={datetime: lambda v: v.isoformat()},
    )

    id: Optional[int] = None
    name: str
    last_name: str
    email: EmailStr  
    document_number: Optional[str] = None 
    age: Optional[int] = None  
    password: Optional[str] = None
    role_id: Optional[int]
    created_at: Optional[datetime] = Field(default_factory=datetime.now)  
    updated_at: Optional[datetime] = Field(default_factory=datetime.now) 
    deleted_at: Optional[datetime] = None  

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return validate_person_name(value, field_name="El nombre")

    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return require_trimmed_text(value, field_name="El correo")

    @field_validator("last_name", mode="before")
    @classmethod
    def validate_last_name(cls, value: str) -> str:
        return validate_person_name(value, field_name="El apellido")

    @field_validator("document_number", mode="before")
    @classmethod
    def validate_document_number(cls, value: Optional[str]) -> Optional[str]:
        return validate_numeric_string(value, field_name="El documento", max_length=20)

    @field_validator("age", mode="before")
    @classmethod
    def validate_age_range(cls, value: Optional[int]) -> Optional[int]:
        return validate_age(value)

    @field_validator("password", mode="before")
    @classmethod
    def validate_password(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return validate_password_strength(value)
