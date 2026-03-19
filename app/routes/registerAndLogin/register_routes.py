from fastapi import APIRouter, HTTPException
from app.controllers.users.user_controller import *
from app.controllers.registerAndLogin.register_controller import *
from app.models.users.user_model import User
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

router = APIRouter()

registerController = RegisterController()






#FUNCTIONAL ROUTES
@router.post("/users/create_user")
async def create_user(user: User):
    return await registerController.create_user(user)




 
