from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import Settings, settings
from app.core.errors import install_error_handlers


def create_app(cfg: Settings = settings) -> FastAPI:
    prod = cfg.env == "production"
    application = FastAPI(
        title="Mess Tracker API",
        version="0.1.0",
        # Interactive API docs are for development only.
        docs_url=None if prod else "/docs",
        redoc_url=None if prod else "/redoc",
        openapi_url=None if prod else "/openapi.json",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["Authorization", "Content-Type"],
    )
    install_error_handlers(application)
    application.include_router(api_router)

    @application.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return application


app = create_app()
