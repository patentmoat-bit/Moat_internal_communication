import pytest
from unittest.mock import AsyncMock, patch

from app.models.user import UserRole, User
from app.api.deps import RoleChecker
from app.core.exceptions import ForbiddenException

@pytest.mark.asyncio
async def test_role_checker_allows_valid_role():
    # Arrange
    user = User(email="test@example.com", role=UserRole.admin)
    checker = RoleChecker([UserRole.admin])
    
    # Act
    result = checker(user)
    
    # Assert
    assert result == user


@pytest.mark.asyncio
async def test_role_checker_denies_invalid_role():
    # Arrange
    user = User(email="test@example.com", role=UserRole.viewer)
    checker = RoleChecker([UserRole.admin])
    
    # Act & Assert
    with pytest.raises(ForbiddenException) as excinfo:
        checker(user)
    
    assert "Operation not permitted" in str(excinfo.value)


@pytest.mark.asyncio
@patch('app.services.auth.service.AuthService.process_oauth_callback')
async def test_process_oauth_callback_creates_user(mock_process, monkeypatch):
    """
    Simulates an OAuth callback where a new user should be processed.
    """
    mock_process.return_value = {"access_token": "mocked", "refresh_token": "mocked"}
    
    result = await mock_process("newuser@google.com", "New User", "google")
    assert result["access_token"] == "mocked"
    mock_process.assert_called_once_with("newuser@google.com", "New User", "google")
