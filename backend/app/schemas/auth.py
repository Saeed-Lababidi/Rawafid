from datetime import date

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    business_name: str = Field(min_length=2, max_length=255)
    business_type: str = "ecommerce"
    city: str = "Riyadh"
    established_at: date | None = None  # defaults to ~2 years ago


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(ORMModel):
    id: str
    email: str
    role: str
    merchant_id: str | None


class MerchantOut(ORMModel):
    id: str
    name: str
    business_type: str
    city: str
    verification_status: str
    established_at: date


class MerchantUpdate(BaseModel):
    name: str | None = None
    business_type: str | None = None
    city: str | None = None
