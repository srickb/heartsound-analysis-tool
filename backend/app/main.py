from datetime import datetime
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import ensure_storage_directories
from app.db import init_db
from app.services.auth_service import (
    SESSION_COOKIE_NAME,
    AuthError,
    change_admin_password,
    clear_session,
    generate_access_code,
    get_public_auth_state,
    login_admin,
    redeem_access_code,
    require_admin_access,
    require_viewer_access,
    set_initial_admin_password,
    update_access_mode,
)
from app.services.file_service import (
    UploadValidationError,
    delete_files,
    get_file_metadata,
    list_files,
    save_uploaded_file,
)
from app.services.plot_data_service import (
    PlotDataNotFoundError,
    PlotDataValidationError,
    get_plot_data,
)


app = FastAPI(title="HeartSound Analysis Tool API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    ensure_storage_directories()
    init_db()


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


def _session_token(request: Request) -> str | None:
    return request.cookies.get(SESSION_COOKIE_NAME)


def _set_session_cookie(response: Response, session_token: str, expires_at: str) -> None:
    expires_at_dt = datetime.fromisoformat(expires_at)
    max_age = max(int((expires_at_dt - datetime.now(expires_at_dt.tzinfo)).total_seconds()), 0)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        samesite="lax",
        secure=False,
        expires=expires_at_dt,
        max_age=max_age,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")


class AdminPasswordRequest(BaseModel):
    password: str = Field(min_length=4, max_length=128)


class AdminPasswordChangeRequest(BaseModel):
    currentPassword: str = Field(min_length=4, max_length=128)
    newPassword: str = Field(min_length=4, max_length=128)


class AccessModeRequest(BaseModel):
    accessMode: str


class AccessCodeLoginRequest(BaseModel):
    code: str = Field(min_length=4, max_length=12)


@app.get("/api/auth/public-state")
def get_auth_public_state(request: Request) -> dict[str, Any]:
    return get_public_auth_state(_session_token(request))


@app.post("/api/auth/admin/setup")
def setup_admin_password(payload: AdminPasswordRequest) -> dict[str, str]:
    try:
        set_initial_admin_password(payload.password)
        return {"status": "configured"}
    except AuthError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error


@app.post("/api/auth/admin/login")
def admin_login(
    payload: AdminPasswordRequest,
    response: Response,
) -> dict[str, str]:
    try:
        session = login_admin(payload.password)
        _set_session_cookie(response, session.token, session.expires_at)
        return {"status": "ok", "role": session.role}
    except AuthError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error


@app.post("/api/auth/admin/logout")
def admin_logout(request: Request, response: Response) -> dict[str, str]:
    clear_session(_session_token(request))
    _clear_session_cookie(response)
    return {"status": "ok"}


@app.post("/api/auth/admin/change-password")
def admin_change_password(
    payload: AdminPasswordChangeRequest,
    request: Request,
) -> dict[str, str]:
    try:
        require_admin_access(_session_token(request))
        change_admin_password(payload.currentPassword, payload.newPassword)
        return {"status": "updated"}
    except AuthError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error


@app.post("/api/auth/admin/access-mode")
def set_access_mode(
    payload: AccessModeRequest,
    request: Request,
) -> dict[str, str]:
    try:
        require_admin_access(_session_token(request))
        return {"accessMode": update_access_mode(payload.accessMode)}
    except AuthError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error


@app.post("/api/auth/admin/generate-access-code")
def create_access_code(
    request: Request,
) -> dict[str, str]:
    try:
        require_admin_access(_session_token(request))
        return generate_access_code()
    except AuthError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error


@app.post("/api/auth/access-code/login")
def access_code_login(
    payload: AccessCodeLoginRequest,
    response: Response,
) -> dict[str, str]:
    try:
        session = redeem_access_code(payload.code)
        _set_session_cookie(response, session.token, session.expires_at)
        return {"status": "ok", "role": session.role}
    except AuthError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error


@app.post("/api/auth/logout")
def logout(request: Request, response: Response) -> dict[str, str]:
    clear_session(_session_token(request))
    _clear_session_cookie(response)
    return {"status": "ok"}


@app.get("/api/files")
def get_files(request: Request) -> dict[str, Any]:
    try:
        require_viewer_access(_session_token(request))
    except AuthError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    return {"files": list_files()}


@app.get("/api/files/{file_id}/metadata")
def get_file(file_id: str, request: Request) -> dict[str, Any]:
    try:
        require_viewer_access(_session_token(request))
    except AuthError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    metadata = get_file_metadata(file_id)
    if metadata is None:
        raise HTTPException(status_code=404, detail="file metadata not found")
    return {"file": metadata}


async def _handle_upload_request(
    files: list[UploadFile], relative_paths: list[str] | None, ignore_unsupported: bool
) -> dict[str, Any]:
    uploaded: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    ignored: list[dict[str, str]] = []

    for index, upload in enumerate(files):
        relative_path = None
        if relative_paths is not None and index < len(relative_paths):
            relative_path = relative_paths[index]

        try:
            uploaded_file = await save_uploaded_file(upload, relative_path)
            uploaded.append(uploaded_file)
        except UploadValidationError as error:
            record = {
                "fileName": upload.filename or "unknown",
                "message": str(error),
            }
            if ignore_unsupported and "unsupported file extension" in str(error):
                ignored.append(record)
            else:
                errors.append(record)
        except Exception:
            errors.append(
                {
                    "fileName": upload.filename or "unknown",
                    "message": "unexpected error while processing file",
                }
            )

    if errors and not uploaded:
        raise HTTPException(
            status_code=400,
            detail={
                "uploaded": uploaded,
                "errors": errors,
                "ignored": ignored,
            },
        )

    return {"uploaded": uploaded, "errors": errors, "ignored": ignored}


@app.post("/api/upload/files")
async def upload_files(
    request: Request,
    files: list[UploadFile] = File(...),
    relative_paths: list[str] | None = Form(None),
) -> dict[str, Any]:
    try:
        require_viewer_access(_session_token(request))
    except AuthError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    if not files:
        raise HTTPException(status_code=400, detail="no files provided")
    return await _handle_upload_request(files, relative_paths, ignore_unsupported=False)


@app.post("/api/upload/folder")
async def upload_folder(
    request: Request,
    files: list[UploadFile] = File(...),
    relative_paths: list[str] | None = Form(None),
) -> dict[str, Any]:
    try:
        require_viewer_access(_session_token(request))
    except AuthError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    if not files:
        raise HTTPException(status_code=400, detail="no files provided")
    return await _handle_upload_request(files, relative_paths, ignore_unsupported=True)


class DeleteFilesRequest(BaseModel):
    fileIds: list[str] = Field(default_factory=list, min_length=1)


@app.delete("/api/files")
def delete_file_items(payload: DeleteFilesRequest, request: Request) -> dict[str, Any]:
    try:
        require_viewer_access(_session_token(request))
    except AuthError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    deleted_ids, not_found_ids = delete_files(payload.fileIds)
    return {
        "deletedFileIds": deleted_ids,
        "notFoundFileIds": not_found_ids,
    }


@app.get("/api/files/{file_id}/plot-data")
def get_file_plot_data(
    file_id: str,
    request: Request,
    mode: str = "overview",
    start: int | None = None,
    end: int | None = None,
    panelWidth: int | None = None,
    targetPoints: int | None = None,
) -> dict[str, Any]:
    try:
        require_viewer_access(_session_token(request))
        return get_plot_data(
            file_id=file_id,
            mode=mode,
            start=start,
            end=end,
            panel_width=panelWidth,
            target_points=targetPoints,
        )
    except PlotDataNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except PlotDataValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
