from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

class TokenPayload(BaseModel):
    sub: str
    role: str
    permissions: List[str] = []

async def get_token_payload(token: str = Depends(oauth2_scheme)) -> TokenPayload:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenPayload(**payload)

class RequireRole:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    async def __call__(self, payload: TokenPayload = Depends(get_token_payload)):
        if payload.role not in self.allowed_roles and "admin" not in payload.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this role",
            )
        return payload

class RequirePermission:
    def __init__(self, required_permissions: List[str]):
        self.required_permissions = required_permissions

    async def __call__(self, payload: TokenPayload = Depends(get_token_payload)):
        # Admin bypasses permission checks
        if payload.role == "admin":
            return payload
            
        user_permissions = set(payload.permissions)
        if not all(p in user_permissions for p in self.required_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return payload
