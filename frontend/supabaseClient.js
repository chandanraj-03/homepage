/**
 * PrivCloud Supabase Client Configuration
 */

// Retrieve runtime configuration (from gitignored config.js or environment)
const runtimeConfig = (typeof window !== 'undefined' && window.PRIVCLOUD_CONFIG) ? window.PRIVCLOUD_CONFIG : {};
const SUPABASE_URL = runtimeConfig.supabaseUrl || "";
const SUPABASE_KEY = runtimeConfig.supabaseKey || "";

// Initialize Supabase Client
let supabaseClient = null;

function initSupabaseClient(url, key) {
    if (url && key && typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(url, key, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
        window.supabaseClient = supabaseClient;
        return supabaseClient;
    }
    return null;
}

if (SUPABASE_URL && SUPABASE_KEY) {
    initSupabaseClient(SUPABASE_URL, SUPABASE_KEY);
} else if (typeof window !== 'undefined' && window.fetch) {
    // Dynamic fetch from backend /api/config if not in window.PRIVCLOUD_CONFIG
    fetch('/api/config')
        .then(res => res.json())
        .then(cfg => {
            if (cfg.supabaseUrl && cfg.supabaseKey) {
                initSupabaseClient(cfg.supabaseUrl, cfg.supabaseKey);
            }
        })
        .catch(() => {});
}

// Helper authentication methods
const PrivCloudAuth = {
    getClient() {
        return supabaseClient;
    },

    async getSession() {
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) {
            console.error("Error getting session:", error);
            return null;
        }
        return data.session;
    },

    async getUser() {
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.auth.getUser();
        if (error) {
            console.error("Error getting user:", error);
            return null;
        }
        return data.user;
    },

    async signUp(email, password, metadata = {}) {
        if (!supabaseClient) throw new Error("Supabase client is not initialized.");
        return await supabaseClient.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                data: metadata
            }
        });
    },

    async signIn(email, password) {
        if (!supabaseClient) throw new Error("Supabase client is not initialized.");
        return await supabaseClient.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });
    },

    async signOut() {
        if (!supabaseClient) throw new Error("Supabase client is not initialized.");
        return await supabaseClient.auth.signOut();
    },

    async verifyOtp(email, token, type = 'signup') {
        if (!supabaseClient) throw new Error("Supabase client is not initialized.");
        return await supabaseClient.auth.verifyOtp({
            email: email.trim(),
            token: token.trim(),
            type: type
        });
    },

    async resendOtp(email, type = 'signup') {
        if (!supabaseClient) throw new Error("Supabase client is not initialized.");
        return await supabaseClient.auth.resend({
            type: type,
            email: email.trim()
        });
    },

    async resetPassword(email) {
        if (!supabaseClient) throw new Error("Supabase client is not initialized.");
        return await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin + '/auth.html#reset-password'
        });
    }
};

window.supabaseClient = supabaseClient;
window.PrivCloudAuth = PrivCloudAuth;
