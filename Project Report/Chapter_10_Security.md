# CHAPTER 10
# SECURITY ARCHITECTURE

============================================================
10. SECURITY ARCHITECTURE
============================================================

---

## 10.1 Security Design Philosophy

The security architecture of the Sterling AI Recruitment Engine is designed around the principle of **defence in depth** — a layered security model in which multiple independent security controls protect the system, ensuring that the failure of any single control does not result in a complete security breach. This approach is particularly critical for a platform that handles sensitive personal data (candidate credentials, resume content, interview transcripts) and exposes real-time communication channels (WebSocket audio streams) to the public internet.

The platform's security posture is aligned with the following standards and frameworks:

- **OWASP Top 10 (2021)**: All listed vulnerability categories are explicitly addressed in the platform's security controls.
- **India's Digital Personal Data Protection Act, 2023 (DPDP Act)**: Candidate data is handled with appropriate consent, purpose limitation, and data minimisation principles.
- **JWT Best Practices (RFC 7519)**: Industry-standard practices for JWT issuance, validation, and revocation.

The security architecture encompasses seven distinct control layers, detailed in the following sections.

---

## 10.2 Authentication Layer — JWT-Based Session Management

### 10.2.1 JWT Token Architecture

The platform employs **JSON Web Token (JWT)** based authentication for all protected API endpoints. Upon successful credential verification, the server issues a signed JWT containing:

```json
{
  "header": { "alg": "HS256", "typ": "JWT" },
  "payload": {
    "sub": "candidate_id_or_admin_id",
    "role": "CANDIDATE | ADMIN",
    "email": "user@example.com",
    "iat": 1735800000,
    "exp": 1735886400
  }
}
```

The JWT is signed using **HMAC-SHA256 (HS256)** with a server-side secret key stored as an environment variable (`JWT_SECRET_KEY`), never hardcoded in source files.

### 10.2.2 Token Lifecycle

| Event | Action |
|---|---|
| Successful login | JWT issued with 24-hour expiration |
| API request received | JWT extracted from `Authorization: Bearer <token>` header |
| JWT validation | Signature verified; expiration checked; role claim extracted |
| Token expiry | Frontend detects 401 response and redirects to login page |
| Logout | Frontend removes token from `sessionStorage`; no server-side revocation (stateless) |

### 10.2.3 FastAPI JWT Middleware

JWT validation is implemented as a FastAPI dependency injected into all protected routes:

```python
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token validation failed")
    return db.query(Candidate).filter(Candidate.candidate_id == user_id).first()
```

---

## 10.3 Authorization Layer — Role-Based Access Control (RBAC)

The platform enforces a two-role RBAC model:

| Role | Accessible Routes | Restricted From |
|---|---|---|
| `CANDIDATE` | Registration, login, resume upload, interview access, own report | Admin dashboard, other candidates' data, question bank management |
| `ADMIN` | All candidate routes + full admin dashboard, CRUD operations, analytics, override decisions | — |

Route-level role enforcement is implemented as FastAPI dependencies:

```python
def require_admin(current_user: Candidate = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
```

All admin API routes (`/api/admin/*`) include `Depends(require_admin)`, ensuring that any candidate-role JWT attempting to access admin endpoints receives a 403 Forbidden response.

---

## 10.4 Password Security — Bcrypt Hashing

Candidate passwords are **never stored in plaintext**. The storage and verification process:

1. **Registration**: Password is hashed with bcrypt, cost factor 12 (2^12 = 4,096 rounds), before insertion into `Candidate.password_hash`.
2. **Login**: The submitted password is verified against the stored hash using `bcrypt.checkpw()`. The original password is never recoverable from the stored hash.
3. **Cost Factor**: The bcrypt cost factor of 12 ensures that each password hash computation takes approximately 250–500ms on modern hardware, making brute-force attacks computationally prohibitive even if the database is compromised.

---

## 10.5 Input Validation — Pydantic Schema Enforcement

All data entering the FastAPI backend is validated against strict **Pydantic v2 model schemas** before reaching any service logic. This provides:

- **Type enforcement**: Integer fields reject string inputs; email fields reject non-email format strings.
- **Constraint enforcement**: Score fields are bounded (0.0–100.0); difficulty fields are restricted to Enum values (Easy/Medium/Hard).
- **Automatic sanitisation**: Pydantic strips extra fields not defined in the schema, preventing parameter pollution attacks.

Example Pydantic model:

```python
class CandidateRegisterSchema(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    
    @field_validator('password')
    def password_complexity(cls, v):
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v
```

---

## 10.6 SQL Injection Prevention

The platform is inherently protected against SQL injection through its exclusive use of **SQLAlchemy ORM** for all database operations. SQLAlchemy's query builder generates parameterised SQL statements:

```python
# Safe — SQLAlchemy parameterises this automatically
candidate = db.query(Candidate).filter(Candidate.email == email).first()

# Equivalent safe SQL:
# SELECT * FROM candidates WHERE email = ? -- ['user@example.com']
```

Direct string interpolation into SQL queries is completely absent from the codebase. No raw SQL execution (`db.execute("SELECT ... " + user_input)`) patterns exist.

---

## 10.7 CORS Security Configuration

The **CORS (Cross-Origin Resource Sharing)** middleware in `Main.py` is configured with an explicit allowlist of permitted origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://interview.sterlingemobility.com", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

The production configuration restricts origins to only the official Sterling E-Mobility interview portal domain. The wildcard `allow_origins=["*"]` is explicitly prohibited in the production configuration, preventing cross-origin API abuse from unauthorised web applications.

---

## 10.8 WebSocket Buffer Security

The 15MB WebSocket buffer limit in `Main.py` serves dual security and stability purposes:

1. **OOM Attack Prevention**: A malicious client transmitting extremely large binary payloads over the WebSocket connection cannot exhaust server memory.
2. **DoS Mitigation**: The buffer limit bounds the maximum processing time per WebSocket message, preventing resource exhaustion through deliberately oversized audio frames.

```python
MAX_WS_BUFFER = 15 * 1024 * 1024  # 15MB hard limit

@app.websocket("/ws/stt")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            if len(data) > MAX_WS_BUFFER:
                await websocket.close(code=1009)
                return
            await process_audio_chunk(data, websocket)
    except WebSocketDisconnect:
        await handle_disconnect(websocket)
```

---

## 10.9 Data Privacy Controls

In accordance with India's DPDP Act 2023 and general data privacy best practices:

- **Candidate Consent**: Explicit consent is obtained at registration for data collection and interview recording.
- **Purpose Limitation**: Resume data and interview transcripts are used exclusively for candidate evaluation; no cross-candidate analysis or third-party data sharing.
- **Data Minimisation**: Only the data necessary for evaluation is collected; unnecessary personal details are not solicited.
- **Audit Trail**: All data access and administrative actions are logged in `AuditLog`, enabling data access transparency reporting.
- **Password Isolation**: Password hashes are never included in API responses, even for admin user lookups.

---

## 10.10 Security Controls Matrix

**Table 10.1 — Security Controls Matrix**

| OWASP Risk | Control Implemented | Implementation Location |
|---|---|---|
| A01: Broken Access Control | RBAC via JWT role claims; route-level Depends() | `auth_service.py`, FastAPI routes |
| A02: Cryptographic Failures | Bcrypt password hashing; JWT HS256 signing | `auth_service.py` |
| A03: Injection | SQLAlchemy ORM parameterised queries | All database access code |
| A04: Insecure Design | Pydantic schema validation; input constraints | All API endpoints |
| A05: Security Misconfiguration | Explicit CORS allowlist; ENV-based secrets | `Main.py`, `.env` config |
| A06: Vulnerable Components | Dependency pinning in `requirements.txt` | Project configuration |
| A07: Auth Failures | JWT expiration; bcrypt; login rate limiting | `auth_service.py` |
| A08: Data Integrity Failures | Signed JWT; SQLAlchemy FK constraints | Auth layer, DB layer |
| A09: Logging Failures | Comprehensive `AuditLog` for all events | `audit_service.py` |
| A10: Server-Side Request Forgery | External API calls mediated through service modules only | Service layer |
| WebSocket OOM | 15MB buffer hard limit | `Main.py` WebSocket handler |

---

*End of Chapter 10. Proceed to Chapter 11 — Testing & Validation.*
