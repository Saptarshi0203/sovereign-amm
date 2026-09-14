import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from backend.app.api.account import router as account_router
from backend.app.api.admin import router as admin_router
from backend.app.api.auth import router as auth_router
from backend.app.api.control import router as control_router
from backend.app.api.demo import router as demo_router
from backend.app.api.emergency import router as emergency_router
from backend.app.api.grid_control import router as grid_control_router
from backend.app.api.history import router as history_router
from backend.app.api.orderbook import ACTIVE_STREAMS, router as orderbook_router
from backend.app.api.simulation import ensure_sample_dataset, router as simulation_router
from backend.app.api.trading import router as trading_router
from backend.app.playback import dataset_store
from backend.app.core.config import settings
from backend.app.db.storage import storage
from backend.app.engine_facade import engine_facade


@asynccontextmanager
async def lifespan(app: FastAPI):
    await storage.init_db()
    dataset_store.init()
    # Demo Mode charts read the static 24 h rollups: (re)seed when the last
    # 24 h of stored history is sparse (fresh install, or the seed has aged out).
    if storage.tick_count_since(settings.DEMO_GRID_ID, int(time.time() * 1000) - 24 * 3600 * 1000) < 20_000:
        try:
            from simulation.seed_history import seed_db

            await seed_db()
        except Exception as e:  # keep booting on a seeding failure
            print(f"[MAIN] history seeding skipped: {e}")
    # One deterministic 10 Hz engine loop for the public demo grid.
    engine_facade.start(settings.DEMO_GRID_ID)
    # Clock-synced playback: activate the last uploaded run, or the built-in 24 h sample.
    if settings.AUTO_SAMPLE_DATASET:
        try:
            pb = ensure_sample_dataset()
            print(f"[MAIN] playback dataset '{pb['name']}' ({pb['rows']} rows) synced to {pb['synced_time']} {pb['tz_label']}")
        except Exception as e:  # never block startup on dataset issues
            print(f"[MAIN] dataset playback unavailable: {e}")
    print(f"[MAIN] engine started for grid '{settings.DEMO_GRID_ID}' | history points: {storage.tick_count(settings.DEMO_GRID_ID)}")
    yield
    await engine_facade.stop_all()
    await storage.close()


app = FastAPI(title="Sovereign-AMM API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    # Local dev hosts plus every Vercel preview/production deployment of the dashboard.
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback

    traceback.print_exc()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": True, "code": "HTTP_500_INTERNAL_SERVER_ERROR", "message": str(exc), "timestamp": int(time.time() * 1000)},
    )


app.include_router(orderbook_router)
app.include_router(history_router)
app.include_router(grid_control_router)
app.include_router(control_router)
app.include_router(auth_router)
app.include_router(demo_router)
app.include_router(emergency_router)
app.include_router(account_router)
app.include_router(admin_router)
app.include_router(simulation_router)
app.include_router(trading_router)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    rt = engine_facade.get_runtime(settings.DEMO_GRID_ID)
    return {
        "status": "ok",
        "tick": rt.tick,
        "engine_running": rt.running,
        "history_points": storage.tick_count(settings.DEMO_GRID_ID),
        "active_streams": ACTIVE_STREAMS["count"],
    }
