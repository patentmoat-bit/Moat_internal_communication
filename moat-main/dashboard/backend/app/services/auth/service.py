from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_password_reset_token,
    decode_token,
)
from app.core.exceptions import (
    UnauthorizedException,
    ConflictException,
    BadRequestException,
    NotFoundException,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import ForgotPasswordResponse, LoginRequest, SignupRequest, TokenResponse, AuthTokenResponse, ResetPasswordRequest
from app.schemas.user import UserResponse, UserUpdate


from sqlalchemy.future import select
from app.models.rbac import UserRoleAssignment, RolePermission, Permission

class AuthService:
    def __init__(self, user_repo: UserRepository, db_session: AsyncSession) -> None:
        self.user_repo = user_repo
        self.db = db_session

    async def _get_user_permissions(self, user_id: str) -> list[str]:
        stmt = (
            select(Permission.key)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .join(UserRoleAssignment, UserRoleAssignment.role_id == RolePermission.role_id)
            .where(UserRoleAssignment.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        return list(set(result.scalars().all()))

    async def _generate_tokens(self, user: User) -> AuthTokenResponse:
        permissions = await self._get_user_permissions(user.id)
        
        access_token = create_access_token({
            "sub": user.id, 
            "role": user.role.value,
            "permissions": permissions
        })
        refresh_token = create_refresh_token({"sub": user.id})

        return AuthTokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": user.id, 
                "email": user.email, 
                "name": user.name, 
                "role": user.role.value,
                "permissions": permissions
            },
        )

    async def signup(self, data: SignupRequest) -> AuthTokenResponse:
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise ConflictException("Email already registered")

        user = await self.user_repo.create(
            email=data.email,
            password_hash=hash_password(data.password),
            name=data.name,
            role=data.role,
        )

        return await self._generate_tokens(user)

    async def login(self, data: LoginRequest) -> AuthTokenResponse:
        user = await self.user_repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise UnauthorizedException("Invalid email or password")

        if not user.is_active:
            raise UnauthorizedException("Account is disabled")

        return await self._generate_tokens(user)

    async def refresh_token(self, token: str) -> TokenResponse:
        payload = decode_token(token)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedException("Invalid or expired refresh token")

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedException("Invalid token payload")

        user = await self.user_repo.get(user_id)
        if not user or not user.is_active:
            raise UnauthorizedException("User not found or inactive")

        tokens = await self._generate_tokens(user)
        return TokenResponse(access_token=tokens.access_token, refresh_token=tokens.refresh_token)

    async def get_current_user(self, token: str) -> User:
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            raise UnauthorizedException("Invalid or expired access token")

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedException("Invalid token payload")

        user = await self.user_repo.get(user_id)
        if not user or not user.is_active:
            raise UnauthorizedException("User not found or inactive")

        return user

    async def forgot_password(self, email: str) -> ForgotPasswordResponse:
        user = await self.user_repo.get_by_email(email)
        message = "If an account exists, password reset instructions have been generated."
        if not user or not user.is_active:
            return ForgotPasswordResponse(message=message)

        token = create_password_reset_token({"sub": user.id, "email": user.email})
        # Development-friendly: return token so the frontend can build a reset link.
        # In production this should be emailed and omitted from the API response.
        return ForgotPasswordResponse(message=message, reset_token=token)

    async def reset_password(self, data: ResetPasswordRequest) -> dict:
        payload = decode_token(data.token)
        if not payload or payload.get("type") != "password_reset":
            raise UnauthorizedException("Invalid or expired password reset token")

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedException("Invalid password reset token")

        user = await self.user_repo.get(user_id)
        if not user or not user.is_active:
            raise UnauthorizedException("User not found or inactive")

        user.password_hash = hash_password(data.password)
        user.auth_provider = "local"
        await self.db.flush()
        return {"message": "Password reset successfully"}

    async def get_user_by_id(self, user_id: str) -> User:
        user = await self.user_repo.get(user_id)
        if not user:
            raise NotFoundException("User not found")
        return user

    async def update_profile(self, user_id: str, data: UserUpdate) -> User:
        if data.email:
            existing = await self.user_repo.get_by_email(data.email)
            if existing and existing.id != user_id:
                raise ConflictException("Email already in use")

        user = await self.user_repo.update(
            user_id,
            name=data.name,
            email=data.email,
        )
        if not user:
            raise NotFoundException("User not found")
        return user

    async def process_oauth_callback(self, email: str, name: str, provider: str) -> AuthTokenResponse:
        user = await self.user_repo.get_by_email(email)
        
        if not user:
            # Create new OAuth user
            user = await self.user_repo.create(
                email=email,
                name=name,
                password_hash=None,
                auth_provider=provider
            )
        else:
            # If user exists but used local, let them log in anyway
            pass

        if not user.is_active:
            raise UnauthorizedException("Account is disabled")

        return await self._generate_tokens(user)
