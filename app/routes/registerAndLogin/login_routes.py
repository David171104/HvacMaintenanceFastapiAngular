from fastapi import APIRouter, HTTPException
from app.controllers.registerAndLogin.login_controller import *
from app.models.login.user_login_model import UserLogin
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

router = APIRouter()

loginController = LoginController()




#FUNCTIONAL ROUTES
@router.post("/users/user_login")
async def login(user: UserLogin):
    response = loginController.login_user(user)
    return response