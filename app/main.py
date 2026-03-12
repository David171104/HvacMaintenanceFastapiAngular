from fastapi import FastAPI
from app.routes.registerAndLogin.register_routes import router as register_router
from app.routes.registerAndLogin.login_routes import router as login_router
from app.routes.users.user_routes import router as user_router
from app.routes.users.admin_routes import router as admin_router
from app.routes.users.techniccian_routes import router as techniccian_router
from app.routes.permissions.permissions_routes import router as permission_router
from app.routes.roles.roles_routes import router as roles_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI()



origins = [
    "http://localhost",
    "http://127.0.0.1:4200",
    "http://localhost:4200",
    "http://127.0.0.1:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(register_router)
app.include_router(login_router)
app.include_router(user_router)
app.include_router(admin_router)
app.include_router(techniccian_router)
app.include_router(permission_router)
app.include_router(roles_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)