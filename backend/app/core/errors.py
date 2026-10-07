from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ApiError(Exception):
    def __init__(self, status: int, code: str, detail: str) -> None:
        super().__init__(detail)
        self.status = status
        self.code = code
        self.detail = detail


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status, content={"detail": exc.detail, "code": exc.code}
        )

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Only loc/msg/type: pydantic's ctx may hold raw exception objects that are
        # not JSON serializable, and input may echo passwords back to the client.
        errors = [
            {
                "loc": jsonable_encoder(e.get("loc", ())),
                "msg": str(e.get("msg", "")),
                "type": str(e.get("type", "")),
            }
            for e in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={"detail": "Validation failed", "code": "VALIDATION_ERROR", "errors": errors},
        )
