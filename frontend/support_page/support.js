/**
 * PrivCloud — Dedicated Customer Support Page Controller (support.js)
 * Live 2-way real-time integration with deployed FastAPI Render Service:
 * - Direct: https://support-chat-api.onrender.com
 * - Resilient Proxy: /api/support
 * Handles customer authentication, JWT access tokens, conversation IDs,
 * live bi-directional messaging, and VIP priority routing.
 */

(function () {
    'use strict';

    const DIRECT_API_BASE = "https://support-chat-api.onrender.com";
    
    function resolveProxyBase() {
        if (typeof window === 'undefined') return '/api/support';
        const port = window.location.port;
        // If on standard 5001 port or hosted production, use relative path
        if (port === '5001' || (!port && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')) {
            return '/api/support';
        }
        // If loaded on a secondary dev port (e.g. 8000, 5173, 3000), target PrivCloud backend on port 5001
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:5001/api/support';
        }
        return '/api/support';
    }

    const PROXY_API_BASE = resolveProxyBase();
    const SESSION_STORAGE_KEY = "privcloud_render_support_session_v9";

    // Clean up stale session keys from older versions
    try {
        ['privcloud_render_support_session_v1', 'privcloud_render_support_session_v2', 'privcloud_render_support_session_v3', 'privcloud_render_support_session_v4', 'privcloud_render_support_session_v5', 'privcloud_render_support_session_v6', 'privcloud_render_support_session_v7', 'privcloud_render_support_session_v8'].forEach(k => localStorage.removeItem(k));
    } catch (e) {}

    const state = {
        accessToken: null,
        conversationId: null,
        customerId: null,
        customerName: "Valued Customer",
        customerEmail: "customer@privcloud.com",
        externalCustomerId: null,
        planTier: "guest",
        isVip: false,
        allowAttachments: false,
        selectedFile: null,
        isUploading: false,
        messages: [],
        pollTimer: null,
        isSending: false,
        isConnected: false,
        lastMessageCount: 0
    };

    document.addEventListener("DOMContentLoaded", async () => {
        const isEligible = await verifyCustomerLicenseGate();
        if (isEligible) {
            await initializeRenderSession();
            bindEvents();
            startMessagePolling();
        }
    });

    /**
     * Strictly verifies that the customer is logged in AND owns an active Basic or Pro license.
     * Without login and without purchase, the support desk is locked.
     */
    async function verifyCustomerLicenseGate() {
        const loadingGate = document.getElementById("support-loading-gate");
        const lockedGate = document.getElementById("support-locked-gate");
        const activeChat = document.getElementById("support-active-chat");

        let email = "";
        let name = "";
        let plan = "";
        let isVip = false;

        // 1. Check Supabase Auth
        if (window.PrivCloudAuth && window.PrivCloudAuth.getSession) {
            try {
                const session = await window.PrivCloudAuth.getSession();
                if (session && session.user) {
                    email = session.user.email || "";
                    const meta = session.user.user_metadata || {};
                    name = meta.full_name || meta.name || email.split('@')[0];
                }
            } catch (e) {}
        }

        // 2. Check localStorage auth
        if (!email) {
            try {
                const saved = localStorage.getItem('privcloud_auth_user');
                if (saved) {
                    const u = JSON.parse(saved);
                    email = u.email || "";
                    name = u.fullName || u.username || "";
                }
            } catch (e) {}
        }

        // Strictly verify license with backend
        let isAuthorized = false;
        if (email) {
            try {
                const res = await fetch(`/api/feedback/verify-eligibility?email=${encodeURIComponent(email)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.eligible && (data.plan_tier === 'basic' || data.plan_tier === 'pro')) {
                        isAuthorized = true;
                        plan = data.plan_tier;
                        isVip = data.is_vip || (plan === 'pro');
                        name = name || data.userName || email.split('@')[0];
                    }
                }
            } catch (e) {
                console.warn("[Support] Verification error:", e);
            }
        }

        if (loadingGate) loadingGate.style.display = "none";

        if (!isAuthorized) {
            // Block access: show locked gate
            if (lockedGate) lockedGate.style.display = "block";
            if (activeChat) activeChat.style.display = "none";
            return false;
        }

        // Verified buyer unlocked
        state.customerEmail = email;
        state.customerName = name || email.split('@')[0];
        state.planTier = plan;
        state.isVip = isVip;
        state.externalCustomerId = `priv_${cleanEmailForId(email)}`;

        if (lockedGate) lockedGate.style.display = "none";
        if (activeChat) activeChat.style.display = "grid";

        updateCustomerUI();
        return true;
    }

    function cleanEmailForId(email) {
        if (!email) return `cust_${Date.now()}`;
        return email.trim().toLowerCase().replace('@', '_').replace(/\./g, '_');
    }

    /**
     * Update customer profile card in sidebar
     */
    function updateCustomerUI() {
        const nameEl = document.getElementById("customer-display-name");
        const emailEl = document.getElementById("customer-display-email");
        const avatarEl = document.getElementById("customer-display-avatar");
        const tierEl = document.getElementById("customer-display-tier");
        const vipBox = document.getElementById("customer-vip-banner");

        if (nameEl) nameEl.textContent = state.customerName;
        if (emailEl) emailEl.textContent = state.customerEmail;
        if (avatarEl) {
            const initials = state.customerName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
            avatarEl.textContent = initials || "CU";
        }

        if (tierEl) {
            if (state.isVip || state.planTier === "pro") {
                tierEl.className = "tier-badge-pill tier-pro";
                tierEl.innerHTML = `<span>👑</span><span>Pro Lifetime License • VIP</span>`;
            } else if (state.planTier === "basic") {
                tierEl.className = "tier-badge-pill tier-basic";
                tierEl.innerHTML = `<span>⭐</span><span>Basic Lifetime License</span>`;
            } else {
                tierEl.className = "tier-badge-pill tier-guest";
                tierEl.innerHTML = `<span>🛡️</span><span>Community Customer</span>`;
            }
        }

        if (vipBox) {
            vipBox.style.display = state.isVip ? "flex" : "none";
        }
    }

    /**
     * Initialize Session with Render backend API
     */
    async function initializeRenderSession(forceRefresh = false) {
        updateStatusIndicator("connecting", "Connecting to Live Support Desk...");

        if (forceRefresh) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            state.accessToken = null;
            state.conversationId = null;
            state.allowAttachments = false;
        }

        // Check saved session
        if (!forceRefresh) {
            try {
                const saved = localStorage.getItem(SESSION_STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.accessToken && parsed.conversationId) {
                        state.accessToken = parsed.accessToken;
                        state.conversationId = parsed.conversationId;
                        state.customerId = parsed.customerId;
                        state.externalCustomerId = parsed.externalCustomerId || state.externalCustomerId;
                        state.allowAttachments = Boolean(parsed.allowAttachments);

                        // Strictly verify that this conversation actually still exists on Render
                        let isValid = false;
                        try {
                            const ping = await fetch(`${DIRECT_API_BASE}/api/v1/customer/conversations/${state.conversationId}/messages`, {
                                headers: { 'Authorization': `Bearer ${state.accessToken}` }
                            });
                            if (ping.ok) {
                                isValid = true;
                            }
                        } catch (e) {}

                        // If direct ping failed, verify via backend proxy
                        if (!isValid) {
                            try {
                                const proxyPing = await fetch(`${PROXY_API_BASE}/messages?conversation_id=${encodeURIComponent(state.conversationId)}&access_token=${encodeURIComponent(state.accessToken)}`);
                                if (proxyPing.ok) {
                                    isValid = true;
                                }
                            } catch (e) {}
                        }

                        // If NOT verified valid on Render, discard dead session immediately!
                        if (!isValid) {
                            console.warn("[SupportChat] Stale or deleted session detected on Render, requesting fresh session...");
                            localStorage.removeItem(SESSION_STORAGE_KEY);
                            state.accessToken = null;
                            state.conversationId = null;
                        }
                    }
                }
            } catch (e) {}
        }

        // If no existing session, request new one from Render
        if (!state.accessToken || !state.conversationId) {
            const sessionPayload = {
                name: state.customerName,
                email: state.customerEmail,
                external_customer_id: state.externalCustomerId || `priv_${cleanEmailForId(state.customerEmail)}`
            };

            let sessionData = null;

            // 1. Try direct Render API first
            try {
                const directRes = await fetch(`${DIRECT_API_BASE}/api/v1/customer/session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sessionPayload)
                });
                if (directRes.ok) {
                    sessionData = await directRes.json();
                } else {
                    console.warn("[SupportChat] Direct Render session returned status:", directRes.status);
                }
            } catch (err) {
                console.warn("[SupportChat] Direct Render connection notice, falling back to proxy:", err);
            }

            // 2. Fallback to resilient backend proxy
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
                } catch (e) {
                    console.error("[SupportChat] Proxy session failure:", e);
                }
            }

            if (sessionData && sessionData.access_token) {
                state.accessToken = sessionData.access_token;
                state.conversationId = sessionData.conversation_id;
                state.customerId = sessionData.customer_id;
                state.allowAttachments = Boolean(sessionData.allow_customer_attachments);
                state.isConnected = true;
                saveSessionToStorage();
                updateStatusIndicator("online", "Live Engineering Support Desk Online");
            } else {
                updateStatusIndicator("error", "Reconnecting to Live Support Desk...");
                return false;
            }
        } else {
            state.isConnected = true;
            updateStatusIndicator("online", "Live Engineering Support Desk Online");
            // Check latest attachment permission from server for restored session
            syncConversationStatus();
        }

        // Update attachment button & lock indicator based on server permission
        updateAttachmentUI();

        // Display Conversation ID in sidebar
        const refEl = document.getElementById("session-display-id");
        if (refEl && state.conversationId) {
            refEl.textContent = state.conversationId.substring(0, 10) + "...";
            refEl.title = `Full Reference ID: ${state.conversationId}`;
        }

        // Fetch conversation history from Render
        await fetchMessages();
        return true;
    }

    function updateStatusIndicator(status, text) {
        const textEl = document.getElementById("support-status-text");
        const dotEl = document.getElementById("support-status-dot");
        if (textEl) textEl.textContent = text;
        if (dotEl) {
            if (status === "online") {
                dotEl.style.background = "#10b981";
                dotEl.style.boxShadow = "0 0 8px #10b981";
            } else if (status === "connecting") {
                dotEl.style.background = "#f59e0b";
                dotEl.style.boxShadow = "0 0 8px #f59e0b";
            } else {
                dotEl.style.background = "#ef4444";
                dotEl.style.boxShadow = "0 0 8px #ef4444";
            }
        }
    }

    /**
     * Periodically synchronize conversation status and attachment permission from Render
     */
    async function syncConversationStatus() {
        if (!state.customerEmail) return;

        const payload = {
            name: state.customerName,
            email: state.customerEmail,
            external_customer_id: state.externalCustomerId || `priv_${cleanEmailForId(state.customerEmail)}`
        };

        let statusData = null;

        // Try direct session ping
        try {
            const res = await fetch(`${DIRECT_API_BASE}/api/v1/customer/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                statusData = await res.json();
            }
        } catch (e) {}

        // Fallback to proxy status check
        if (!statusData) {
            try {
                const proxyRes = await fetch(`${PROXY_API_BASE}/status?email=${encodeURIComponent(state.customerEmail)}&name=${encodeURIComponent(state.customerName)}&external_customer_id=${encodeURIComponent(payload.external_customer_id)}`);
                if (proxyRes.ok) {
                    statusData = await proxyRes.json();
                }
            } catch (e) {}
        }

        if (statusData) {
            // If the conversation ID changed or was re-created on Render (e.g. after admin deleted chat)
            if (statusData.conversation_id && statusData.conversation_id !== state.conversationId) {
                console.log("[SupportChat] Active conversation refreshed from Render:", statusData.conversation_id);
                state.conversationId = statusData.conversation_id;
                state.accessToken = statusData.access_token || state.accessToken;
                state.customerId = statusData.customer_id || state.customerId;
                saveSessionToStorage();
                fetchMessages();
            }

            if (typeof statusData.allow_customer_attachments !== 'undefined') {
                const newAllowed = Boolean(statusData.allow_customer_attachments);
                if (newAllowed !== state.allowAttachments) {
                    state.allowAttachments = newAllowed;
                    updateAttachmentUI();
                    saveSessionToStorage();

                    if (newAllowed) {
                        showAttachmentNotification("📷 Support Engineer enabled image attachments! Click the clip icon to attach screenshots.");
                    } else {
                        clearStagedFile();
                        showAttachmentNotification("🔒 Image attachments locked by support engineer.");
                    }
                }
            }
        }
    }

    /**
     * Updates the attach button state and lock indicator
     */
    function updateAttachmentUI() {
        const attachBtn = document.getElementById("btn-attach-image");
        if (!attachBtn) return;

        if (state.allowAttachments) {
            attachBtn.className = "btn-support-attach unlocked";
            attachBtn.title = "Attach image or screenshot (PNG, JPG, WebP - max 10MB)";
        } else {
            attachBtn.className = "btn-support-attach locked";
            attachBtn.title = "Image attachments require support engineer permission";
        }
    }

    let toastTimer = null;
    function showAttachmentNotification(text) {
        const toast = document.getElementById("attachment-permission-toast");
        const toastText = document.getElementById("attachment-permission-text");
        if (!toast || !toastText) return;

        toastText.textContent = text;
        toast.style.display = "flex";

        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.style.display = "none";
        }, 5000);
    }

    function handleAttachButtonClick() {
        if (!state.allowAttachments) {
            showAttachmentNotification("🔒 Image attachments are currently disabled by default. The support engineer can grant image attachment permission during your session if screenshots are required.");
            return;
        }
        const fileInput = document.getElementById("support-image-input");
        if (fileInput) fileInput.click();
    }

    function handleFileSelected(file) {
        if (!file) return;

        if (!state.allowAttachments) {
            showAttachmentNotification("🔒 Support engineer permission required before attaching images.");
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert("Please select a valid image file (PNG, JPG, WebP, GIF).");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert("Image size exceeds 10MB limit. Please select a smaller screenshot or photo.");
            return;
        }

        state.selectedFile = file;

        const previewBox = document.getElementById("support-attachment-preview");
        const previewImg = document.getElementById("staging-preview-img");
        const nameEl = document.getElementById("staging-filename");
        const sizeEl = document.getElementById("staging-filesize");

        if (nameEl) nameEl.textContent = file.name || "image.png";
        if (sizeEl) sizeEl.textContent = formatBytes(file.size);

        if (previewImg) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                if (previewBox) previewBox.style.display = "flex";
            };
            reader.readAsDataURL(file);
        } else {
            if (previewBox) previewBox.style.display = "flex";
        }
    }

    function clearStagedFile() {
        state.selectedFile = null;
        const fileInput = document.getElementById("support-image-input");
        if (fileInput) fileInput.value = "";
        const previewBox = document.getElementById("support-attachment-preview");
        const previewImg = document.getElementById("staging-preview-img");
        if (previewImg) previewImg.src = "";
        if (previewBox) previewBox.style.display = "none";
        const spinner = document.getElementById("staging-spinner");
        if (spinner) spinner.style.display = "none";
    }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return "0 KB";
        const k = 1024;
        if (bytes < k) return bytes + " B";
        if (bytes < k * k) return (bytes / k).toFixed(1) + " KB";
        return (bytes / (k * k)).toFixed(1) + " MB";
    }

    /**
     * Fetch conversation messages from Render API
     */
    async function fetchMessages() {
        if (!state.conversationId || !state.accessToken) return;

        let messagesList = null;

        // Try direct Render endpoint
        try {
            const res = await fetch(`${DIRECT_API_BASE}/api/v1/customer/conversations/${state.conversationId}/messages`, {
                headers: { 'Authorization': `Bearer ${state.accessToken}` }
            });
            if (res.ok) {
                messagesList = await res.json();
            } else if (res.status === 401 || res.status === 403 || res.status === 404) {
                console.warn("[SupportChat] Session/conversation invalid on Render, refreshing session...");
                await initializeRenderSession(true);
                return;
            }
        } catch (e) {}

        // Fallback to proxy
        if (!messagesList) {
            try {
                const proxyRes = await fetch(`${PROXY_API_BASE}/messages?conversation_id=${encodeURIComponent(state.conversationId)}&access_token=${encodeURIComponent(state.accessToken)}`);
                if (proxyRes.ok) {
                    messagesList = await proxyRes.json();
                } else if (proxyRes.status === 401 || proxyRes.status === 403 || proxyRes.status === 404) {
                    console.warn("[SupportChat] Proxy returned 401/403/404, refreshing session...");
                    await initializeRenderSession(true);
                    return;
                }
            } catch (e) {}
        }

        if (Array.isArray(messagesList)) {
            const hasNewMessages = messagesList.length > state.lastMessageCount;
            state.messages = messagesList;
            renderMessages();

            if (hasNewMessages) {
                scrollToBottom();
                state.lastMessageCount = messagesList.length;
            }
        }
    }

    /**
     * Send Customer Message and optional image attachment to Render API
     */
    async function handleCustomerSend() {
        if (state.isSending) return;

        const input = document.getElementById("support-message-input");
        const text = input ? input.value.trim() : "";
        const fileToSend = state.selectedFile;

        // Require either text or an attached image
        if (!text && !fileToSend) return;

        // Ensure session is active before sending
        if (!state.accessToken || !state.conversationId) {
            const connected = await initializeRenderSession();
            if (!connected) {
                alert("Connecting to support desk, please try again in a moment.");
                return;
            }
        }

        // If trying to send a file, check permission
        if (fileToSend && !state.allowAttachments) {
            alert("Image attachments are not enabled by the support engineer yet.");
            return;
        }

        state.isSending = true;
        const sendBtn = document.getElementById("btn-submit-support-msg");
        const spinner = document.getElementById("staging-spinner");
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = `<span>...</span>`;
        }
        if (spinner && fileToSend) {
            spinner.style.display = "flex";
        }

        // 1. Upload image if attached
        let attachmentObj = null;
        if (fileToSend) {
            try {
                const formData = new FormData();
                formData.append("upload", fileToSend);

                let uploadRes = null;
                try {
                    uploadRes = await fetch(`${DIRECT_API_BASE}/api/v1/files`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${state.accessToken}`
                        },
                        body: formData
                    });
                } catch (err) {
                    console.warn("[SupportChat] Direct image upload failed, falling back to proxy:", err);
                }

                if (uploadRes && uploadRes.ok) {
                    attachmentObj = await uploadRes.json();
                } else {
                    // Fallback to proxy upload
                    const proxyUploadRes = await fetch(`${PROXY_API_BASE}/upload`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${state.accessToken}`
                        },
                        body: formData
                    });
                    if (proxyUploadRes.ok) {
                        attachmentObj = await proxyUploadRes.json();
                    } else {
                        const errData = await proxyUploadRes.json().catch(() => ({}));
                        throw new Error(errData.detail || "Image upload failed. The engineer may have locked attachments.");
                    }
                }
            } catch (uploadErr) {
                console.error("[SupportChat] Upload error:", uploadErr);
                alert(`Could not upload image: ${uploadErr.message || 'Upload error'}`);
                state.isSending = false;
                if (spinner) spinner.style.display = "none";
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = `<span>Send</span><span>➤</span>`;
                }
                return;
            }
        }

        if (input) {
            input.value = "";
            input.style.height = "48px";
            input.style.overflowY = "hidden";
        }

        // Optimistic UI update
        const tempMsg = {
            id: `temp_${Date.now()}`,
            conversation_id: state.conversationId,
            sender_type: "customer",
            content: text,
            attachment: attachmentObj,
            created_at: new Date().toISOString()
        };
        state.messages.push(tempMsg);
        renderMessages();
        scrollToBottom();

        // Clear staged file after successful upload
        clearStagedFile();

        // 2. Dispatch Message to Render API
        let sendSuccess = false;
        const msgPayload = {
            content: text || "",
            attachment: attachmentObj
        };

        // 2a. Try Direct Render POST
        try {
            const res = await fetch(`${DIRECT_API_BASE}/api/v1/customer/conversations/${state.conversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(msgPayload)
            });
            if (res.ok) {
                sendSuccess = true;
            } else if (res.status === 401 || res.status === 403 || res.status === 404) {
                console.warn(`[SupportChat] Direct send returned ${res.status}, refreshing session...`);
                await initializeRenderSession(true);
                if (state.accessToken && state.conversationId) {
                    const retryRes = await fetch(`${DIRECT_API_BASE}/api/v1/customer/conversations/${state.conversationId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${state.accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(msgPayload)
                    });
                    if (retryRes.ok) sendSuccess = true;
                }
            }
        } catch (e) {
            console.warn("[SupportChat] Direct send error, trying proxy:", e);
        }

        // 2b. Fallback to Proxy POST (with auto-healing payload)
        if (!sendSuccess) {
            try {
                const proxyPayload = {
                    conversation_id: state.conversationId,
                    access_token: state.accessToken,
                    content: text || "",
                    attachment: attachmentObj,
                    email: state.customerEmail,
                    name: state.customerName,
                    external_customer_id: state.externalCustomerId
                };
                const proxyRes = await fetch(`${PROXY_API_BASE}/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(proxyPayload)
                });
                if (proxyRes.ok) {
                    sendSuccess = true;
                    const resData = await proxyRes.json().catch(() => ({}));
                    if (resData.fresh_session) {
                        state.conversationId = resData.fresh_session.conversation_id;
                        state.accessToken = resData.fresh_session.access_token;
                        state.customerId = resData.fresh_session.customer_id;
                        saveSessionToStorage();
                    }
                } else if (proxyRes.status === 401 || proxyRes.status === 403 || proxyRes.status === 404) {
                    console.warn(`[SupportChat] Proxy send returned ${proxyRes.status}, refreshing session...`);
                    await initializeRenderSession(true);
                    if (state.accessToken && state.conversationId) {
                        proxyPayload.conversation_id = state.conversationId;
                        proxyPayload.access_token = state.accessToken;
                        const retryProxy = await fetch(`${PROXY_API_BASE}/send`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(proxyPayload)
                        });
                        if (retryProxy.ok) {
                            sendSuccess = true;
                            const retryData = await retryProxy.json().catch(() => ({}));
                            if (retryData.fresh_session) {
                                state.conversationId = retryData.fresh_session.conversation_id;
                                state.accessToken = retryData.fresh_session.access_token;
                                state.customerId = retryData.fresh_session.customer_id;
                                saveSessionToStorage();
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("[SupportChat] Proxy send failure:", e);
            }
        }

        state.isSending = false;
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = `<span>Send</span><span>➤</span>`;
        }

        // Re-sync messages from Render
        await fetchMessages();
    }

    /**
     * Start background polling for agent replies and permission changes
     */
    function startMessagePolling() {
        if (state.pollTimer) clearInterval(state.pollTimer);
        let pollCycle = 0;
        state.pollTimer = setInterval(async () => {
            await fetchMessages();
            pollCycle++;
            // Check attachment permissions every cycle if currently locked, or every 2 cycles if unlocked
            if (!state.allowAttachments || pollCycle % 2 === 0) {
                await syncConversationStatus();
            }
        }, 3000);
    }

    function renderMessages() {
        const container = document.getElementById("support-chat-messages");
        if (!container) return;

        // Default greeting if no messages yet
        let html = state.messages.length === 0 ? `
            <div class="message-row agent-message">
                <div class="chat-bubble">
                    <div class="agent-bubble-header">🛡️ PrivCloud Support Desk</div>
                    <div class="bubble-text">
                        Hello <strong>${escapeHtml(state.customerName)}</strong>! ${state.isVip ? "👑 <em>[Pro VIP Priority Queue Active]</em>" : ""}
                    </div>
                </div>
            </div>
        ` : "";

        html += state.messages.map(m => {
            const isUser = m.sender_type === "customer";
            const rowClass = isUser ? "message-row user-message" : "message-row agent-message";
            const header = isUser ? "" : `<div class="agent-bubble-header">🛡️ PrivCloud Support Engineer</div>`;
            
            let timeStr = "";
            if (m.created_at) {
                try {
                    timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch (e) {}
            }

            // Image attachment rendering
            let attachmentHtml = "";
            if (m.attachment && m.attachment.url) {
                const rawUrl = m.attachment.url;
                const fullUrl = rawUrl.startsWith("http") ? rawUrl : `${DIRECT_API_BASE}${rawUrl}`;
                const fileName = m.attachment.name || "Attachment Image";

                attachmentHtml = `
                    <div class="message-attachment">
                        <a href="${escapeHtml(fullUrl)}" class="attachment-link" data-url="${escapeHtml(fullUrl)}" data-name="${escapeHtml(fileName)}" title="Click to view full size">
                            <img src="${escapeHtml(fullUrl)}" alt="${escapeHtml(fileName)}" class="attachment-thumb" loading="lazy" />
                            <div class="attachment-caption">
                                <span class="attachment-name">📎 ${escapeHtml(fileName)}</span>
                                <span class="attachment-zoom-hint">🔍 Enlarge</span>
                            </div>
                        </a>
                    </div>
                `;
            }

            const textHtml = m.content && m.content.trim() ? `<div class="bubble-text">${escapeHtml(m.content)}</div>` : "";

            return `
                <div class="${rowClass}" id="msg-${m.id}">
                    <div class="chat-bubble">
                        ${header}
                        ${attachmentHtml}
                        ${textHtml}
                        <div class="message-timestamp">${timeStr}</div>
                    </div>
                </div>
            `;
        }).join("");

        container.innerHTML = html;
        bindAttachmentClickEvents();
    }

    function scrollToBottom() {
        const container = document.getElementById("support-chat-messages");
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    function openLightbox(url, name) {
        const modal = document.getElementById("support-lightbox");
        const img = document.getElementById("lightbox-image");
        const title = document.getElementById("lightbox-title");
        const downloadLink = document.getElementById("lightbox-download-link");

        if (img) img.src = url;
        if (title) title.textContent = name || "Attached Image";
        if (downloadLink) {
            downloadLink.href = url;
            downloadLink.setAttribute("download", name || "attachment.png");
        }
        if (modal) modal.style.display = "flex";
    }

    function closeLightbox() {
        const modal = document.getElementById("support-lightbox");
        const img = document.getElementById("lightbox-image");
        if (modal) modal.style.display = "none";
        if (img) img.src = "";
    }

    function bindAttachmentClickEvents() {
        const links = document.querySelectorAll(".attachment-link");
        links.forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                const url = link.getAttribute("data-url");
                const name = link.getAttribute("data-name");
                openLightbox(url, name);
            };
        });
    }

    function bindEvents() {
        const form = document.getElementById("support-chat-form");
        const textarea = document.getElementById("support-message-input");
        const clearBtn = document.getElementById("btn-clear-support-chat");
        const attachBtn = document.getElementById("btn-attach-image");
        const fileInput = document.getElementById("support-image-input");
        const removeFileBtn = document.getElementById("btn-remove-attachment");
        const lightboxCloseBtn = document.getElementById("btn-lightbox-close");
        const lightboxBackdrop = document.getElementById("lightbox-backdrop");

        if (form) {
            form.addEventListener("submit", (e) => {
                e.preventDefault();
                handleCustomerSend();
            });
        }

        if (textarea) {
            textarea.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCustomerSend();
                }
            });

            textarea.addEventListener("input", () => {
                textarea.style.height = "48px";
                const newHeight = Math.min(textarea.scrollHeight, 120);
                textarea.style.height = Math.max(48, newHeight) + "px";
                textarea.style.overflowY = textarea.scrollHeight > 120 ? "auto" : "hidden";
            });

            // Clipboard paste for screenshots (Ctrl+V)
            textarea.addEventListener("paste", (e) => {
                if (e.clipboardData && e.clipboardData.items) {
                    for (let i = 0; i < e.clipboardData.items.length; i++) {
                        const item = e.clipboardData.items[i];
                        if (item.type.indexOf("image") !== -1) {
                            const blob = item.getAsFile();
                            if (blob) {
                                e.preventDefault();
                                const file = new File([blob], `screenshot_${Date.now()}.png`, { type: blob.type || "image/png" });
                                handleFileSelected(file);
                                break;
                            }
                        }
                    }
                }
            });
        }

        // Attach image button
        if (attachBtn) {
            attachBtn.addEventListener("click", () => {
                handleAttachButtonClick();
            });
        }

        // Hidden file input change
        if (fileInput) {
            fileInput.addEventListener("change", (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    handleFileSelected(e.target.files[0]);
                }
            });
        }

        // Remove staged attachment
        if (removeFileBtn) {
            removeFileBtn.addEventListener("click", () => {
                clearStagedFile();
            });
        }

        // Drag and drop images into chat console
        const dropZone = document.getElementById("support-chat-console-box");
        if (dropZone) {
            ['dragenter', 'dragover'].forEach(name => {
                dropZone.addEventListener(name, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropZone.classList.add('drag-over');
                });
            });
            ['dragleave', 'drop'].forEach(name => {
                dropZone.addEventListener(name, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropZone.classList.remove('drag-over');
                });
            });
            dropZone.addEventListener('drop', (e) => {
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    if (file.type.startsWith('image/')) {
                        handleFileSelected(file);
                    }
                }
            });
        }

        // Lightbox modal handlers
        if (lightboxCloseBtn) {
            lightboxCloseBtn.addEventListener("click", closeLightbox);
        }
        if (lightboxBackdrop) {
            lightboxBackdrop.addEventListener("click", closeLightbox);
        }
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closeLightbox();
        });

        if (clearBtn) {
            clearBtn.addEventListener("click", async () => {
                if (confirm("Start a new support conversation session?")) {
                    localStorage.removeItem(SESSION_STORAGE_KEY);
                    state.accessToken = null;
                    state.conversationId = null;
                    state.messages = [];
                    state.allowAttachments = false;
                    clearStagedFile();
                    updateAttachmentUI();
                    await initializeRenderSession(true);
                }
            });
        }
    }

    function saveSessionToStorage() {
        try {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
                accessToken: state.accessToken,
                conversationId: state.conversationId,
                customerId: state.customerId,
                externalCustomerId: state.externalCustomerId,
                allowAttachments: state.allowAttachments
            }));
        } catch (e) {}
    }

    function escapeHtml(text) {
        if (!text) return "";
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

})();
