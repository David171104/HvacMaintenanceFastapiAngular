from fastapi import APIRouter, Depends
from app.controllers.users.technician_controller import *
from app.models.users.user_model import User
from app.models.services.service_model import Service
from app.models.login.user_login_model import UserLogin
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.auth import verify_token 

router = APIRouter()

techniccianController = TechniccianController()



#FUNCTIONAL ROUTES
@router.get("/services/technician/{technician_id}")
def get_services_by_technician(technician_id: int, token_data: dict = Depends(verify_token)):
    response = techniccianController.get_services_by_technician(technician_id)
    return response  

@router.put("/services/{service_id}/complete")
def complete_service(service_id: int, token_data: dict = Depends(verify_token)):
    response = techniccianController.complete_service(service_id)
    return response

@router.post("/reports")
def create_report(report: dict, token_data: dict = Depends(verify_token)):
    return techniccianController.create_report(report)


@router.get("/reports/technician/{technician_id}")
def get_technician_reports(technician_id: int, token_data: dict = Depends(verify_token)):
    return techniccianController.get_reports_by_technician(technician_id)



@router.get("/service-report/{report_id}/pdf")
def generate_pdf(report_id: int, token_data: dict = Depends(verify_token)):
    return techniccianController.generate_pdf(report_id)

@router.get("/techniccian/stats/{technician_id}")
def get_stats(technician_id: int, token_data: dict = Depends(verify_token)):
    return techniccianController.get_stats(technician_id)


@router.get("/techniccian/daily-services/{technician_id}")
async def get_daily_services(technician_id: int, token_data: dict = Depends(verify_token)):
    return techniccianController.get_daily_services(technician_id)


@router.get("/techniccian/monthly-stats/{technician_id}")
async def get_monthly_stats(technician_id: int, token_data: dict = Depends(verify_token)):
    return techniccianController.get_monthly_stats(technician_id)
