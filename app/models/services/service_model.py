from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime, date, time


class Service(BaseModel):
    client_id: Optional[int] = None
    request_date: date
    request_time: time | None = None
    service_type: str
    address: str
