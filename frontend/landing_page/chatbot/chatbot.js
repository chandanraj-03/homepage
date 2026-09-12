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
        messages: []
    };



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
                <span>PrivCloud AI Assistant</span>
                <span class="promo-close" id="promo-close-btn" title="Dismiss">&times;</span>
            </div>

            <!-- Floating Action Button (Bot Character) -->
            <button class="privcloud-chatbot-fab" id="privcloud-chat-toggle" aria-label="Toggle PrivCloud AI Chatbot" title="PrivCloud AI Assistant">
                <div class="fab-icon fab-icon-ai">
                    <img src="${SUPABASE_ASSETS_URL}/bot.png" alt="PrivCloud Bot" class="fab-bot-img">
                    <span class="fab-avatar-status status-render" id="fab-status-dot" title="Render backend active (Cloud)"></span>
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
                            <span class="chat-avatar-status status-render" id="header-status-dot" title="Render backend active (Cloud)"></span>
                        </div>
                        <div class="chat-title-group">
                            <div class="chat-title-row">
                                <span class="chat-title">PrivCloud AI</span>
                            </div>
                            <span class="chat-subtitle" id="chat-header-subtitle">Product Assistant</span>
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
                            <span id="footer-status-text">For more information <a href="mailto:privcloud0@gmail.com" class="chat-footer-contact-link">contact PrivCloud</a></span>
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

        // Key Features
        if (/^(what are (?:the )?key features|key features|what are features|features|tell me features|main features|list features)$/i.test(clean)) {
            return `**PrivCloud Key Features**\n\n- 🔒 **100% Zero-Telemetry & Zero-Knowledge** — Your files stay strictly on your personal Windows machine; no third-party data tracking or cloud snooping.\n- ⚡ **Gigabit LAN Speed** — Ultra-fast local network file transfers and 4K media streaming using full network bandwidth.\n- 🌐 **Encrypted Remote HTTPS Tunnel** — Secure anywhere-access without complicated router port forwarding or exposed public IPs.\n- 🎬 **In-Browser 4K Media Suite** — Stream 4K video with hardware acceleration, lossless audio, PDF preview, and client upload dropboxes.\n- 💰 **One-Time Lifetime Ownership** — Zero monthly or annual subscriptions. Pay once and own your cloud forever.\n- 🎛️ **Native Windows Control Panel** — Lightweight \`PrivCloud_Setup.exe\` with real-time storage metrics and Quota Guard.\n\nWould you like to know more about our **pricing**, **installation**, or **security**?`;
        }

        // Pricing & Plans
        if (/^(pricing|plans|price|how much|what does it cost|cost|subscription|lifetime price|how much does it cost)$/i.test(clean)) {
            return `**PrivCloud Lifetime Pricing (No Subscriptions!)**\n\n- 🎁 **14-Day Free Trial**: 1 virtual drive, 100 GB storage limit, and basic media streaming.\n- ⭐ **Basic Edition (₹1,499 / ~$19 Lifetime)**: 2 virtual drives, 2 TB storage quota, 1080p streaming, and full local network sharing.\n- 👑 **Pro Edition (₹2,999 / ~$39 Lifetime)**: Unlimited virtual drives, unlimited storage quota, 4K streaming, encrypted remote HTTPS tunnel, and priority updates.\n\nAll licenses are **perpetual lifetime licenses** with zero recurring fees!`;
        }

        // Installation & Setup
        if (/^(how to install|install|download|setup|how to setup|installation|windows requirements)$/i.test(clean)) {
            return `**PrivCloud Installation & Setup**\n\n1. Download the native Windows installer (\`PrivCloud_Setup.exe\`) from your purchase confirmation or the portal.\n2. Run the installer and launch the PrivCloud desktop control panel.\n3. Enter your product key (or activate the 14-day free trial) and assign your storage folder.\n4. Access your private cloud from any browser at \`localhost\` or across your LAN!\n\nNeed assistance? Contact support at [privcloud0@gmail.com](mailto:privcloud0@gmail.com).`;
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
        const defaultHelp = `**PrivCloud Core Highlights**\n\n- 🔒 **100% Zero-Telemetry & Zero-Knowledge**: Your personal files stay strictly on your own hardware; no cloud snooping or external collection.\n- ⚡ **Gigabit LAN Speeds & Remote HTTPS Tunnel**: Blazing-fast local network file transfers plus encrypted remote access without router port forwarding.\n- 🎬 **In-Browser 4K Media & File Suite**: Stream 4K video, lossless audio, preview documents/PDFs, and share password-protected client dropboxes.\n- 💰 **One-Time Lifetime Licensing**: Free 14-day trial, Basic Edition (₹1,499 / $19), and Pro Edition (₹2,999 / $39) with unlimited storage & drives.\n\nFor more information or inquiries, [contact PrivCloud](mailto:privcloud0@gmail.com).`;

        if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
            return defaultHelp;
        }

        const lower = rawText.toLowerCase().trim();

        // Check for common RAG 'not found in documentation' or canned refusal responses
        if (
            lower.includes("don't have enough details") ||
            lower.includes("not enough details") ||
            lower.includes("couldn't find that information") ||
            lower.includes("could not find that information") ||
            lower.includes("not found in the repository") ||
            lower.includes("not found in the documentation") ||
            lower.includes("does not contain information") ||
            lower.includes("i don't have information") ||
            lower.includes("i don't know") || 
            lower.includes("no information available") ||
            lower === "n/a"
        ) {
            return defaultHelp;
        }

        return rawText;
    }

    // =========================================================================
    // Core Messaging Logic & Pretrained RAG Integration
    // =========================================================================

    function extractSourceInfo(data) {
        if (!data || typeof data !== 'object') {
            return {
                source: 'render',
                indicator: '🟡',
                label: 'Render (Cloud)'
            };
        }

        // 1. Check for explicit backend response annotations
        if (data.source && data.source_indicator && data.source_label) {
            return {
                source: data.source,
                indicator: data.source_indicator,
                label: data.source_label
            };
        }

        const provider = String(data.provider || '').toLowerCase().trim();
        const model = String(data.model || '').toLowerCase().trim();
        const isFailover = Boolean(data.failover);

        // 2. Check for local laptop model (qwen/tinylama)
        const isLocal = (
            (provider === 'local' || provider === 'laptop' || provider.includes('local')) ||
            (!isFailover && (model.includes('qwen') || model.includes('tinylama') || model.includes('local')))
        ) && !isFailover;

        if (isLocal) {
            return {
                source: 'local',
                indicator: '🟢',
                label: 'Local (laptop (qwen/tinylama))'
            };
        }

        // 3. Render cloud model (Groq / OpenRouter / Gemini)
        let cloudName = 'Groq/OpenRouter/Gemini';
        if (provider.includes('groq') || model.includes('gpt-oss') || model.includes('llama')) {
            cloudName = 'Groq';
        } else if (provider.includes('openrouter') || model.includes('deepseek')) {
            cloudName = 'OpenRouter';
        } else if (provider.includes('gemini')) {
            cloudName = 'Gemini';
        } else if (provider) {
            cloudName = provider.charAt(0).toUpperCase() + provider.slice(1);
        }

        return {
            source: 'render',
            indicator: '🟡',
            label: `Render (${cloudName})`
        };
    }

    function updateChatHeaderStatus(source, label) {
        const headerDot = document.getElementById("header-status-dot");
        const fabDot = document.getElementById("fab-status-dot");

        const isLocal = source === 'local';
        const tooltip = isLocal ? "Local model active (laptop (qwen/tinylama))" : "Render backend active (Groq/OpenRouter/Gemini)";

        if (headerDot) {
            headerDot.className = `chat-avatar-status ${isLocal ? 'status-local' : 'status-render'}`;
            headerDot.title = tooltip;
        }

        if (fabDot) {
            fabDot.className = `fab-avatar-status ${isLocal ? 'status-local' : 'status-render'}`;
            fabDot.title = tooltip;
        }
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
            const sourceInfo = {
                source: "local",
                indicator: "🟢",
                label: "Local (laptop (qwen/tinylama))"
            };

            const botMsg = {
                id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                role: "assistant",
                content: quickAnswer,
                source: sourceInfo.source,
                indicator: sourceInfo.indicator,
                sourceLabel: sourceInfo.label,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            state.messages.push(botMsg);
            saveStoredHistory();
            updateChatHeaderStatus(sourceInfo.source, sourceInfo.label);
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

            const rawAnswer = (data && (data.answer || data.response || data.reply || data.text || data.message)) || (typeof data === 'string' ? data : '');
            let finalAnswer = sanitizeBotResponse(rawAnswer);
            const sourceInfo = extractSourceInfo(data);

            const botMsg = {
                id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                role: "assistant",
                content: finalAnswer,
                source: sourceInfo.source,
                indicator: sourceInfo.indicator,
                sourceLabel: sourceInfo.label,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            state.messages.push(botMsg);
            saveStoredHistory();
            updateChatHeaderStatus(sourceInfo.source, sourceInfo.label);
            renderMessages();

        } catch (error) {
            removeTypingIndicator();
            console.error("[PrivCloud Chatbot] Query error:", error);

            const sourceInfo = {
                source: "render",
                indicator: "🟡",
                label: "Render (Fallback)"
            };

            const botMsg = {
                id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                role: "assistant",
                content: sanitizeBotResponse(""),
                source: sourceInfo.source,
                indicator: sourceInfo.indicator,
                sourceLabel: sourceInfo.label,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            state.messages.push(botMsg);
            saveStoredHistory();
            updateChatHeaderStatus(sourceInfo.source, sourceInfo.label);
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

        // 1. Prioritize Resilient Backend Proxy Route (/api/chat)
        try {
            let proxyEndpoint = (typeof window !== 'undefined' && window.getPrivCloudApiUrl)
                ? window.getPrivCloudApiUrl(PROXY_API_URL)
                : PROXY_API_URL;

            if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
                proxyEndpoint = `http://127.0.0.1:5001${PROXY_API_URL}`;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const proxyResponse = await fetch(proxyEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (proxyResponse.ok) {
                const proxyData = await proxyResponse.json();
                if (proxyData && (proxyData.answer || proxyData.response || proxyData.message || proxyData.reply)) {
                    return proxyData;
                }
            }
        } catch (proxyErr) {
            console.warn("[PrivCloud Chatbot] Proxy fetch unavailable, falling back to direct endpoint:", proxyErr.message);
            lastError = proxyErr;
        }

        // 2. Fallback to Direct Render Backend
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);

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
            console.error("[PrivCloud Chatbot] Direct fetch also failed:", err);
            throw lastError || err;
        }
    }

    async function checkBackendHealth() {
        const footerStatusText = document.getElementById("footer-status-text");
        const footerStatusDot = document.getElementById("footer-status-dot");
        if (footerStatusDot) footerStatusDot.style.display = "none";
        if (footerStatusText) {
            footerStatusText.innerHTML = 'For more information <a href="mailto:privcloud0@gmail.com" class="chat-footer-contact-link">contact PrivCloud</a>';
        }

        try {
            const healthUrl = (typeof window !== 'undefined' && window.getPrivCloudApiUrl)
                ? window.getPrivCloudApiUrl(PROXY_HEALTH_URL)
                : (window.location.protocol === 'file:' ? `http://127.0.0.1:5001${PROXY_HEALTH_URL}` : PROXY_HEALTH_URL);

            const res = await fetch(healthUrl, { method: "GET", headers: { "Accept": "application/json" } });
            if (res.ok) {
                const data = await res.json();
                const source = data.source || 'render';
                const label = data.source_label || (source === 'local' ? 'Local (laptop (qwen/tinylama))' : 'Render (Online)');
                updateChatHeaderStatus(source, label);
            }
        } catch (e) {
            updateChatHeaderStatus('render', 'Render (Cloud)');
        }
    }

    function setOfflineUI() {
        const footerStatusText = document.getElementById("footer-status-text");
        const footerStatusDot = document.getElementById("footer-status-dot");
        if (footerStatusDot) footerStatusDot.style.display = "none";
        if (footerStatusText) {
            footerStatusText.innerHTML = 'For more information <a href="mailto:privcloud0@gmail.com" class="chat-footer-contact-link">contact PrivCloud</a>';
        }
        updateChatHeaderStatus('render', 'Render (Cloud)');
    }

    // =========================================================================
    // UI Rendering & Markdown Parsing
    // =========================================================================

    function renderMessages() {
        const body = document.getElementById("chat-messages-container");
        if (!body) return;

        body.innerHTML = "";

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

    const ROTATING_PROCESSING_MESSAGES = [
        "Thinking… 🫧",
        "Working on it…",
        "One moment…",
        "Preparing…",
        "Almost there…"
    ];

    let typingRotationInterval = null;

    function renderTypingIndicator() {
        const body = document.getElementById("chat-messages-container");
        if (!body || document.getElementById("chat-typing-row")) return;

        let messageIndex = 0;

        const row = document.createElement("div");
        row.className = "chat-msg-row bot-row";
        row.id = "chat-typing-row";
        row.innerHTML = `
            <div class="chat-typing-bubble">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-text" id="chat-typing-text">${ROTATING_PROCESSING_MESSAGES[0]}</span>
            </div>
        `;
        body.appendChild(row);

        if (typingRotationInterval) {
            clearInterval(typingRotationInterval);
            typingRotationInterval = null;
        }

        typingRotationInterval = setInterval(() => {
            const textEl = document.getElementById("chat-typing-text");
            if (!textEl) {
                if (typingRotationInterval) clearInterval(typingRotationInterval);
                return;
            }
            messageIndex = (messageIndex + 1) % ROTATING_PROCESSING_MESSAGES.length;
            textEl.style.opacity = "0";
            setTimeout(() => {
                if (textEl && document.getElementById("chat-typing-row")) {
                    textEl.textContent = ROTATING_PROCESSING_MESSAGES[messageIndex];
                    textEl.style.opacity = "1";
                }
            }, 180);
        }, 3000);
    }

    function removeTypingIndicator() {
        if (typingRotationInterval) {
            clearInterval(typingRotationInterval);
            typingRotationInterval = null;
        }
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

    // Global helper APIs to open AI chatbot directly from navbar or links
    window.openCustomerSupport = function () {
        toggleChat(true);
    };

    window.openSupportChatWidget = window.openCustomerSupport;

    window.PrivCloudChatbot = {
        openAiChat: function () {
            toggleChat(true);
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
