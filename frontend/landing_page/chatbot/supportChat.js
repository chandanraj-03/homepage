/**
 * PrivCloud — Live Customer Support Client (supportChat.js)
 * Connects directly to deployed Render Support Chat services:
 * - Direct Base: https://support-chat-api.onrender.com
 * - Backend Proxy: /api/support
 * Handles authenticated customer session payload, Pro VIP priority queueing, and message delivery.
 */

(function () {
    'use strict';

    const DIRECT_API_BASE = "https://support-chat-api.onrender.com";
    
    function resolveProxyBase() {
        if (typeof window !== 'undefined' && window.getPrivCloudApiUrl) {
            return window.getPrivCloudApiUrl('/api/support');
        }
        const cfg = (typeof window !== 'undefined' && window.PRIVCLOUD_CONFIG) ? window.PRIVCLOUD_CONFIG : {};
        if (cfg.backendUrl) {
            return `${cfg.backendUrl.replace(/\/+$/, '')}/api/support`;
        }
        if (typeof window === 'undefined') return '/api/support';
        const port = window.location.port;
        const hostname = window.location.hostname;
        if (port === '5001' || (!port && hostname !== 'localhost' && hostname !== '127.0.0.1')) {
            return '/api/support';
        }
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://127.0.0.1:5001/api/support';
        }
        return '/api/support';
    }

    const PROXY_API_BASE = resolveProxyBase();
    const WS_URL = DIRECT_API_BASE.replace("https://", "wss://").replace("http://", "ws://");
    const SESSION_STORAGE_KEY = "privcloud_live_support_session_v4";

    const state = {
        accessToken: null,
        conversationId: null,
        customerId: null,
        customerName: "",
        customerEmail: "",
        planTier: "basic",
        isVip: false,
        isConnected: false,
        messages: [],
        allowAttachments: false,
        pollInterval: null,
        websocket: null,
        pingInterval: null
    };

    /**
     * Initialize customer context from Supabase or localStorage
     */
    async function resolveCustomerContext() {
        let email = "";
        let name = "";
        let plan = "basic";
        let isVip = false;

        // 1. Check Supabase Auth
        if (window.PrivCloudAuth && window.PrivCloudAuth.getSession) {
            try {
                const session = await window.PrivCloudAuth.getSession();
                if (session && session.user) {
                    email = session.user.email || "";
                    const meta = session.user.user_metadata || {};
                    name = meta.full_name || meta.name || email.split('@')[0];
                    const detectedPlan = (meta.plan_tier || meta.plan || "").toLowerCase();
                    if (detectedPlan === 'pro' || email.includes('admin') || meta.is_admin) {
                        plan = 'pro';
                        isVip = true;
                    }
                }
            } catch (e) {}
        }

        // 2. Check localStorage
        if (!email) {
            try {
                const localUser = localStorage.getItem('privcloud_auth_user');
                if (localUser) {
                    const u = JSON.parse(localUser);
                    email = u.email || "";
                    name = u.fullName || u.username || (email ? email.split('@')[0] : "");
                    if ((u.plan || "").toLowerCase() === 'pro') {
                        plan = 'pro';
                        isVip = true;
                    }
                }
            } catch (e) {}
        }

        // 3. Check custom customer identity
        try {
            const customIdent = localStorage.getItem('privcloud_customer_identity');
            if (customIdent) {
                const parsed = JSON.parse(customIdent);
                if (parsed.name && (!name || name === "Customer")) name = parsed.name;
                if (parsed.email && (!email || email.includes("privcloud.com"))) email = parsed.email;
            }
        } catch (e) {}

        if (!email || !email.includes('@') || email.endsWith('.local')) {
            email = null;
        }

        state.customerEmail = email;
        state.customerName = name || (email ? email.split('@')[0] : "Visitor");
        state.planTier = plan;
        state.isVip = isVip || (plan === 'pro') || (email && (email.includes('pro') || email.includes('admin')));

        // Restore active session ID
        try {
            const saved = localStorage.getItem(SESSION_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.accessToken && parsed.conversationId) {
                    state.accessToken = parsed.accessToken;
                    state.conversationId = parsed.conversationId;
                    state.customerId = parsed.customerId;
                    state.messages = parsed.messages || [];
                }
            }
        } catch (e) {}
    }

    /**
     * Start or restore live support session with Render
     */
    async function startSupportSession() {
        await resolveCustomerContext();

        if (!state.accessToken || !state.conversationId) {
            const tierTag = (state.isVip || state.planTier === "pro") ? "[👑 Pro VIP]" : "[⭐ Basic]";
            const formattedName = `${tierTag} ${state.customerName}`;
            const sessionPayload = {
                name: formattedName,
                email: state.customerEmail,
                external_customer_id: `cust_${state.planTier}_${Date.now()}`
            };

            let sessionData = null;

            // Try direct Render API
            try {
                const res = await fetch(`${DIRECT_API_BASE}/api/v1/customer/session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sessionPayload)
                });
                if (res.ok) {
                    sessionData = await res.json();
                }
            } catch (err) {}

            // Fallback to proxy
            if (!sessionData) {
                try {
                    const proxyRes = await fetch(`${PROXY_API_BASE}/session`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(sessionPayload)
                    });
                    if (proxyRes.ok) {
                        sessionData = await proxyRes.json();
                    }
                } catch (e) {}
            }

            if (sessionData && sessionData.access_token) {
                state.accessToken = sessionData.access_token;
                state.conversationId = sessionData.conversation_id;
                state.customerId = sessionData.customer_id;
                state.allowAttachments = Boolean(sessionData.allow_customer_attachments);
                state.isConnected = true;
                saveSession();
            }
        } else {
            state.isConnected = true;
        }

        connectWebSocket();
        startPolling();
        return state;
    }

    /**
     * WebSocket Real-time connector
     */
    function connectWebSocket() {
        if (!state.accessToken) return;
        if (state.websocket) {
            try { state.websocket.close(); } catch (_) {}
        }
        clearInterval(state.pingInterval);

        try {
            state.websocket = new WebSocket(`${WS_URL}/ws/customer?token=${encodeURIComponent(state.accessToken)}`);
        } catch (e) {
            return;
        }

        state.websocket.onopen = function() {
            state.pingInterval = setInterval(() => {
                if (state.websocket && state.websocket.readyState === WebSocket.OPEN) {
                    state.websocket.send(JSON.stringify({ type: "ping" }));
                }
            }, 25000);
        };

        state.websocket.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "message" && data.message) {
                    const m = data.message;
                    if (m.sender_type === "agent" || m.sender_type === "admin") {
                        if (!state.messages.some(existing => existing.id === m.id)) {
                            let text = m.content || "";
                            if (m.attachment && m.attachment.url) {
                                const rawUrl = m.attachment.url;
                                const fullUrl = rawUrl.startsWith("http") ? rawUrl : `${DIRECT_API_BASE}${rawUrl}`;
                                text = (text ? text + "\n\n" : "") + `📷 [Attached Image: ${m.attachment.name || 'image'}](${fullUrl})`;
                            }
                            const agentMsg = {
                                id: m.id,
                                sender: 'agent',
                                name: state.isVip ? 'PrivCloud Senior Support Engineer' : 'PrivCloud Support Engineer',
                                text: text,
                                attachment: m.attachment || null,
                                timestamp: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            };
                            state.messages.push(agentMsg);
                            saveSession();
                            window.dispatchEvent(new CustomEvent('privcloud:support_message', { detail: agentMsg }));
                        }
                    }
                } else if (data.type === "attachment_permission") {
                    state.allowAttachments = Boolean(data.allowed);
                    window.dispatchEvent(new CustomEvent('privcloud:attachment_permission', { detail: { allowed: state.allowAttachments } }));
                }
            } catch (_) {}
        };

        state.websocket.onclose = function() {
            clearInterval(state.pingInterval);
        };
    }

    /**
     * Upload an image attachment to Support Chat backend (Max 10 MB)
     */
    async function uploadFile(file) {
        if (!file) return null;
        if (file.size > 10 * 1024 * 1024) {
            throw new Error("File exceeds 10 MB maximum limit");
        }
        if (!state.accessToken) {
            await startSupportSession();
        }
        const formData = new FormData();
        formData.append("upload", file, file.name);

        try {
            const res = await fetch(`${DIRECT_API_BASE}/api/v1/files`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${state.accessToken}` },
                body: formData
            });
            if (res.ok) return await res.json();
        } catch (e) {}

        try {
            const proxyRes = await fetch(`${PROXY_API_BASE}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${state.accessToken}` },
                body: formData
            });
            if (proxyRes.ok) return await proxyRes.json();
        } catch (e) {}

        return null;
    }

    /**
     * Send customer message to Render Support Chat API
     */
    async function sendMessage(text, attachment = null) {
        if ((!text || !text.trim()) && !attachment) return null;
        if (!state.conversationId || !state.accessToken) {
            await startSupportSession();
        }

        const cleanText = (text || "").trim();
        const userMessage = {
            id: `msg_${Date.now()}`,
            sender: 'customer',
            name: state.customerName,
            text: cleanText,
            attachment: attachment || null,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            is_vip: state.isVip
        };

        state.messages.push(userMessage);
        saveSession();

        const postBody = { content: cleanText };
        if (attachment) postBody.attachment = attachment;

        // 1. Try Direct Render POST
        let sendSuccess = false;
        try {
            const res = await fetch(`${DIRECT_API_BASE}/api/v1/customer/conversations/${state.conversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postBody)
            });
            if (res.ok) sendSuccess = true;
        } catch (err) {}

        // 2. Fallback to Proxy POST
        if (!sendSuccess) {
            try {
                const proxyRes = await fetch(`${PROXY_API_BASE}/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        conversation_id: state.conversationId,
                        access_token: state.accessToken,
                        content: cleanText,
                        attachment: attachment,
                        email: state.customerEmail || null,
                        name: state.customerName || "Customer",
                        external_customer_id: state.customerId || null
                    })
                });
                if (proxyRes.ok) {
                    sendSuccess = true;
                    const resData = await proxyRes.json().catch(() => ({}));
                    if (resData && resData.fresh_session) {
                        state.conversationId = resData.fresh_session.conversation_id;
                        state.accessToken = resData.fresh_session.access_token;
                        state.customerId = resData.fresh_session.customer_id;
                        saveSession();
                    }
                }
            } catch (e) {}
        }

        return userMessage;
    }

    /**
     * Poll for new agent messages from Render
     */
    function startPolling() {
        if (state.pollInterval) clearInterval(state.pollInterval);

        state.pollInterval = setInterval(async () => {
            if (!state.conversationId || !state.accessToken) return;

            let messagesList = null;

            try {
                const res = await fetch(`${DIRECT_API_BASE}/api/v1/customer/conversations/${state.conversationId}/messages`, {
                    headers: { 'Authorization': `Bearer ${state.accessToken}` }
                });
                if (res.ok) messagesList = await res.json();
            } catch (e) {}

            if (!messagesList) {
                try {
                    const proxyRes = await fetch(`${PROXY_API_BASE}/messages?conversation_id=${encodeURIComponent(state.conversationId)}&access_token=${encodeURIComponent(state.accessToken)}`);
                    if (proxyRes.ok) messagesList = await proxyRes.json();
                } catch (e) {}
            }

            if (Array.isArray(messagesList)) {
                let hasNew = false;
                for (const m of messagesList) {
                    const isStaff = m.sender_type === 'agent' || m.sender_type === 'admin';
                    if (isStaff && !state.messages.some(existing => existing.id === m.id)) {
                        let text = m.content || "";
                        if (m.attachment && m.attachment.url) {
                            const rawUrl = m.attachment.url;
                            const fullUrl = rawUrl.startsWith("http") ? rawUrl : `${DIRECT_API_BASE}${rawUrl}`;
                            text = (text ? text + "\n\n" : "") + `📷 [Attached Image: ${m.attachment.name || 'image'}](${fullUrl})`;
                        }
                        const agentMsg = {
                            id: m.id,
                            sender: 'agent',
                            name: 'PrivCloud Support Engineer',
                            text: text,
                            attachment: m.attachment || null,
                            timestamp: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        };
                        state.messages.push(agentMsg);
                        hasNew = true;
                        window.dispatchEvent(new CustomEvent('privcloud:support_message', { detail: agentMsg }));
                    }
                }
                if (hasNew) saveSession();
            }
        }, 4000);
    }

    function saveSession() {
        try {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
                accessToken: state.accessToken,
                conversationId: state.conversationId,
                customerId: state.customerId,
                customerEmail: state.customerEmail,
                customerName: state.customerName,
                planTier: state.planTier,
                isVip: state.isVip,
                messages: state.messages.slice(-50)
            }));
        } catch (e) {}
    }

    // Public API
    window.PrivCloudSupportChat = {
        DIRECT_API_BASE,
        startSession: startSupportSession,
        sendMessage: sendMessage,
        uploadFile: uploadFile,
        getState: () => ({ ...state }),
        clearSession: () => {
            if (state.pollInterval) clearInterval(state.pollInterval);
            state.accessToken = null;
            state.conversationId = null;
            state.messages = [];
            localStorage.removeItem(SESSION_STORAGE_KEY);
        }
    };

})();
