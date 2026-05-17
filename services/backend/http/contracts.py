from dataclasses import dataclass, field


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, details: dict | None = None):
        super().__init__(message)
        self.status = int(status)
        self.code = str(code)
        self.message = str(message)
        self.details = details or {}


@dataclass(frozen=True)
class JsonResponse:
    status: int = 200
    payload: dict | None = None


@dataclass(frozen=True)
class BytesResponse:
    status: int = 200
    content_type: str = 'application/octet-stream'
    body: bytes = b''
    headers: dict = field(default_factory=dict)
