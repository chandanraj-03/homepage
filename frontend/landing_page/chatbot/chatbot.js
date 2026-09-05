/**
 * PrivCloud AI Floating Chatbot Widget
 * Integrated with Hybrid GitHub README RAG Backend (Render Deployed)
 * https://hybrid-github-rag-backend.onrender.com
 */

(function () {
    const DIRECT_API_URL = "https://hybrid-github-rag-backend.onrender.com/api/chat";
    const DIRECT_HEALTH_URL = "https://hybrid-github-rag-backend.onrender.com/api/health";
    const PROXY_API_URL = "/api/chat";
    const PROXY_HEALTH_URL = "/api/chatbot/health";
    const SUPABASE_ASSETS_URL = "https://qrxjyvezlotjwggtgoqe.supabase.co/storage/v1/object/public/assets";
    const STORAGE_KEY = "privcloud_rag_chat_history_v2";
    const USER_NAME_KEY = "privcloud_user_name_v1";

    const state = {
        isOpen: false,
        isExpanded: false,
        isLoading: false,
        isOnline: true,
        userName: "",
        messages: [],
        mode: "ai", // "ai" | "live"
        liveMessages: []
    };

    // Ensure supportChat.js is dynamically loaded for Render live support
    if (!window.PrivCloudSupportChat) {
        const script = document.createElement('script');
        script.src = window.location.pathname.includes('/feedback_page/') || 
                     window.location.pathname.includes('/product_page/') || 
                     window.location.pathname.includes('/demo_page/') || 
                     window.location.pathname.includes('/purchase_page/') || 
                     window.location.pathname.includes('/auth_page/')
            ? '../landing_page/chatbot/supportChat.js?v=1'
            : 'landing_page/chatbot/supportChat.js?v=1';
        document.head.appendChild(script);
    }

    function initChatbot() {
        if (document.getElementById("privcloud-chatbot-root")) return;

        // Restore chat messages from session storage
        loadStoredHistory();

        const container = document.createElement("div");
        container.className = "privcloud-chatbot-fab-wrap";
        container.id = "privcloud-chatbot-root";

        container.innerHTML = `
            <!-- Proactive Welcome Pill -->
            <div class="privcloud-chat-promo-pill" id="privcloud-chat-promo">
                <span class="promo-sparkle">🤖</span>
                <span>Ask PrivCloud AI Assistant</span>
                <span class="promo-close" id="promo-close-btn" title="Dismiss">&times;</span>
            </div>

            <!-- Floating Action Button (Bot Character) -->
            <button class="privcloud-chatbot-fab" id="privcloud-chat-toggle" aria-label="Toggle Customer Support and AI Chatbot" title="Live Customer Support & AI Assistant">
                <div class="fab-icon fab-icon-ai">
                    <img src="${SUPABASE_ASSETS_URL}/bot.png" alt="PrivCloud Bot" class="fab-bot-img">
                </div>
                <div class="fab-icon fab-icon-close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </div>
            </button>

            <!-- Main Chatbot Window - Frosted Sky Glass -->
            <div class="privcloud-chat-window" id="privcloud-chat-window">
                
                <!-- Toast Notification -->
                <div class="privcloud-chat-toast" id="chat-toast">Copied to clipboard!</div>

                <!-- Chat Header -->
                <div class="privcloud-chat-header">
                    <div class="privcloud-chat-header-left">
                        <div class="chat-avatar-ring">
                            <img src="${SUPABASE_ASSETS_URL}/bot.png" alt="PrivCloud Bot" class="header-bot-img">
                            <span class="chat-avatar-status" id="header-status-dot"></span>
                        </div>
                        <div class="chat-title-group">
                            <div class="chat-title-row">
                                <span class="chat-title">PrivCloud AI</span>
                            </div>
                            <span class="chat-subtitle" id="header-backend-subtitle">Product Assistant</span>
                        </div>
                    </div>
                    <div class="privcloud-chat-header-actions">
                        <button class="chat-hdr-btn" id="btn-clear-chat" title="Clear Conversation" aria-label="Clear Conversation">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </button>
                        <button class="chat-hdr-btn btn-expand" id="btn-expand-chat" title="Expand / Minimize Window" aria-label="Expand / Minimize Window">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <polyline points="9 21 3 21 3 15"></polyline>
                                <line x1="21" y1="3" x2="14" y2="10"></line>
                                <line x1="3" y1="21" x2="10" y2="14"></line>
                            </svg>
                        </button>
                        <button class="chat-hdr-btn" id="btn-close-chat" title="Close Chat" aria-label="Close Chat">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Support Mode Switcher (Visible only to verified Basic/Pro buyers) -->
                <div class="chat-mode-tabs" id="chat-mode-tabs" style="display: none;">
                    <button class="chat-mode-tab active" id="mode-tab-ai" type="button" title="24/7 AI Troubleshooting">
                        <span>🤖 AI Assistant</span>
                    </button>
                    <button class="chat-mode-tab" id="mode-tab-live" type="button" title="Direct Live Agent Support via Render API" style="display: none;">
                        <span>🎧 VIP Support</span>
                        <span class="live-status-pill">Render API</span>
                    </button>
                </div>

                <!-- Chat Messages Scroll Container -->
                <div class="privcloud-chat-body" id="chat-messages-container">
                    <!-- Dynamic Messages will render here -->
                </div>

                <!-- Chat Input Footer -->
                <div class="privcloud-chat-footer">
                    <form class="chat-input-wrapper" id="chat-input-form">
                        <textarea 
                            id="chat-user-input" 
                            class="chat-input-field" 
                            placeholder="Ask anything about PrivCloud features, setup, storage..." 
                            rows="1"
                            maxlength="1000"
                            required></textarea>
                        <button type="submit" class="chat-send-btn" id="chat-send-btn" title="Send message">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </form>
                    <div class="chat-footer-caption">
                        <div class="footer-caption-left">
                            <span class="footer-caption-status-dot" id="footer-status-dot" style="display:none;"></span>
                            <span id="footer-status-text">For more information <a href="mailto:rajchandan739@gmail.com" class="chat-footer-contact-link">contact PrivCloud</a></span>
                        </div>
                        <span>Shift + Enter for new line</span>
                    </div>
                </div>

            </div>
        `;

        document.body.appendChild(container);
        bindEvents();
        renderMessages();
        checkBackendHealth();
    }

    function bindEvents() {
        const toggleBtn = document.getElementById("privcloud-chat-toggle");
        const promoPill = document.getElementById("privcloud-chat-promo");
        const promoCloseBtn = document.getElementById("promo-close-btn");
        const closeBtn = document.getElementById("btn-close-chat");
        const expandBtn = document.getElementById("btn-expand-chat");
        const clearBtn = document.getElementById("btn-clear-chat");
        const inputForm = document.getElementById("chat-input-form");
        const inputField = document.getElementById("chat-user-input");

        // Toggle Open / Close
        if (toggleBtn) {
            toggleBtn.addEventListener("click", () => toggleChat());
        }
        if (promoPill) {
            promoPill.addEventListener("click", (e) => {
                if (e.target !== promoCloseBtn) {
                    toggleChat(true);
                }
            });
        }
        if (promoCloseBtn) {
            promoCloseBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                promoPill.style.display = "none";
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener("click", () => toggleChat(false));
        }

        // Expand / Contract Window
        if (expandBtn) {
            expandBtn.addEventListener("click", () => {
                state.isExpanded = !state.isExpanded;
                const chatWin = document.getElementById("privcloud-chat-window");
                if (chatWin) chatWin.classList.toggle("is-expanded", state.isExpanded);
                expandBtn.innerHTML = state.isExpanded
                    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`
                    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
            });
        }

        // Clear Conversation
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                clearChatHistory();
            });
        }

        // Form Submit
        if (inputForm) {
            inputForm.addEventListener("submit", (e) => {
                e.preventDefault();
                handleUserSend();
            });
        }

        // Textarea Enter / Auto-resize
        if (inputField) {
            inputField.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleUserSend();
                }
            });

            inputField.addEventListener("input", () => {
                inputField.style.height = "auto";
                inputField.style.height = Math.min(inputField.scrollHeight, 90) + "px";
            });
        }

        // Mode Switching: AI vs Live Render Support Chat
        const tabAi = document.getElementById("mode-tab-ai");
        const tabLive = document.getElementById("mode-tab-live");

        if (tabAi) tabAi.addEventListener("click", () => switchSupportMode("ai"));
        if (tabLive) tabLive.addEventListener("click", () => switchSupportMode("live"));

        // Check buyer status for live support visibility
        updateChatbotBuyerStatus();
        if (window.PrivCloudAuth && window.PrivCloudAuth.getClient) {
            try {
                const client = window.PrivCloudAuth.getClient();
                if (client && client.auth) {
                    client.auth.onAuthStateChange(() => {
                        updateChatbotBuyerStatus();
                    });
                }
            } catch (e) {}
        }

        window.addEventListener("privcloud:support_message", (e) => {
            if (e.detail) {
                state.liveMessages.push({
                    id: e.detail.id,
                    role: "assistant",
                    sender: "agent",
                    name: e.detail.name || "Support Agent",
                    content: e.detail.text,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                });
                if (state.mode === "live") {
                    renderMessages();
                    scrollToBottom();
                }
            }
        });
    }

    async function updateChatbotBuyerStatus() {
        let isBuyer = false;
        if (window.PrivCloudAuth && window.PrivCloudAuth.getSession) {
            try {
                const session = await window.PrivCloudAuth.getSession();
                if (session && session.user) {
                    const user = session.user;
                    const meta = user.user_metadata || {};
                    const plan = (meta.plan_tier || meta.plan || "").toLowerCase();
                    if (plan === 'pro' || plan === 'basic' || meta.is_vip || meta.is_admin || (user.email && (user.email.includes('admin') || user.email.includes('pro')))) {
                        isBuyer = true;
                    }
                }
            } catch (e) {}
        }
        state.isBuyer = isBuyer;

        const liveTab = document.getElementById("mode-tab-live");
        const tabsBar = document.getElementById("chat-mode-tabs");
        const promoText = document.querySelector("#privcloud-chat-promo span:nth-child(2)");

        if (liveTab) liveTab.style.display = isBuyer ? "inline-flex" : "none";
        if (tabsBar) tabsBar.style.display = isBuyer ? "flex" : "none";
        if (promoText) promoText.textContent = isBuyer ? "VIP Customer Support & AI" : "Ask PrivCloud AI Assistant";

        if (!isBuyer && state.mode === "live") {
            switchSupportMode("ai");
        }
    }

    function switchSupportMode(newMode) {
        if (newMode === "live" && !state.isBuyer) {
            showToast("🔒 Live Support is reserved for verified Basic/Pro buyers.");
            return;
        }

        state.mode = newMode;
        const tabAi = document.getElementById("mode-tab-ai");
        const tabLive = document.getElementById("mode-tab-live");
        const subtitle = document.getElementById("header-backend-subtitle");
        const inputField = document.getElementById("chat-user-input");

        if (newMode === "live") {
            if (tabAi) tabAi.classList.remove("active");
            if (tabLive) tabLive.classList.add("active");
            if (subtitle) subtitle.textContent = "support-chat-api.onrender.com";
            if (inputField) inputField.placeholder = "Describe your issue for live human support...";
            if (window.PrivCloudSupportChat && window.PrivCloudSupportChat.startSession) {
                window.PrivCloudSupportChat.startSession();
            }
        } else {
            if (tabLive) tabLive.classList.remove("active");
            if (tabAi) tabAi.classList.add("active");
            if (subtitle) subtitle.textContent = "Product Assistant";
            if (inputField) inputField.placeholder = "Ask anything about PrivCloud features, setup, storage...";
        }

        renderMessages();
        scrollToBottom();
    }

    function toggleChat(forceState) {
        state.isOpen = typeof forceState === "boolean" ? forceState : !state.isOpen;
        const chatWin = document.getElementById("privcloud-chat-window");
        const toggleBtn = document.getElementById("privcloud-chat-toggle");
        const promoPill = document.getElementById("privcloud-chat-promo");

        if (state.isOpen) {
            if (chatWin) chatWin.classList.add("is-visible");
            if (toggleBtn) toggleBtn.classList.add("is-open");
            if (promoPill) promoPill.style.display = "none";
            scrollToBottom();
            const inputField = document.getElementById("chat-user-input");
            if (inputField && window.innerWidth > 640) {
                setTimeout(() => inputField.focus(), 150);
            }
        } else {
            if (chatWin) chatWin.classList.remove("is-visible");
            if (toggleBtn) toggleBtn.classList.remove("is-open");
        }
    }

    // =========================================================================
    // Conversational Quick Intent Handler
    // =========================================================================

    function capitalizeWords(str) {
        if (!str) return "";
        return str.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }

    function extractNameFromInput(text) {
        const clean = text.trim();

        const myNameIsMatch = clean.match(/^(?:my name is|i am|i'm|im|this is|call me|myself|it's|its)\s+([A-Za-z\s.'-]+)$/i);
        if (myNameIsMatch && myNameIsMatch[1]) {
            const candidate = myNameIsMatch[1].trim().replace(/[.!?]/g, "");
            if (candidate.length >= 2 && candidate.length <= 35) {
                return capitalizeWords(candidate);
            }
        }

        // Single or two word name input if user simply types their name e.g. "Rahul", "Chandan Raj"
        const words = clean.split(/\s+/);
        if (words.length <= 3 && /^[A-Za-z\s.'-]+$/.test(clean)) {
            const blacklist = [
                "hi", "hello", "hey", "help", "privcloud", "price", "pricing", "cost", "features",
                "storage", "quota", "speed", "lan", "wifi", "login", "register", "admin", "yes", "no",
                "pro", "basic", "trial", "download", "upload", "share", "preview", "media", "format",
                "video", "audio", "pdf", "what", "how", "why", "who", "when", "where", "can", "is", "are",
                "ok", "okay", "sure", "fine", "good", "bye", "goodbye", "thanks", "thank you"
            ];

            const hasBlacklist = words.some(w => blacklist.includes(w.toLowerCase()));
            if (!hasBlacklist && clean.length >= 2 && clean.length <= 30) {
                return capitalizeWords(clean);
            }
        }

        return null;
    }

    function getQuickConversationalResponse(query) {
        const clean = query.toLowerCase().trim().replace(/[?!.,;:]/g, "");

        // Name Introduction Check
        const detectedName = extractNameFromInput(query);
        if (detectedName && !state.userName) {
            state.userName = detectedName;
            saveStoredHistory();
            return `Nice to meet you, **${detectedName}**! 😊\n\nHow can I help you explore **PrivCloud** today? Feel free to ask about our self-hosted personal cloud, 100% zero-telemetry privacy, Gigabit LAN transfer speeds, in-browser 4K media playback, client upload dropboxes, or lifetime pricing!`;
        }

        // Who am I / What is my name
        if (/^(what is my name|whats my name|who am i|do you know my name)$/i.test(clean)) {
            if (state.userName) {
                return `Your name is **${state.userName}**! 😊 How can I help you explore PrivCloud today?`;
            }
            return "I don't know your name yet! What should I call you?";
        }

        // Greetings
        if (/^(hi|hello|hey|hey there|greetings|hola|good morning|good afternoon|good evening|namaste)$/i.test(clean)) {
            if (state.userName) {
                return `Hello **${state.userName}**! 👋 How can I help you explore PrivCloud today? Feel free to ask any question about our product, features, or pricing!`;
            }
            return "Hi! 👋 I am **PrivCloud AI** to help in exploring our product.\n\nBy the way, can I know your name?";
        }

        // Identity / Name
        if (/^(what is your name|whats your name|who are you|tell me your name|your name)$/i.test(clean)) {
            return "I am **PrivCloud AI**, your intelligent product assistant designed to help you explore and understand all PrivCloud services and features.";
        }

        // Capabilities / What do you do
        if (/^(what do you do|what can you do|what you do|help me|how can you help|tell me about yourself)$/i.test(clean)) {
            const namePrefix = state.userName ? `**${state.userName}**, I` : "I";
            return `${namePrefix} can help you explore everything about **PrivCloud**:\n\n- 🔒 **Zero-Knowledge & Zero-Telemetry Privacy**\n- ⚡ **Gigabit LAN Speed & Remote HTTPS Tunnel**\n- 🎬 **In-Browser 4K Video, Audio & Document Suite**\n- 📤 **Smart Sharing & Client File Dropboxes**\n- 💰 **One-Time Lifetime Pricing (Basic & Pro)**\n- 🎛️ **Desktop Control Panel & Quota Guard**\n\nFeel free to ask any question!`;
        }

        // Goodbyes
        if (/^(bye|goodbye|see you|cya|take care|have a good day|good night)$/i.test(clean)) {
            const nameSuffix = state.userName ? `, **${state.userName}**` : "";
            return `Goodbye${nameSuffix}! 👋 If you have any more questions about PrivCloud later, I'll be right here. Have a great day!`;
        }

        // Gratitude
        if (/^(thanks|thank you|thx|thank you so much|appreciate it)$/i.test(clean)) {
            const nameSuffix = state.userName ? `, **${state.userName}**` : "";
            return `You're very welcome${nameSuffix}! Let me know if you need anything else regarding PrivCloud.`;
        }

        return null;
    }

    function sanitizeBotResponse(rawText) {
        const contactFallback = "Ask questions or queries related to the PrivCloud product so I can help you best. You can also explore our key features, pricing, and documentation.\n\nFor more information, [contact PrivCloud](mailto:rajchandan739@gmail.com).";

        if (!rawText) {
            return contactFallback;
        }

        const lower = rawText.toLowerCase();

        // Check for common RAG 'not found in documentation' responses
        if (
            lower.includes("couldn't find that information") ||
            lower.includes("could not find that information") ||
            lower.includes("not found in the repository") ||
            lower.includes("not found in the documentation") ||
            lower.includes("does not contain information") ||
            lower.includes("i don't have information about that in the repository")
        ) {
            return contactFallback;
        }

        // Check for empty, generic refusal or missing answer
        if (
            lower.includes("i don't know") || 
            lower.includes("no information available") ||
            lower === "n/a"
        ) {
            return contactFallback;
        }

        return rawText;
    }

    // =========================================================================
    // Core Messaging Logic & Pretrained RAG Integration
    // =========================================================================

    async function handleUserSend(customText) {
        if (state.isLoading) return;

        const inputField = document.getElementById("chat-user-input");
        const text = (customText || (inputField ? inputField.value : "")).trim();

        if (!text) return;

        if (inputField && !customText) {
            inputField.value = "";
            inputField.style.height = "auto";
        }

        // Live Render Support Mode Message Dispatch
        if (state.mode === "live") {
            const userMsg = {
                id: "live_msg_" + Date.now(),
                role: "user",
                sender: "customer",
                content: text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            state.liveMessages.push(userMsg);
            renderMessages();
            scrollToBottom();

            if (window.PrivCloudSupportChat && window.PrivCloudSupportChat.sendMessage) {
                window.PrivCloudSupportChat.sendMessage(text);
            }
            return;
        }

        // Add user message
        const userMsg = {
            id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
            role: "user",
            content: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        state.messages.push(userMsg);
        saveStoredHistory();
        renderMessages();
        scrollToBottom();

        // 1. Check for quick conversational intents (hi, bye, name, etc.)
        const quickAnswer = getQuickConversationalResponse(text);
        if (quickAnswer) {
            const botMsg = {
                id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                role: "assistant",
                content: quickAnswer,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            state.messages.push(botMsg);
            saveStoredHistory();
            renderMessages();
            scrollToBottom();
            return;
        }

        // 2. Forward all product-related queries directly to pretrained RAG backend
        state.isLoading = true;
        updateSendButtonState(true);
        renderTypingIndicator();
        scrollToBottom();

        // Build multi-turn history payload
        const historyPayload = state.messages
            .filter(m => m.role === "user" || m.role === "assistant")
            .slice(-8)
            .map(m => ({
                role: m.role,
                content: m.content
            }));

        try {
            const data = await queryRagBackend(text, historyPayload);
            removeTypingIndicator();

            let finalAnswer = sanitizeBotResponse(data.answer);

            const botMsg = {
                id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                role: "assistant",
                content: finalAnswer,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            state.messages.push(botMsg);
            saveStoredHistory();
            renderMessages();

        } catch (error) {
            removeTypingIndicator();
            console.error("[PrivCloud Chatbot] Query error:", error);

            const botMsg = {
                id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                role: "assistant",
                content: "Ask questions or queries related to the PrivCloud product so I can help you best. You can also explore our key features, pricing, and documentation.\n\nFor more information, [contact PrivCloud](mailto:rajchandan739@gmail.com).",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            state.messages.push(botMsg);
            saveStoredHistory();
            renderMessages();
        } finally {
            state.isLoading = false;
            updateSendButtonState(false);
            scrollToBottom();
        }
    }

    async function queryRagBackend(message, history) {
        const payload = {
            message: message,
            history: history,
            top_k: 4
        };

        let lastError = null;

        // 1. Try Direct Render Backend
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 35000);

            const response = await fetch(DIRECT_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errMsg = errorData.detail || errorData.message || `Server returned HTTP ${response.status}`;
                throw new Error(errMsg);
            }
        } catch (err) {
            console.warn("[PrivCloud Chatbot] Direct fetch failed, attempting local proxy:", err.message);
            lastError = err;
        }

        // 2. Fallback to Local Proxy Route (/api/chat)
        try {
            const proxyResponse = await fetch(PROXY_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (proxyResponse.ok) {
                return await proxyResponse.json();
            } else {
                const errorData = await proxyResponse.json().catch(() => ({}));
                const errMsg = errorData.detail || errorData.error || `Proxy error HTTP ${proxyResponse.status}`;
                throw new Error(errMsg);
            }
        } catch (proxyErr) {
            console.error("[PrivCloud Chatbot] Proxy fetch also failed:", proxyErr);
            throw lastError || proxyErr;
        }
    }

    async function checkBackendHealth() {
        const footerStatusText = document.getElementById("footer-status-text");
        const footerStatusDot = document.getElementById("footer-status-dot");
        if (footerStatusDot) footerStatusDot.style.display = "none";
        if (footerStatusText) {
            footerStatusText.innerHTML = 'For more information <a href="mailto:rajchandan739@gmail.com" class="chat-footer-contact-link">contact PrivCloud</a>';
        }
    }

    function setOfflineUI() {
        const footerStatusText = document.getElementById("footer-status-text");
        const footerStatusDot = document.getElementById("footer-status-dot");
        if (footerStatusDot) footerStatusDot.style.display = "none";
        if (footerStatusText) {
            footerStatusText.innerHTML = 'For more information <a href="mailto:rajchandan739@gmail.com" class="chat-footer-contact-link">contact PrivCloud</a>';
        }
    }

    // =========================================================================
    // UI Rendering & Markdown Parsing
    // =========================================================================

    function renderMessages() {
        const body = document.getElementById("chat-messages-container");
        if (!body) return;

        body.innerHTML = "";

        // Render Live Support View
        if (state.mode === "live") {
            const supportState = window.PrivCloudSupportChat ? window.PrivCloudSupportChat.getState() : {};
            const isVip = supportState.isVip;

            const banner = document.createElement("div");
            banner.className = "vip-status-banner";
            banner.innerHTML = `
                <span style="font-size: 1.25rem;">${isVip ? "👑" : "🎧"}</span>
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 0.84rem; color: #7e22ce;">
                        ${isVip ? "👑 PRO VIP PRIORITY QUEUE ACTIVE" : "Live Customer Support Desk"}
                    </div>
                    <div style="font-size: 0.73rem; opacity: 0.85; color: #475569;">
                        Connected to <code>support-chat-api.onrender.com</code>
                    </div>
                </div>
                <a href="${window.location.pathname.includes('/support_page/') ? '#' : (window.location.pathname.includes('/feedback_page/') || window.location.pathname.includes('/product_page/') || window.location.pathname.includes('/demo_page/') || window.location.pathname.includes('/purchase_page/') || window.location.pathname.includes('/auth_page/') ? '../support_page/support.html' : 'support_page/support.html')}" style="font-size: 0.72rem; font-weight: 700; color: #0284c7; text-decoration: none; background: rgba(2,132,199,0.1); padding: 4px 8px; border-radius: 6px;">Support Hub ↗</a>
            `;
            body.appendChild(banner);

            if (state.liveMessages.length === 0) {
                const welcomeCard = document.createElement("div");
                welcomeCard.className = "chat-welcome-card";
                welcomeCard.style.marginTop = "8px";
                welcomeCard.innerHTML = `
                    <div class="welcome-header">
                        <span class="welcome-icon">👨‍💻</span>
                        <span class="welcome-title">Live Engineering Desk</span>
                    </div>
                    <div class="welcome-text">
                        <p style="margin: 0 0 6px 0; color: #1e293b; font-size: 0.88rem; line-height: 1.55;">
                            Hi! You are connected directly to our support engineers at <strong>support-chat-api.onrender.com</strong>.
                        </p>
                        <p style="margin: 0; color: #0284c7; font-weight: 600; font-size: 0.85rem;">
                            How can we help you with PrivCloud today?
                        </p>
                    </div>
                `;
                body.appendChild(welcomeCard);
            } else {
                state.liveMessages.forEach(msg => {
                    const row = document.createElement("div");
                    const isUser = msg.role === "user" || msg.sender === "customer";
                    row.className = isUser ? "chat-msg-row user-row" : "chat-msg-row bot-row";

                    const bubble = document.createElement("div");
                    bubble.className = isUser ? "chat-bubble user-bubble" : "chat-bubble bot-bubble agent-bubble";

                    let agentTag = "";
                    if (!isUser) {
                        agentTag = `<div class="agent-name-tag">🛡️ ${escapeHtml(msg.name || "Support Engineer")}</div>`;
                    }

                    bubble.innerHTML = `
                        ${agentTag}
                        <div style="font-size: 0.92rem; line-height: 1.55;">${escapeHtml(msg.content)}</div>
                        <div style="font-size: 0.7rem; color: #94a3b8; text-align: right; margin-top: 4px;">${msg.timestamp || ""}</div>
                    `;
                    row.appendChild(bubble);
                    body.appendChild(row);
                });
            }

            return;
        }

        // Render AI Mode Welcome Card
        const welcomeCard = document.createElement("div");
        welcomeCard.className = "chat-welcome-card";
        welcomeCard.innerHTML = `
            <div class="welcome-header">
                <span class="welcome-icon">⚡</span>
                <span class="welcome-title">PrivCloud AI Assistant</span>
            </div>
            <div class="welcome-text">
                <p style="margin: 0 0 6px 0; color: #1e293b; font-size: 0.88rem; line-height: 1.55;">Hi, I am PrivCloud AI to help in exploring our product.</p>
                <p style="margin: 0; color: #0284c7; font-weight: 600; font-size: 0.88rem;">By the way, can I know your name?</p>
            </div>
        `;
        body.appendChild(welcomeCard);

        // Render Message List
        state.messages.forEach(msg => {
            const row = document.createElement("div");

            if (msg.role === "user") {
                row.className = "chat-msg-row user-row";
                row.innerHTML = `
                    <div class="chat-bubble user-bubble">${escapeHtml(msg.content)}</div>
                `;
            } else if (msg.role === "assistant") {
                row.className = "chat-msg-row bot-row";

                const formattedHtml = formatMarkdown(msg.content);

                row.innerHTML = `
                    <div class="chat-bubble bot-bubble">
                        ${formattedHtml}
                        <div class="bot-actions-row">
                            <button class="btn-msg-action btn-copy-msg" data-text="${escapeHtml(msg.content)}" title="Copy Answer">
                                📋 Copy
                            </button>
                        </div>
                    </div>
                `;
            } else if (msg.role === "error") {
                row.className = "chat-msg-row bot-row";
                row.innerHTML = `
                    <div class="chat-msg-error">
                        <div class="chat-error-header">
                            ⚠️ Unable to complete answer
                        </div>
                        <div class="chat-error-detail">${escapeHtml(msg.content)}</div>
                        <button class="btn-chat-retry" data-query="${escapeHtml(msg.originalQuery || '')}">
                            🔄 Retry
                        </button>
                    </div>
                `;
            }

            body.appendChild(row);
        });

        // Bind copy & retry buttons
        body.querySelectorAll(".btn-copy-msg").forEach(btn => {
            btn.addEventListener("click", () => {
                const text = btn.getAttribute("data-text");
                if (text) {
                    navigator.clipboard.writeText(text).then(() => {
                        showToast("Answer copied to clipboard!");
                        btn.innerHTML = "✓ Copied";
                        setTimeout(() => { btn.innerHTML = "📋 Copy"; }, 2000);
                    }).catch(() => {
                        showToast("Failed to copy");
                    });
                }
            });
        });

        body.querySelectorAll(".btn-chat-retry").forEach(btn => {
            btn.addEventListener("click", () => {
                const query = btn.getAttribute("data-query");
                if (query) handleUserSend(query);
            });
        });
    }

    function renderTypingIndicator() {
        const body = document.getElementById("chat-messages-container");
        if (!body || document.getElementById("chat-typing-row")) return;

        const row = document.createElement("div");
        row.className = "chat-msg-row bot-row";
        row.id = "chat-typing-row";
        row.innerHTML = `
            <div class="chat-typing-bubble">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-text">Searching documentation...</span>
            </div>
        `;
        body.appendChild(row);
    }

    function removeTypingIndicator() {
        const el = document.getElementById("chat-typing-row");
        if (el) el.remove();
    }

    function formatProviderBadge(provider, model, failover) {
        if (!provider && !model) return "";

        let icon = "⚡";
        let label = provider || "Hybrid RAG";
        let isLocal = (provider || "").toLowerCase().includes("local") || (provider || "").toLowerCase().includes("laptop");

        if (isLocal) {
            icon = "💻";
            label = `Local (${model || "qwen"})`;
            return `<span class="meta-badge badge-local">${icon} ${escapeHtml(label)}</span>`;
        }

        if (failover) {
            return `<span class="meta-badge badge-failover">🔀 Failover: ${escapeHtml(provider || "Cloud")}</span>`;
        }

        return `<span class="meta-badge">✨ ${escapeHtml(label)} ${model ? `• ${escapeHtml(model)}` : ""}</span>`;
    }

    function formatSources(sources) {
        if (!sources || !Array.isArray(sources) || sources.length === 0) return "";

        const pills = sources.slice(0, 3).map(s => {
            const section = s.section ? ` > ${s.section}` : "";
            const file = s.file || "README.md";
            return `<span class="source-pill" title="${escapeHtml(file + section)}">📄 ${escapeHtml(file)}${escapeHtml(section)}</span>`;
        }).join("");

        return `
            <div class="sources-container">
                <span class="sources-title">Sources:</span>
                ${pills}
            </div>
        `;
    }

    function formatMarkdown(text) {
        if (!text) return "";
        let raw = escapeHtml(text);

        // Code blocks: ```lang ... ```
        raw = raw.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, function (match, lang, code) {
            return `<pre><code>${code.trim()}</code></pre>`;
        });

        // Inline code: `code`
        raw = raw.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Headers
        raw = raw.replace(/^### (.*$)/gim, '<strong style="display:block; font-size:0.95rem; margin:6px 0 2px;">$1</strong>');
        raw = raw.replace(/^## (.*$)/gim, '<strong style="display:block; font-size:1.02rem; margin:8px 0 3px;">$1</strong>');
        raw = raw.replace(/^# (.*$)/gim, '<strong style="display:block; font-size:1.1rem; margin:10px 0 4px;">$1</strong>');

        // Links: [label](url)
        raw = raw.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#0284c7; text-decoration:underline; font-weight:600;">$1</a>');

        // Bold & Italic
        raw = raw.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        raw = raw.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Bullet lists
        raw = raw.replace(/^\s*[-*•]\s+(.*)$/gim, '<li>$1</li>');
        raw = raw.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');

        // Clean double nested ULs
        raw = raw.replace(/<\/ul>\s*<ul>/g, '');

        // Paragraphs & Line breaks
        const paragraphs = raw.split(/\n\n+/);
        return paragraphs.map(p => {
            if (p.startsWith('<pre>') || p.startsWith('<ul>') || p.startsWith('<strong style=')) {
                return p;
            }
            return `<p>${p.replace(/\n/g, '<br>')}</p>`;
        }).join('');
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function scrollToBottom() {
        const body = document.getElementById("chat-messages-container");
        if (body) {
            body.scrollTop = body.scrollHeight;
        }
    }

    function updateSendButtonState(isLoading) {
        const btn = document.getElementById("chat-send-btn");
        const input = document.getElementById("chat-user-input");
        if (btn) btn.disabled = isLoading;
        if (input) input.disabled = isLoading;
    }

    function showToast(msg) {
        const toast = document.getElementById("chat-toast");
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 2500);
    }

    function clearChatHistory() {
        if (state.messages.length === 0 && !state.userName) {
            showToast("Chat is already empty");
            return;
        }

        state.messages = [];
        state.userName = "";
        try {
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(USER_NAME_KEY);
        } catch (e) {
            console.warn("[PrivCloud Chatbot] Clear error:", e);
        }

        const inputField = document.getElementById("chat-user-input");
        if (inputField) {
            inputField.value = "";
            inputField.style.height = "auto";
        }

        renderMessages();
        showToast("Conversation cleared");
    }

    function loadStoredHistory() {
        try {
            const storedName = sessionStorage.getItem(USER_NAME_KEY);
            if (storedName) {
                state.userName = storedName;
            }
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    state.messages = parsed;
                }
            }
        } catch (e) {
            console.warn("[PrivCloud Chatbot] History load error:", e);
        }
    }

    function saveStoredHistory() {
        try {
            if (state.userName) {
                sessionStorage.setItem(USER_NAME_KEY, state.userName);
            } else {
                sessionStorage.removeItem(USER_NAME_KEY);
            }
            if (state.messages.length > 0) {
                // Keep last 25 messages to avoid quota exhaustion
                const trimmed = state.messages.slice(-25);
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
            } else {
                sessionStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            console.warn("[PrivCloud Chatbot] History save error:", e);
        }
    }

    // Global helper APIs to open Support or AI chatbot directly from navbar or links
    window.openCustomerSupport = function () {
        if (!state.isBuyer) {
            alert("🔒 Customer Support is exclusively available to verified Basic and Pro license holders. Please log in with your purchase account or buy a license.");
            const target = window.location.pathname.includes('/support_page/') || window.location.pathname.includes('/feedback_page/') || window.location.pathname.includes('/product_page/') || window.location.pathname.includes('/demo_page/') || window.location.pathname.includes('/purchase_page/') || window.location.pathname.includes('/auth_page/')
                ? '../purchase_page/purchase.html'
                : 'purchase_page/purchase.html';
            window.location.href = target;
            return;
        }
        toggleChat(true);
        switchSupportMode('live');
    };

    window.PrivCloudChatbot = {
        openLiveSupport: window.openCustomerSupport,
        openAiChat: function () {
            toggleChat(true);
            switchSupportMode('ai');
        },
        toggleChat: toggleChat
    };

    // Initialize on DOM Ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initChatbot);
    } else {
        initChatbot();
    }
})();
