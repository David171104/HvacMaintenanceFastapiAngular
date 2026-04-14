from pydantic import BaseModel, EmailStr, field_validator

from app.models.validation_utils import require_trimmed_text

class UserLogin(BaseModel):
    email: EmailStr  
    password: str

    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return require_trimmed_text(value, field_name="El correo")

    @field_validator("password", mode="before")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return require_trimmed_text(value, field_name="La contrasena")
