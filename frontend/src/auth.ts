import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    // VITE_NEON_AUTH_BASE_URL should point to your Neon Auth endpoint
    baseURL: import.meta.env.VITE_NEON_AUTH_BASE_URL || "http://localhost:3000",
})
