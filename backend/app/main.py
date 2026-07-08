from fastapi import FastAPI

from app.candidates import router as candidates_router

app = FastAPI(title="Nippon Toyota Recruitment Portal")
app.include_router(candidates_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
