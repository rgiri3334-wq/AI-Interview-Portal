import os
import base64
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger("EnterpriseInterviewAPI")

def _get_cipher() -> Fernet:
    """
    Returns a Fernet cipher based on the ENCRYPTION_KEY env var.
    If ENCRYPTION_KEY is not set, generates a deterministic key based on JWT_SECRET.
    In production, a strong, stable ENCRYPTION_KEY must be provided.
    """
    raw_key = os.environ.get("ENCRYPTION_KEY", os.environ.get("JWT_SECRET", "sterling-insecure-fallback-key"))
    
    # Derive a secure 32-byte url-safe base64 encoded key
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"sterling_emobility_static_salt_9384",
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(raw_key.encode()))
    return Fernet(key)

def encrypt_data(data: bytes) -> bytes:
    """Encrypts raw bytes into AES-256-GCM (Fernet) ciphertext."""
    if not data:
        return data
    cipher = _get_cipher()
    return cipher.encrypt(data)

def decrypt_data(token: bytes) -> bytes:
    """Decrypts AES-256-GCM ciphertext back to raw bytes."""
    if not token:
        return token
    # If the token doesn't start with 'gAAAAA' (Fernet identifier), it might not be encrypted
    if not token.startswith(b"gAAAAA"):
        return token

    cipher = _get_cipher()
    try:
        return cipher.decrypt(token)
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        # Return original token if decryption fails (e.g. wrong key, or wasn't actually encrypted)
        return token
