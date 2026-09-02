import os
import urllib.request
import json
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

security = HTTPBearer(auto_error=False)

JWKS_URL = os.getenv("NEON_AUTH_JWKS_URL")
ISSUER = os.getenv("NEON_AUTH_BASE_URL")

# Cache JWKS
jwks_cache = None

def get_jwks():
    global jwks_cache
    if not jwks_cache and JWKS_URL:
        try:
            with urllib.request.urlopen(JWKS_URL) as response:
                jwks_cache = json.loads(response.read().decode("utf-8"))
        except Exception as e:
            print(f"Failed to fetch JWKS: {e}")
            jwks_cache = {}
    return jwks_cache

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # If no NEON_AUTH_JWKS_URL is provided, bypass auth for local development
    if not JWKS_URL:
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
                issuer=ISSUER,
                options={"verify_aud": False} 
            )
            return payload
        else:
            raise HTTPException(status_code=401, detail="Invalid token signature key (kid not found)")
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")

async def require_auth(user: dict = Depends(get_current_user)):
    if user.get("sub") == "anonymous" and JWKS_URL:
        raise HTTPException(status_code=401, detail="Strict authentication required for this route.")
    return user
