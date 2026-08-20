from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from authlib.integrations.starlette_client import OAuth

from app.config import settings
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import ForgotPasswordRequest, ForgotPasswordResponse, LoginRequest, SignupRequest, TokenResponse, AuthTokenResponse, RefreshTokenRequest, ResetPasswordRequest
from app.schemas.user import UserResponse, UserUpdate
from app.services.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

oauth = OAuth()
oauth.register(
    name='google',
    client_id=getattr(settings, 'GOOGLE_CLIENT_ID', 'placeholder_id'),
    client_secret=getattr(settings, 'GOOGLE_CLIENT_SECRET', 'placeholder_secret'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

oauth.register(
    name='microsoft',
    client_id=getattr(settings, 'MICROSOFT_CLIENT_ID', 'placeholder_id'),
    client_secret=getattr(settings, 'MICROSOFT_CLIENT_SECRET', 'placeholder_secret'),
    server_metadata_url='https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)


@router.post("/login", response_model=AuthTokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)) -> AuthTokenResponse:
    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo, db)
    return await auth_service.login(data)


@router.post("/signup", response_model=AuthTokenResponse)
async def signup(data: SignupRequest, db: AsyncSession = Depends(get_db)) -> AuthTokenResponse:
    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo, db)
    return await auth_service.signup(data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo, db)
    return await auth_service.refresh_token(data.refresh_token)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)) -> ForgotPasswordResponse:
    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo, db)
    return await auth_service.forgot_password(data.email)


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)) -> dict:
    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo, db)
    return await auth_service.reset_password(data)


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo, db)
    return await auth_service.update_profile(current_user.id, data)


@router.get("/{provider}/login")
async def oauth_login(provider: str, request: Request):
    client = oauth.create_client(provider)
    redirect_uri = request.url_for('oauth_callback', provider=provider)
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/{provider}/callback")
async def oauth_callback(provider: str, request: Request, db: AsyncSession = Depends(get_db)):
    client = oauth.create_client(provider)
    token = await client.authorize_access_token(request)
    user_info = token.get('userinfo')
    
    if not user_info:
        raise HTTPException(status_code=400, detail="Could not fetch user info from provider")
        
    email = user_info.get('email')
    name = user_info.get('name', '')
    
    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo, db)
    auth_response = await auth_service.process_oauth_callback(email=email, name=name, provider=provider)
    
    # In a real app, you would redirect to frontend with tokens in URL hash or HttpOnly cookies.
    # For now, redirecting to Next.js callback page with access token in query param.
    frontend_url = f"http://localhost:3000/auth/callback?access_token={auth_response.access_token}&refresh_token={auth_response.refresh_token}"
    return RedirectResponse(url=frontend_url)
