from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, chat, dashboard, reports, users

Base.metadata.create_all(bind=engine)


app = FastAPI(title="HealthOS")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",  # Vite default
        "http://localhost:5173",  # Vite default
        "http://127.0.0.1:3000",  # Create React App / Next default
        "http://localhost:3000",  # Create React App / Next default
        "https://healthos-chi-eight.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "HealthOS app running"}
