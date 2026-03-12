from pydantic import BaseModel

class Permissions(BaseModel):
    module_id: int
    can_view: bool = False
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False
