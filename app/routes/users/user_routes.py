from fastapi import APIRouter, Depends
from app.controllers.users.user_controller import *
from app.models.users.user_model import User
from app.models.services.service_model import Service
from app.models.login.user_login_model import UserLogin
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.auth import verify_token 

router = APIRouter()

userController = UserController()



#FUNCTIONAL ROUTES
@router.put("/users/update/{user_id}") 
async def update(user_id: int, user: User, token_data: dict = Depends(verify_token)):
    response = userController.update(user_id, user)
    return response

@router.post("/users/services/create")
async def create_service(service: Service, token_data: dict = Depends(verify_token)):
    response = await userController.create_service(service)
    return response

@router.get("/users/services/list/{client_id}")
async def get_services(client_id: int, token_data: dict = Depends(verify_token)):
    response = userController.get_services(client_id)
    return response


@router.put("/users/services/update/{service_id}")
async def update_service(service_id: int, service: Service, token_data: dict = Depends(verify_token)):
    response = userController.update_service(service_id, service)
    return response


@router.put("/users/services/delete/{service_id}")
async def delete_service(service_id: int, token_data: dict = Depends(verify_token)):
    response = userController.delete_service(service_id)
    return response


@router.get("/users/reports/client/{client_id}")
async def get_technician_reports(client_id: int, token_data: dict = Depends(verify_token)):
    return userController.get_reports_by_client(client_id)



@router.get("/users/report/{report_id}")
async def get_report_by_id(report_id: int, token_data: dict = Depends(verify_token)):
    return userController.get_report_by_id(report_id)

@router.put("/users/update/reports/{report_id}")
async def update_report(report_id: int, body: dict, current_user: dict = Depends(verify_token)):
    return userController.update_report(report_id, body)



@router.get("/client/stats/{client_id}")
def get_client_stats(client_id: int, token_data: dict = Depends(verify_token)):
    return userController.get_client_stats(client_id)