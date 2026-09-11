/**
 * PrivCloud Frontend Runtime Configuration
 *
 * How to configure:
 * 1. For Vercel: You can leave backendUrl empty if you set up the Render URL in vercel.json rewrites,
 *    OR uncomment and set your live Render backend URL below:
 *    window.PRIVCLOUD_CONFIG.backendUrl = "https://privcloud-backend.onrender.com";
 *
 * 2. You can also override the backend URL dynamically in the browser console at any time:
 *    localStorage.setItem('PRIVCLOUD_BACKEND_URL', 'https://your-backend.onrender.com');
 */

window.PRIVCLOUD_CONFIG = window.PRIVCLOUD_CONFIG || {
    // Leave blank for automatic relative routing (/api/...) or enter your deployed Render backend URL:
    backendUrl: "",

    // Supabase credentials are automatically fetched from .env via /api/config.
    // Leave blank so no sensitive keys or endpoints are hardcoded in source files:
    supabaseUrl: "",
    supabaseKey: ""
};
