import hashlib
import hmac
import secrets


def hash_password(password, salt_hex=None, iterations=200_000):
    if not isinstance(password, str):
        return None
    if len(password) < 6 or len(password) > 256:
        return None
    if salt_hex:
        try:
            salt = bytes.fromhex(salt_hex)
        except Exception:
            return None
    else:
        salt = secrets.token_bytes(16)
        salt_hex = salt.hex()
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
    return {"salt_hex": salt_hex, "hash_hex": dk.hex(), "iterations": int(iterations)}


def verify_password(password, salt_hex, hash_hex, iterations):
    record = hash_password(password, salt_hex=salt_hex, iterations=int(iterations))
    if not record:
        return False
    return hmac.compare_digest(record["hash_hex"], str(hash_hex or ""))

