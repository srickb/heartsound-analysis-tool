from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
STORAGE_DIR = BACKEND_DIR / "storage"
UPLOAD_DIR = STORAGE_DIR / "uploads"
DATABASE_PATH = STORAGE_DIR / "heartsound.db"


def ensure_storage_directories() -> None:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

