/**
 * PrivCloud Supabase Client Configuration
 */

(function () {
    const runtimeConfig = (typeof window !== 'undefined' && window.PRIVCLOUD_CONFIG) ? window.PRIVCLOUD_CONFIG : {};
    let SUPABASE_URL = runtimeConfig.supabaseUrl || "";
    let SUPABASE_KEY = runtimeConfig.supabaseKey || "";

    let supabaseClient = null;
    let initPromise = null;

    function createClientInstance(url, key) {
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

    function initClientAsync() {
        if (supabaseClient) return Promise.resolve(supabaseClient);
        if (initPromise) return initPromise;

        if (SUPABASE_URL && SUPABASE_KEY) {
            const client = createClientInstance(SUPABASE_URL, SUPABASE_KEY);
            if (client) return Promise.resolve(client);
        }

        if (typeof window !== 'undefined' && window.fetch) {
            initPromise = fetch('/api/config')
                .then(res => res.json())
                .then(cfg => {
                    if (cfg.supabaseUrl && cfg.supabaseKey) {
                        SUPABASE_URL = cfg.supabaseUrl;
                        SUPABASE_KEY = cfg.supabaseKey;
                        return createClientInstance(cfg.supabaseUrl, cfg.supabaseKey);
                    }
                    return null;
                })
                .catch(err => {
                    console.warn("Could not load runtime config:", err);
                    return null;
                });
            return initPromise;
        }
        return Promise.resolve(null);
    }

    // Trigger initialization immediately
    initClientAsync();

    async function ensureClient() {
        if (supabaseClient) return supabaseClient;
        await initClientAsync();
        if (!supabaseClient) {
            throw new Error("Supabase client is still initializing or could not connect. Please try again.");
        }
        return supabaseClient;
    }

    const PrivCloudAuth = {
        getClient() {
            return supabaseClient;
        },

        async getSession() {
            try {
                const client = await ensureClient();
                const { data, error } = await client.auth.getSession();
                if (error) {
                    console.error("Error getting session:", error);
                    return null;
                }
                return data.session;
            } catch (e) {
                return null;
            }
        },

        async getUser() {
            try {
                const client = await ensureClient();
                const { data, error } = await client.auth.getUser();
                if (error) {
                    console.error("Error getting user:", error);
                    return null;
                }
                return data.user;
            } catch (e) {
                return null;
            }
        },

        async signUp(email, password, metadata = {}) {
            const client = await ensureClient();
            return await client.auth.signUp({
                email: email.trim(),
                password: password,
                options: {
                    data: metadata
                }
            });
        },

        async signIn(email, password) {
            const client = await ensureClient();
            return await client.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });
        },

        async signOut() {
            const client = await ensureClient();
            return await client.auth.signOut();
        },

        async verifyOtp(email, token, type = 'signup') {
            const client = await ensureClient();
            return await client.auth.verifyOtp({
                email: email.trim(),
                token: token.trim(),
                type: type
            });
        },

        async resendOtp(email, type = 'signup') {
            const client = await ensureClient();
            return await client.auth.resend({
                type: type,
                email: email.trim()
            });
        },

        async resetPassword(email) {
            const client = await ensureClient();
            return await client.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: window.location.origin + '/auth.html#reset-password'
            });
        }
    };

    window.PrivCloudAuth = PrivCloudAuth;
    window.supabaseClient = supabaseClient;
})();
