from fastapi import APIRouter, Depends, Query
from typing import List
from app.controllers.roles.roles_controller import RolesController
from app.models.roles.roles_model import Roles
from app.auth import verify_token

router = APIRouter(prefix="/roles", tags=["Roles"])
rolesController = RolesController()

@router.get("/list")
async def get_roles(token_data: dict = Depends(verify_token)):
    """Obtener todos los roles activos"""
    return rolesController.get_roles()


@router.get("/get/{role_id}")
async def get_role(role_id: int, token_data: dict = Depends(verify_token)):
    return rolesController.get_role(role_id)


@router.post("/create")
async def create_role(roles: Roles, token_data: dict = Depends(verify_token)):
    return rolesController.create_role(roles)

@router.put("/update/{role_id}")
async def update_role(role_id: int, roles: Roles, token_data: dict = Depends(verify_token)):
    return rolesController.update_role(role_id, roles)

@router.delete("/delete/{role_id}")
async def delete_role(role_id: int, token_data: dict = Depends(verify_token)):
    return rolesController.delete_role(role_id)
