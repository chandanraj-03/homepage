/**
 * PrivCloud AI Floating Chatbot Widget
 * Integrated with Streamlit Cloud RAG Backend
 */

(function () {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    const STREAMLIT_APP_URL = "https://ragchatbot-xvkzxhpasyqnpmrpbsmuvd.streamlit.app/?embed=true";
    const SUPABASE_ASSETS_URL = "https://qrxjyvezlotjwggtgoqe.supabase.co/storage/v1/object/public/assets";

    let state = {
        isOpen: false,
        isExpanded: false
    };

    // =========================================================================
    // DOM INITIALIZATION
    // =========================================================================
    function initChatbot() {
        const container = document.createElement("div");
        container.className = "privcloud-chatbot-fab-wrap";
        container.id = "privcloud-chatbot-root";

        container.innerHTML = `
            <!-- Proactive Welcome Pill -->
            <div class="privcloud-chat-promo-pill" id="privcloud-chat-promo">
                <span class="promo-sparkle">✨</span>
                <span>Ask PrivCloud AI Assistant</span>
                <span class="promo-close" id="promo-close-btn" title="Dismiss">&times;</span>
            </div>

            <!-- Floating Action Button (Only Bot Character) -->
            <button class="privcloud-chatbot-fab" id="privcloud-chat-toggle" aria-label="Toggle AI Chatbot" title="Chat with PrivCloud AI">
                <div class="fab-icon fab-icon-ai">
                    <img src="${SUPABASE_ASSETS_URL}/bot.png" alt="PrivCloud Bot" class="fab-bot-img">
                </div>
                <div class="fab-icon fab-icon-close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </div>
                <span class="fab-status-dot" title="Online"></span>
            </button>

            <!-- Main Chatbot Window - Frosted Sky Glass -->
            <div class="privcloud-chat-window" id="privcloud-chat-window">
                
                <!-- Chat Header -->
                <div class="privcloud-chat-header">
                    <div class="privcloud-chat-header-left">
                        <div class="chat-avatar-ring">
                            <img src="${SUPABASE_ASSETS_URL}/bot.png" alt="PrivCloud Bot" class="header-bot-img">
                            <span class="chat-avatar-status"></span>
                        </div>
                        <div class="chat-title-group">
                            <div class="chat-title-row">
                                <span class="chat-title">PrivCloud AI</span>
                                <span class="chat-badge-pill">RAG Streamlit</span>
                            </div>
                            <span class="chat-subtitle">Grounded in Documentation</span>
                        </div>
                    </div>
                    <div class="privcloud-chat-header-actions">
                        <button class="chat-hdr-btn" id="btn-reload-stream" title="Reload Chat Session">
                            🔄
                        </button>
                        <button class="chat-hdr-btn btn-expand" id="btn-expand-chat" title="Expand / Minimize Window">
                            🗖
                        </button>
                        <button class="chat-hdr-btn" id="btn-close-chat" title="Close Chat">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Streamlit Iframe Container with Smooth Loader -->
                <div class="streamlit-frame-wrap">
                    <div class="streamlit-loading-state" id="streamlit-loader">
                        <div class="typing-dot" style="width: 10px; height: 10px;"></div>
                        <div class="typing-dot" style="width: 10px; height: 10px; animation-delay: 0.2s;"></div>
                        <div class="typing-dot" style="width: 10px; height: 10px; animation-delay: 0.4s;"></div>
                        <span style="font-size: 0.85rem; font-weight: 600; color: #0284c7; margin-left: 8px;">Connecting to PrivCloud AI...</span>
                    </div>
                    <iframe 
                        id="streamlit-chat-iframe"
                        src="${STREAMLIT_APP_URL}" 
                        class="streamlit-chat-iframe"
                        frameborder="0"
                        allow="clipboard-read; clipboard-write;"
                        loading="lazy">
                    </iframe>
                </div>

            </div>
        `;

        document.body.appendChild(container);
        bindEvents();
    }

    // =========================================================================
    // EVENT BINDINGS
    // =========================================================================
    function bindEvents() {
        const toggleBtn = document.getElementById("privcloud-chat-toggle");
        const promoPill = document.getElementById("privcloud-chat-promo");
        const promoCloseBtn = document.getElementById("promo-close-btn");
        const closeBtn = document.getElementById("btn-close-chat");
        const expandBtn = document.getElementById("btn-expand-chat");
        const reloadBtn = document.getElementById("btn-reload-stream");
        const iframe = document.getElementById("streamlit-chat-iframe");
        const loader = document.getElementById("streamlit-loader");

        // Hide loader when iframe loads
        if (iframe && loader) {
            iframe.addEventListener("load", () => {
                loader.style.opacity = "0";
                setTimeout(() => { loader.style.display = "none"; }, 300);
            });
        }

        // Toggle Open / Close
        toggleBtn.addEventListener("click", () => toggleChat());
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

        closeBtn.addEventListener("click", () => toggleChat(false));

        // Expand / Contract Window
        expandBtn.addEventListener("click", () => {
            state.isExpanded = !state.isExpanded;
            const chatWin = document.getElementById("privcloud-chat-window");
            chatWin.classList.toggle("is-expanded", state.isExpanded);
            expandBtn.textContent = state.isExpanded ? "🗕" : "🗖";
        });

        // Reload Streamlit Session
        if (reloadBtn && iframe) {
            reloadBtn.addEventListener("click", () => {
                reloadBtn.style.transform = "rotate(180deg)";
                reloadBtn.style.transition = "transform 0.4s ease";
                if (loader) {
                    loader.style.display = "flex";
                    loader.style.opacity = "1";
                }
                iframe.src = STREAMLIT_APP_URL + "&t=" + Date.now();
                setTimeout(() => {
                    reloadBtn.style.transform = "rotate(0deg)";
                }, 400);
            });
        }
    }

    // =========================================================================
    // UI ACTIONS
    // =========================================================================
    function toggleChat(forceState) {
        state.isOpen = typeof forceState === "boolean" ? forceState : !state.isOpen;
        const chatWin = document.getElementById("privcloud-chat-window");
        const toggleBtn = document.getElementById("privcloud-chat-toggle");
        const promoPill = document.getElementById("privcloud-chat-promo");

        if (state.isOpen) {
            chatWin.classList.add("is-visible");
            toggleBtn.classList.add("is-open");
            if (promoPill) promoPill.style.display = "none";
        } else {
            chatWin.classList.remove("is-visible");
            toggleBtn.classList.remove("is-open");
        }
    }

    // Initialize on DOM Ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initChatbot);
    } else {
        initChatbot();
    }
})();
