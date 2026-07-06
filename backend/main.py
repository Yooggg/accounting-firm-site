import os
import re
import html
import logging
from email.message import EmailMessage

import aiosmtplib
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aspirant-backend")

# --- Настройки из переменных окружения (.env через systemd EnvironmentFile) ---
SMTP_HOST = os.environ["SMTP_HOST"]                 # напр. sm41.hosting.reg.ru
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465")) # 465 = SSL, 587 = STARTTLS
SMTP_USER = os.environ["SMTP_USER"]                 # info@aspirant.msk.ru
SMTP_PASSWORD = os.environ["SMTP_PASSWORD"]         # пароль почтового ящика
MAIL_TO = os.environ.get("MAIL_TO", SMTP_USER)       # куда слать заявки
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", "https://aspirant.msk.ru"
).split(",")

app = FastAPI(title="Aspirant contact form backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

PHONE_RE = re.compile(r"^[0-9+()\-\s]{5,20}$")

# Человекопонятные названия полей для сообщений об ошибках
FIELD_LABELS = {
    "name": "Имя",
    "phone": "Телефон",
    "message": "Сообщение",
    "consent": "Согласие на обработку данных",
}


class ContactForm(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=5, max_length=20)
    message: str = Field(min_length=1, max_length=2000)
    consent: bool

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not PHONE_RE.match(v):
            raise ValueError("Введите телефон в формате +7 900 123-45-67")
        return v

    @field_validator("consent")
    @classmethod
    def validate_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Нужно поставить галочку согласия на обработку данных")
        return v


def _friendly_error(err: dict) -> str:
    """Преобразует одну pydantic-ошибку в понятный пользователю текст на русском."""
    field = err["loc"][-1] if err.get("loc") else ""
    label = FIELD_LABELS.get(field, field)
    err_type = err.get("type", "")
    msg = err.get("msg", "")

    # Наши собственные field_validator-ы кидают ValueError с готовым русским текстом —
    # pydantic оборачивает его как "Value error, <текст>"
    if err_type == "value_error" and msg.startswith("Value error, "):
        return msg[len("Value error, "):]

    if err_type in ("string_too_short", "missing"):
        return f"Заполните поле «{label}»"
    if err_type == "string_too_long":
        return f"Слишком длинный текст в поле «{label}»"
    if err_type in ("bool_parsing", "bool_type"):
        return "Нужно поставить галочку согласия"

    return f"Проверьте поле «{label}»"


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    field_errors: dict[str, str] = {}
    for err in exc.errors():
        field = err["loc"][-1] if err.get("loc") else "form"
        # Если для поля уже есть сообщение, не перезаписываем — первое обычно самое точное
        field_errors.setdefault(str(field), _friendly_error(err))

    return JSONResponse(
        status_code=422,
        content={
            "detail": {
                "message": "Проверьте, пожалуйста, отмеченные поля формы",
                "errors": field_errors,
            }
        },
    )


@app.post("/api/contact")
async def send_contact_form(form: ContactForm):
    safe_name = html.escape(form.name)
    safe_phone = html.escape(form.phone)
    safe_message = html.escape(form.message).replace("\n", "<br>")

    message = EmailMessage()
    message["From"] = SMTP_USER
    message["To"] = MAIL_TO
    message["Subject"] = f"Новая заявка с сайта от {form.name}"
    message.set_content(
        f"Имя: {form.name}\nТелефон: {form.phone}\n\nСообщение:\n{form.message}"
    )
    message.add_alternative(
        f"""
        <html>
          <body>
            <p><strong>Имя:</strong> {safe_name}</p>
            <p><strong>Телефон:</strong> {safe_phone}</p>
            <p><strong>Сообщение:</strong><br>{safe_message}</p>
          </body>
        </html>
        """,
        subtype="html",
    )

    try:
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            use_tls=SMTP_PORT == 465,
            start_tls=SMTP_PORT == 587,
        )
    except Exception as exc:
        logger.exception("Не удалось отправить письмо")
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Не удалось отправить сообщение. Попробуйте позже или позвоните нам.",
                "errors": {},
            },
        ) from exc

    return {"ok": True}


@app.get("/api/health")
async def health():
    return {"status": "ok"}