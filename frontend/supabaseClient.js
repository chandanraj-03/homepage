/**
 * PrivCloud Supabase Client & Enhanced Authentication Service
 * Supports Email & Username dual login, profile registration, OTP verification,
 * and session state management.
 */

(function () {
    const runtimeConfig = (typeof window !== 'undefined' && window.PRIVCLOUD_CONFIG) ? window.PRIVCLOUD_CONFIG : {};
    let SUPABASE_URL = runtimeConfig.supabaseUrl || "https://qrxjyvezlotjwggtgoqe.supabase.co";
    let SUPABASE_KEY = runtimeConfig.supabaseKey || "sb_publishable_TBuxXwl_-StgMpP1deF7zw_2Z9izNgU";

    let supabaseClient = null;

    function createClientInstance(url, key) {
        if (url && key && typeof supabase !== 'undefined' && supabase.createClient) {
            try {
                supabaseClient = supabase.createClient(url, key, {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                });
                window.supabaseClient = supabaseClient;
                return supabaseClient;
            } catch (e) {
                console.error("[PrivCloud] Failed to create Supabase client:", e);
                return null;
            }
        }
        return null;
    }

    async function waitForSupabaseLibrary(timeoutMs = 3000) {
        const start = Date.now();
        while (typeof supabase === 'undefined' || !supabase.createClient) {
            if (Date.now() - start > timeoutMs) return false;
            await new Promise(res => setTimeout(res, 50));
        }
        return true;
    }

    async function initClientAsync() {
        if (supabaseClient) return supabaseClient;

        await waitForSupabaseLibrary(500);
        if (SUPABASE_URL && SUPABASE_KEY) {
            const client = createClientInstance(SUPABASE_URL, SUPABASE_KEY);
            if (client) return client;
        }

        if (typeof window !== 'undefined' && window.fetch) {
            try {
                const res = await fetch('/api/config');
                if (res.ok) {
                    const cfg = await res.json();
                    if (cfg && cfg.supabaseUrl && cfg.supabaseKey) {
                        SUPABASE_URL = cfg.supabaseUrl;
                        SUPABASE_KEY = cfg.supabaseKey;
                    }
                }
            } catch (err) {
                console.warn("[PrivCloud] Could not load runtime config via /api/config:", err);
            }
        }

        await waitForSupabaseLibrary(2000);
        if (SUPABASE_URL && SUPABASE_KEY) {
            const client = createClientInstance(SUPABASE_URL, SUPABASE_KEY);
            if (client) return client;
        }

        return supabaseClient;
    }

    // Trigger initialization immediately
    initClientAsync();

    async function ensureClient() {
        if (supabaseClient) return supabaseClient;
        const client = await initClientAsync();
        if (!client) {
            await waitForSupabaseLibrary(2000);
            if (SUPABASE_URL && SUPABASE_KEY) {
                createClientInstance(SUPABASE_URL, SUPABASE_KEY);
            }
        }
        if (!supabaseClient) {
            throw new Error("Supabase client is still initializing or could not connect. Please try again.");
        }
        return supabaseClient;
    }

    const PrivCloudAuth = {
        getClient() {
            return supabaseClient;
        },

        getUserDisplayName(user) {
            if (!user) return 'User';
            const meta = user.user_metadata || {};
            return meta.full_name || meta.name || meta.username || (user.email ? user.email.split('@')[0] : 'User');
        },

        async getSession() {
            try {
                const client = await ensureClient();
                const { data, error } = await client.auth.getSession();
                if (error) {
                    console.error("Error getting session:", error);
                    return null;
                }
                return data ? data.session : null;
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
                return data ? data.user : null;
            } catch (e) {
                return null;
            }
        },

        async checkUsernameAvailability(username, fullName = '') {
            try {
                const res = await fetch('/api/auth/check-username', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username.trim(),
                        full_name: (fullName || '').trim()
                    })
                });
                const data = await res.json();
                return {
                    ok: res.ok,
                    status: res.status,
                    available: data.available,
                    valid: data.valid,
                    message: data.message,
                    suggestions: data.suggestions || []
                };
            } catch (err) {
                return {
                    ok: false,
                    status: 500,
                    available: false,
                    valid: false,
                    message: "Unable to verify username availability right now.",
                    suggestions: []
                };
            }
        },

        async resolveIdentifier(identifier) {
            try {
                const res = await fetch('/api/auth/resolve-identifier', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: identifier.trim() })
                });
                const data = await res.json();
                return {
                    ok: res.ok,
                    status: res.status,
                    found: data.found,
                    email: data.email,
                    username: data.username,
                    fullName: data.full_name,
                    message: data.message
                };
            } catch (err) {
                return {
                    ok: false,
                    found: false,
                    message: "Unable to resolve login identifier."
                };
            }
        },

        async registerProfile(fullName, username, email) {
            try {
                const res = await fetch('/api/auth/register-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        full_name: fullName.trim(),
                        username: username.trim(),
                        email: email.trim()
                    })
                });
                const data = await res.json();
                return {
                    ok: res.ok,
                    status: res.status,
                    success: data.success,
                    message: data.message,
                    profile: data.profile
                };
            } catch (err) {
                return {
                    ok: false,
                    success: false,
                    message: "Could not register profile with backend."
                };
            }
        },

        async verifyProfile(email, username = null) {
            try {
                const res = await fetch('/api/auth/verify-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email.trim(),
                        username: username ? username.trim() : null
                    })
                });
                return await res.json();
            } catch (err) {
                return { success: false, message: err.message };
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

        async signUpWithProfile({ fullName, username, email, password }) {
            // 1. Reserve/register profile in backend
            const regRes = await this.registerProfile(fullName, username, email);
            if (!regRes.ok || !regRes.success) {
                return {
                    data: null,
                    error: { message: regRes.message || "Failed to register profile." }
                };
            }

            // 2. Register user in Supabase Auth with metadata
            try {
                const client = await ensureClient();
                const authRes = await client.auth.signUp({
                    email: email.trim(),
                    password: password,
                    options: {
                        data: {
                            full_name: fullName.trim(),
                            username: username.trim(),
                            email: email.trim()
                        }
                    }
                });

                // If Supabase returned an error due to email sending or rate limits, fallback gracefully to OTP verification
                if (authRes && authRes.error) {
                    const errStr = (authRes.error.message || "").toLowerCase();
                    if (errStr.includes("error sending confirmation email") || errStr.includes("rate limit") || errStr.includes("email") || errStr.includes("smtp")) {
                        console.warn("[PrivCloud] Supabase email rate limit encountered, proceeding with verified OTP engine:", authRes.error);
                        return { data: { user: { email: email.trim() } }, error: null };
                    }
                }

                return authRes;
            } catch (err) {
                console.warn("[PrivCloud] Supabase signup exception, fallback:", err);
                return { data: { user: { email: email.trim() } }, error: null };
            }
        },

        async signIn(email, password) {
            const client = await ensureClient();
            return await client.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });
        },

        async signInWithIdentifier(identifier, password) {
            const ident = identifier.trim();
            let targetEmail = ident;

            // If not email format (no @), resolve username to email
            if (!ident.includes('@')) {
                const resolveRes = await this.resolveIdentifier(ident);
                if (!resolveRes.ok || !resolveRes.found || !resolveRes.email) {
                    return {
                        data: null,
                        error: {
                            message: resolveRes.message || `No account found with username '@${ident}'. Please check your spelling or sign up.`
                        }
                    };
                }
                targetEmail = resolveRes.email;
            }

            const client = await ensureClient();
            return await client.auth.signInWithPassword({
                email: targetEmail.trim(),
                password: password
            });
        },

        async signOut() {
            try {
                const client = await ensureClient();
                return await client.auth.signOut();
            } catch (e) {
                console.warn("[PrivCloud] SignOut error:", e);
                return { error: null };
            }
        },

        async verifyOtp(email, token, type = 'signup', username = null) {
            const isReset = (type === 'reset' || type === 'recovery');
            const supabaseType = isReset ? 'recovery' : (type || 'signup');

            // 1. Try Supabase Auth verification
            try {
                const client = await ensureClient();

                let res = await client.auth.verifyOtp({
                    email: email.trim(),
                    token: token.trim(),
                    type: supabaseType
                });

                // If signup failed, also try 'email' type (fallback for email OTPs)
                if (res && res.error && supabaseType === 'signup') {
                    res = await client.auth.verifyOtp({
                        email: email.trim(),
                        token: token.trim(),
                        type: 'email'
                    });
                }

                if (res && !res.error && res.data) {
                    if (!isReset) {
                        await this.verifyProfile(email, username);
                    }
                    return res;
                }

                // If it was a password reset attempt and Supabase returned an error, return that error directly
                if (isReset && res && res.error) {
                    return { data: null, error: { message: res.error.message || "Invalid or expired confirmation code. Please try again." } };
                }
            } catch (e) {
                console.warn("[PrivCloud] Supabase verifyOtp error:", e);
                if (isReset) {
                    return { data: null, error: { message: "Failed to verify confirmation code. Please try again." } };
                }
            }

            // 2. Dynamic OTP verification endpoint (for signup flow only)
            if (!isReset) {
                try {
                    const bRes = await fetch('/api/auth/verify-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: email.trim(), code: token.trim(), type: type, username: username })
                    });
                    const bData = await bRes.json();
                    if (bData.success) {
                        await this.verifyProfile(email, username);
                        return { data: { user: { email: email.trim() } }, error: null };
                    } else {
                        return { data: null, error: { message: bData.message || "Invalid confirmation code. Please try again." } };
                    }
                } catch (err) {
                    return { data: null, error: { message: "Failed to verify OTP code." } };
                }
            }

            return { data: null, error: { message: "Invalid confirmation code. Please check and try again." } };
        },

        async resendOtp(email, type = 'signup') {
            const isReset = (type === 'reset' || type === 'recovery');
            const supabaseType = isReset ? 'recovery' : (type || 'signup');

            try {
                const client = await ensureClient();
                if (isReset) {
                    // For password reset, re-trigger the recovery email
                    await client.auth.resetPasswordForEmail(email.trim(), {
                        redirectTo: window.location.origin + '/auth_page/auth.html#reset-password'
                    });
                    return { success: true, message: "A new confirmation code has been sent to your email." };
                } else {
                    await client.auth.resend({
                        type: supabaseType,
                        email: email.trim()
                    });
                }
            } catch (e) {
                console.warn("[PrivCloud] Resend OTP error:", e);
            }

            if (!isReset) {
                try {
                    const res = await fetch('/api/auth/resend-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: email.trim(), type: type })
                    });
                    return await res.json();
                } catch (err) {
                    return { success: true, message: "Code resent." };
                }
            }

            return { success: true, message: "A new confirmation code has been sent to your email." };
        },

        async resetPassword(identifier) {
            const ident = identifier.trim();
            let targetEmail = ident;

            if (!ident.includes('@')) {
                const resolveRes = await this.resolveIdentifier(ident);
                if (!resolveRes.ok || !resolveRes.found || !resolveRes.email) {
                    return {
                        data: null,
                        error: {
                            message: resolveRes.message || `No account found with username '@${ident}'.`
                        }
                    };
                }
                targetEmail = resolveRes.email;
            }

            const client = await ensureClient();
            const res = await client.auth.resetPasswordForEmail(targetEmail.trim(), {
                redirectTo: window.location.origin + '/auth_page/auth.html#reset-password'
            });

            if (res && res.error) {
                return { error: res.error };
            }

            return { email: targetEmail, data: res.data, error: null };
        },

        async updatePassword(email, newPassword) {
            // 1. Try Supabase Client updateUser first (if session is authenticated from verifyOtp)
            try {
                const client = await ensureClient();
                const { data, error } = await client.auth.updateUser({
                    password: newPassword
                });
                if (!error && data) {
                    return { data: data, error: null };
                }
            } catch (e) {
                console.warn("[PrivCloud] Client updateUser fallback to Admin API:", e);
            }

            // 2. Admin API fallback via backend
            try {
                const res = await fetch('/api/auth/update-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: (email || '').trim(),
                        new_password: newPassword
                    })
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    return { error: { message: data.message || "Failed to update password." } };
                }
                return { data: data, error: null };
            } catch (err) {
                return { error: { message: err.message || "Failed to update password." } };
            }
        },

        async signInWithGoogle(redirectTo) {
            try {
                const client = await ensureClient();
                const targetRedirect = redirectTo || (window.location.origin + window.location.pathname + window.location.search);
                return await client.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: targetRedirect,
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'select_account'
                        }
                    }
                });
            } catch (err) {
                console.error("[PrivCloud] Google sign-in failed:", err);
                return { data: null, error: { message: err.message || "Failed to initialize Google authentication." } };
            }
        }
    };

    window.PrivCloudAuth = PrivCloudAuth;
    window.supabaseClient = supabaseClient;
})();
