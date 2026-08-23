/**
 * PrivCloud Supabase Client Configuration
 */

const SUPABASE_URL = "https://qrxjyvezlotjwggtgoqe.supabase.co";
const SUPABASE_KEY = "sb_publishable_TBuxXwl_-StgMpP1deF7zw_2Z9izNgU";

// Initialize Supabase Client
let supabaseClient = null;

if (typeof supabase !== 'undefined' && supabase.createClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
} else {
    console.warn("Supabase SDK script not loaded before supabaseClient.js");
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

    async resetPassword(email) {
        if (!supabaseClient) throw new Error("Supabase client is not initialized.");
        return await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin + '/auth.html#reset-password'
        });
    }
};

window.supabaseClient = supabaseClient;
window.PrivCloudAuth = PrivCloudAuth;
