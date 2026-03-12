from fastapi import APIRouter, Depends
from typing import List, Dict
from app.controllers.permissions.permissions_controller import PermissionsController
from app.models.permissions.permissions_model import Permissions
from app.auth import verify_token 


router = APIRouter(prefix="/permissions", tags=["Permisos"])
permissionsController = PermissionsController()

@router.get("/get/{role_id}")
async def get_permissions(role_id: int, token_data: dict = Depends(verify_token)):
    return permissionsController.get_permissions(role_id)

@router.put("/update/{role_id}")
async def update_permissions(role_id: int, permissions: List[Permissions], token_data: dict = Depends(verify_token)):
    return permissionsController.update_permissions(role_id, [perm.dict() for perm in permissions])



