import os
import time
import urllib.request
import json
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

security = HTTPBearer(auto_error=False)

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
ISSUER = f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}" if FIREBASE_PROJECT_ID else None

# Cache JWKS with 1-hour TTL (Google rotates keys periodically)
_jwks_cache: dict | None = None
_jwks_cache_expiry: float = 0.0
JWKS_TTL_SECONDS = 3600  # 1 hour

def get_jwks():
    global _jwks_cache, _jwks_cache_expiry
    now = time.time()
    if _jwks_cache and now < _jwks_cache_expiry:
        return _jwks_cache
    try:
        with urllib.request.urlopen(JWKS_URL, timeout=10) as response:
            _jwks_cache = json.loads(response.read().decode("utf-8"))
            _jwks_cache_expiry = now + JWKS_TTL_SECONDS
    except Exception as e:
        print(f"Failed to fetch JWKS: {e}")
        # If we have a stale cache, return it rather than failing hard
        if _jwks_cache:
            return _jwks_cache
        _jwks_cache = {}
    return _jwks_cache

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    is_production = os.getenv("ENVIRONMENT") == "production"
    
    # If no FIREBASE_PROJECT_ID is provided, bypass auth for local development ONLY
    if not FIREBASE_PROJECT_ID:
        if is_production:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication is misconfigured. FIREBASE_PROJECT_ID is missing in production."
            )
        return {"sub": "anonymous"}
        
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Provide a Bearer token in the Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = credentials.credentials
    jwks = get_jwks()
    
    try:
        # Get unverified header to find the kid
        unverified_header = jwt.get_unverified_header(token)
        rsa_key = {}
        if "kid" in unverified_header:
            for key in jwks.get("keys", []):
                if key["kid"] == unverified_header["kid"]:
                    rsa_key = {
                        "kty": key["kty"],
                        "kid": key["kid"],
                        "use": key["use"],
                        "n": key["n"],
                        "e": key["e"]
                    }
                    break
        
        if rsa_key:
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                audience=FIREBASE_PROJECT_ID,
                issuer=ISSUER,
            )
            return payload
        else:
            raise HTTPException(status_code=401, detail="Invalid token signature key (kid not found)")
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")

async def require_auth(user: dict = Depends(get_current_user)):
    if user.get("sub") == "anonymous" and FIREBASE_PROJECT_ID:
        raise HTTPException(status_code=401, detail="Strict authentication required for this route.")
    return user
