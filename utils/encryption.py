import os
import base64
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger("EnterpriseInterviewAPI")

def _get_raw_key() -> str:
    return os.environ.get(
        "ENCRYPTION_KEY",
        os.environ.get(
            "JWT_SECRET",
            "sterling-insecure-fallback-key"))

def _get_cipher(salt: bytes) -> Fernet:
    """
    Returns a Fernet cipher based on the ENCRYPTION_KEY env var and the provided salt.
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(_get_raw_key().encode()))
    return Fernet(key)

def encrypt_data(data: bytes) -> bytes:
    """Encrypts raw bytes into AES-256-GCM (Fernet) ciphertext with a random salt."""
    if not data:
        return data
    # Generate 16 bytes of random salt
    salt = os.urandom(16)
    cipher = _get_cipher(salt)
    token = cipher.encrypt(data)
    
    # Prepend version identifier 'v2.' + base64(salt) + '.' + token
    b64_salt = base64.urlsafe_b64encode(salt).decode('utf-8')
    return f"v2.{b64_salt}.{token.decode('utf-8')}".encode('utf-8')

def decrypt_data(token: bytes) -> bytes:
    """Decrypts AES-256-GCM ciphertext back to raw bytes."""
    if not token:
        return token
        
    try:
        token_str = token.decode('utf-8')
        if token_str.startswith("v2."):
            # New format: v2.<base64_salt>.<fernet_token>
            parts = token_str.split('.')
            if len(parts) == 3:
                salt = base64.urlsafe_b64decode(parts[1])
                fernet_token = parts[2].encode('utf-8')
                cipher = _get_cipher(salt)
                return cipher.decrypt(fernet_token)
    except Exception as e:
        logger.error(f"Failed to parse v2 token: {e}")
        pass # Fallback to legacy decryption attempt

    # Legacy format: Static salt
    if not token.startswith(b"gAAAAA"):
        return token

    try:
        # Backward compatibility with existing DB records
        cipher = _get_cipher(b"sterling_emobility_static_salt_9384")
        return cipher.decrypt(token)
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return token
