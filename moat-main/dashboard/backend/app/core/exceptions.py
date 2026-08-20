from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    def __init__(self, status_code: int, detail: str, error_code: str | None = None) -> None:
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code


class NotFoundException(AppException):
    def __init__(self, detail: str = "Resource not found", error_code: str | None = None) -> None:
        super().__init__(status_code=404, detail=detail, error_code=error_code)


class UnauthorizedException(AppException):
    def __init__(self, detail: str = "Unauthorized", error_code: str | None = None) -> None:
        super().__init__(status_code=401, detail=detail, error_code=error_code)


class ForbiddenException(AppException):
    def __init__(self, detail: str = "Forbidden", error_code: str | None = None) -> None:
        super().__init__(status_code=403, detail=detail, error_code=error_code)


class BadRequestException(AppException):
    def __init__(self, detail: str = "Bad request", error_code: str | None = None) -> None:
        super().__init__(status_code=400, detail=detail, error_code=error_code)


class ConflictException(AppException):
    def __init__(self, detail: str = "Conflict", error_code: str | None = None) -> None:
        super().__init__(status_code=409, detail=detail, error_code=error_code)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    content: dict[str, Any] = {"detail": exc.detail}
    if exc.error_code:
        content["error_code"] = exc.error_code
    return JSONResponse(status_code=exc.status_code, content=content)
