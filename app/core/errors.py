from collections.abc import Callable

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class ResourceNotFoundError(Exception):
    """Raised when mock maritime data is unavailable for a requested subject."""


def _not_found_handler(_: Request, exc: ResourceNotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ResourceNotFoundError, _not_found_handler)
