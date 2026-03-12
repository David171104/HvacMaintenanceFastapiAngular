from fastapi_mail import ConnectionConfig

mail_config = ConnectionConfig(
    MAIL_USERNAME = "climatizacioniot@gmail.com",
    MAIL_PASSWORD = "phsj ttjh xxgg nfpo",
    MAIL_FROM = "climatizacioniot@gmail.com",
    MAIL_PORT = 587,
    MAIL_SERVER = "smtp.gmail.com",

    MAIL_STARTTLS = True,    # ← OBLIGATORIO
    MAIL_SSL_TLS = False,    # ← OBLIGATORIO

    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

