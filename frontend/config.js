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

const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:');

window.PRIVCLOUD_CONFIG = window.PRIVCLOUD_CONFIG || {
    // Automatically routes to local FastAPI backend when testing locally, or to deployed Render backend in production
    backendUrl: isLocalhost ? "http://127.0.0.1:5001" : "https://privcloud-backend.onrender.com",

    // Supabase public credentials (protected by PostgreSQL Row-Level Security)
    supabaseUrl: "https://qrxjyvezlotjwggtgoqe.supabase.co",
    supabaseKey: "sb_publishable_TBuxXwl_-StgMpP1deF7zw_2Z9izNgU"
};
