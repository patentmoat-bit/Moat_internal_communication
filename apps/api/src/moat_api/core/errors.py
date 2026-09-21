from __future__ import annotations

import uuid

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def error_body(code: str, message: str, request_id: str, **extra: object) -> dict:
    """One error shape across the whole API (design doc §7): a machine code, a
    sentence a person can read, and the request id to correlate with logs."""
    return {"error": {"code": code, "message": message, "request_id": request_id, **extra}}


def request_id_of(request: Request) -> str:
    return getattr(request.state, "request_id", str(uuid.uuid4()))


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict):
        code = str(detail.get("code", "error"))
        message = str(detail.get("message", "Request failed."))
        extra = {k: v for k, v in detail.items() if k not in {"code", "message"}}
    else:
        code = "error"
        message = str(detail)
        extra = {}
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(code, message, request_id_of(request), **extra),
        headers=getattr(exc, "headers", None),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_body(
            "invalid_request",
            "The request body did not validate.",
            request_id_of(request),
            fields=[
                {"field": ".".join(str(p) for p in err["loc"][1:]), "problem": err["msg"]}
                for err in exc.errors()
            ],
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Never leak an internal message to the client. The request id is the
    # handle an operator uses to find the real traceback in the logs.
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_body(
            "internal_error",
            "Something went wrong. Quote the request id if you report this.",
            request_id_of(request),
        ),
    )
