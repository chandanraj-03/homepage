/**
 * PrivCloud — Product Page Interactive Logic (product.js)
 * Implements Plan Selection Redirects, Smooth Section Scrolling,
 * and Supabase Auth Navigation State.
 */

document.addEventListener('DOMContentLoaded', () => {
    initSmoothScrolling();
    initNavbarAuth();
    checkPostAuthWelcomeToast();
});

/* ==========================================================================
   1. Smooth Scrolling & Hash Resolution
   ========================================================================== */

function initSmoothScrolling() {
    const PRODUCT_SECTION_ALIASES = {
        'comparison': 'comparison-section',
        'pricing': 'pricing-matrix-section',
        'features': 'features-detail'
    };

    const initialHash = window.location.hash.replace(/^#/, '');
    if (PRODUCT_SECTION_ALIASES[initialHash]) {
        const targetId = PRODUCT_SECTION_ALIASES[initialHash];
        setTimeout(() => {
            const el = document.getElementById(targetId);
            if (el) {
                const headerOffset = 76;
                const offsetPosition = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
        }, 100);
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#' || href.startsWith('#login') || href.startsWith('#register')) return;

            const targetEl = document.querySelector(href);
            if (targetEl) {
                e.preventDefault();
                const headerOffset = 76;
                const elementPosition = targetEl.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/* ==========================================================================
   3. Plan Selection & Checkout Handler
   ========================================================================== */

// 16-Character Secure Plan Token Mapping
const PLAN_TOKEN_MAP = {
    'trial': '9a8f10e7b9c2d4a6',
    'basic': '4d9e1a7b0c3f8e2a',
    'pro': '6b2f8c1a9d4e07bf',
    'free': '9a8f10e7b9c2d4a6',
    '9a8f10e7b9c2d4a6': '9a8f10e7b9c2d4a6',
    '4d9e1a7b0c3f8e2a': '4d9e1a7b0c3f8e2a',
    '6b2f8c1a9d4e07bf': '6b2f8c1a9d4e07bf'
};

/**
 * Handle Plan Selection (Trial, Basic, Pro)
 * If authenticated -> redirect directly to secure purchase/checkout page.
 * If unauthenticated -> redirect to authentication page with redirect parameters.
 */
async function handlePlanSelection(plan) {
    const targetPlan = PLAN_TOKEN_MAP[plan] || '9a8f10e7b9c2d4a6';
    try {
        if (window.PrivCloudAuth) {
            const session = await window.PrivCloudAuth.getSession();
            if (session && session.user) {
                // User is authenticated -> Go straight to secure purchase page
                window.location.href = `../purchase_page/purchase.html?plan=${encodeURIComponent(targetPlan)}`;
                return;
            }
        }
    } catch (e) {
        console.warn('Auth check error:', e);
    }
    // User is NOT authenticated -> Go to Auth Page
    window.location.href = `../auth_page/auth.html?redirect=purchase&plan=${encodeURIComponent(targetPlan)}#f2d8a0c4e6b1973f`;
}
window.handlePlanSelection = handlePlanSelection;

/* ==========================================================================
   4. Navbar Supabase Authentication State
   ========================================================================== */

function initNavbarAuth() {
    if (window.PrivCloudAuth) {
        const updateNavbarUser = (session) => {
            const navActions = document.querySelector('.nav-actions');
            if (!navActions) return;

            if (session && session.user) {
                const user = session.user;
                const meta = user.user_metadata || {};
                let displayName = meta.full_name || meta.name || user.email?.split('@')[0] || 'User';

                const renderNav = (name) => {
                    navActions.innerHTML = `
                        <span style="font-size: 0.88rem; font-weight: 600; color: #0284c7; background: rgba(2,132,199,0.12); padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(2,132,199,0.3);">
                            👤 ${name}
                        </span>
                        <button id="btn-logout-nav" class="btn-login" style="cursor: pointer; border: none; background: transparent;">Sign Out</button>
                    `;
                    const logoutBtn = document.getElementById('btn-logout-nav');
                    if (logoutBtn) {
                        logoutBtn.addEventListener('click', async () => {
                            await window.PrivCloudAuth.signOut();
                            window.location.reload();
                        });
                    }
                };

                renderNav(displayName);

                if (user.email) {
                    checkUserActiveLicense(user.email);
                }

                if (!meta.full_name && user.email && window.PrivCloudAuth.resolveIdentifier) {
                    window.PrivCloudAuth.resolveIdentifier(user.email).then(res => {
                        if (res && res.fullName) {
                            renderNav(res.fullName);
                        }
                    }).catch(() => {});
                }
            }
        };

        window.PrivCloudAuth.getSession().then(updateNavbarUser);

        const client = window.PrivCloudAuth.getClient();
        if (client) {
            client.auth.onAuthStateChange((_event, session) => {
                updateNavbarUser(session);
            });
        }
    }
}

/**
 * State-driven dynamic pricing cards updater based on backend subscription/license status
 */
async function checkUserActiveLicense(userEmail) {
    if (!userEmail) return;
    try {
        const headers = {};
        if (window.PrivCloudAuth && window.PrivCloudAuth.getSession) {
            const session = await window.PrivCloudAuth.getSession();
            if (session && session.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
        }
        const licenseEndpoint = `/api/payment/my-license?user_email=${encodeURIComponent(userEmail)}`;
        const licenseUrl = (window.getPrivCloudApiUrl ? window.getPrivCloudApiUrl(licenseEndpoint) : (window.location.protocol === 'file:' ? 'http://localhost:5001' + licenseEndpoint : licenseEndpoint));
        const res = await fetch(licenseUrl, { headers });
        const data = await res.json();

        // Also check sessionStorage fallback for active session
        let cachedKey = null;
        try {
            const saved = sessionStorage.getItem(`pc_verified_order_${encodeURIComponent(userEmail.toLowerCase())}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.retrievedKey) cachedKey = parsed.retrievedKey;
            }
        } catch (e) {}

        if (data && data.has_license) {
            const tier = (data.tier || 'TRIAL').toUpperCase();
            const key = data.key || cachedKey || (tier === 'PRO' ? 'PRIV-PRO-ACTIVE-VIP' : (tier === 'BASIC' ? 'PRIV-BAS-ACTIVE' : 'PC30-TRIAL-ACTIVE'));
            applyLicenseStateToPricingCards({
                tier: tier,
                key: key,
                orderId: data.order_id || '',
                planId: data.plan_id || '',
                email: userEmail
            });
        } else {
            applyLicenseStateToPricingCards({ tier: 'NONE' });
        }
    } catch (err) {
        console.warn('[PrivCloud] Error checking user license:', err);
    }
}

function applyLicenseStateToPricingCards(state) {
    const tier = state.tier || 'NONE';
    const key = state.key || '';
    const email = state.email || 'Your Account';

    const costTrial = document.getElementById('pricing-cost-trial');
    const costBasic = document.getElementById('pricing-cost-basic');
    const costPro = document.getElementById('pricing-cost-pro');

    const actionTrial = document.getElementById('pricing-action-trial');
    const actionBasic = document.getElementById('pricing-action-basic');
    const actionPro = document.getElementById('pricing-action-pro');

    const cardTrial = document.getElementById('pricing-card-trial');
    const cardBasic = document.getElementById('pricing-card-basic');
    const cardPro = document.getElementById('pricing-card-pro');

    function createKeyBoxHtml(label, keyVal, subText) {
        return `
            <div class="pricing-key-display-box">
                <div class="key-box-content-left">
                    <span class="key-box-label">${label}</span>
                    <span class="key-box-code">${escapeCardHtml(keyVal)}</span>
                </div>
                <button type="button" class="key-box-copy" onclick="copyCardKey('${escapeCardHtml(keyVal)}', this)">📋 Copy</button>
            </div>
            <div class="pricing-account-info">
                <span>Account: <strong>${escapeCardHtml(email)}</strong></span>
                <span class="license-status-tag">${subText}</span>
            </div>
        `;
    }

    if (tier === 'PRO') {
        // --- 1. USER OWNS PRO ---
        // Pro Tab/Card: Replace price with Product Key & VIP details, no purchase button
        if (costPro) {
            costPro.innerHTML = `
                <div class="pricing-active-license-badge tier-pro">
                    <span class="active-pulse-dot"></span>
                    <span>👑 Active Pro Lifetime VIP</span>
                </div>
                ${createKeyBoxHtml('Pro Product Key', key, '✓ Verified Lifetime VIP · Unlimited Storage')}
            `;
        }
        if (actionPro) {
            actionPro.innerHTML = `
                <a href="../purchase_page/purchase.html?plan=6b2f8c1a9d4e07bf" class="pricing-action-btn btn-active-license">
                    <span>⬇️ Download Product & Manage Key</span>
                </a>
            `;
        }

        // Basic Tab/Card: Replace price with Key & active-plan info (covered by Pro), no purchase button
        if (costBasic) {
            costBasic.innerHTML = `
                <div class="pricing-active-license-badge tier-covered">
                    <span>✓ Covered by Pro VIP Subscription</span>
                </div>
                ${createKeyBoxHtml('Master Pro Key', key, '✓ Pro tier includes and exceeds all Basic features')}
            `;
        }
        if (actionBasic) {
            actionBasic.innerHTML = `
                <a href="../purchase_page/purchase.html?plan=6b2f8c1a9d4e07bf" class="pricing-action-btn btn-active-license">
                    <span>👑 Pro VIP Active (Download App)</span>
                </a>
            `;
        }

        // Trial Tab/Card: Covered by Pro
        if (costTrial) {
            costTrial.innerHTML = `
                <div class="pricing-active-license-badge tier-covered">
                    <span>✓ Covered by Pro VIP Subscription</span>
                </div>
                <div class="pricing-account-info" style="margin-top: 8px;">
                    <span>Your Pro license provides full unlimited access without trial limits.</span>
                </div>
            `;
        }
        if (actionTrial) {
            actionTrial.innerHTML = `
                <a href="../purchase_page/purchase.html?plan=6b2f8c1a9d4e07bf" class="pricing-action-btn btn-active-license">
                    <span>⬇️ Download Product Installer</span>
                </a>
            `;
        }

        // Global CTA Buttons
        updateHeroCtaButtons('👑 Pro Active · Download PrivCloud', '../purchase_page/purchase.html?plan=6b2f8c1a9d4e07bf');

    } else if (tier === 'BASIC') {
        // --- 2. USER OWNS BASIC ---
        // Basic Tab/Card: Replace price with Product Key & license details, no purchase button
        if (costBasic) {
            costBasic.innerHTML = `
                <div class="pricing-active-license-badge tier-basic">
                    <span class="active-pulse-dot"></span>
                    <span>⭐ Active Basic Lifetime License</span>
                </div>
                ${createKeyBoxHtml('Basic Product Key', key, '✓ Verified Lifetime License · 500 GB Storage')}
            `;
        }
        if (actionBasic) {
            actionBasic.innerHTML = `
                <a href="../purchase_page/purchase.html?plan=4d9e1a7b0c3f8e2a" class="pricing-action-btn btn-active-license">
                    <span>⬇️ Download Product & Manage Key</span>
                </a>
            `;
        }

        // Pro Tab/Card: Continue showing Pro price + "Upgrade to Pro" button
        if (costPro) {
            costPro.innerHTML = `
                <div class="pricing-strike-group">
                    <span class="pricing-original-strike">₹1,990</span>
                    <span class="pricing-amount">₹199</span>
                </div>
                <span class="pricing-tenure">One-Time Lifetime VIP</span>
            `;
        }
        if (actionPro) {
            actionPro.innerHTML = `
                <a href="../purchase_page/purchase.html?plan=6b2f8c1a9d4e07bf" class="pricing-action-btn btn-upgrade-pro">
                    <span>👑 Upgrade to Pro — ₹199 (90% OFF)</span>
                </a>
            `;
        }

        // Trial Tab/Card: Covered by Basic
        if (costTrial) {
            costTrial.innerHTML = `
                <div class="pricing-active-license-badge tier-covered">
                    <span>✓ Covered by Basic Lifetime License</span>
                </div>
                <div class="pricing-account-info" style="margin-top: 8px;">
                    <span>Your Basic license provides permanent access without trial limits.</span>
                </div>
            `;
        }
        if (actionTrial) {
            actionTrial.innerHTML = `
                <a href="../purchase_page/purchase.html?plan=4d9e1a7b0c3f8e2a" class="pricing-action-btn btn-active-license">
                    <span>⬇️ Download Product Installer</span>
                </a>
            `;
        }

        // Global CTA Buttons
        updateHeroCtaButtons('⭐ Basic Active · Upgrade to Pro', '../purchase_page/purchase.html?plan=6b2f8c1a9d4e07bf');

    } else if (tier === 'TRIAL') {
        // --- 3. TRIAL USER ---
        // Trial Tab/Card: Show active trial information instead of price, no purchase button
        if (costTrial) {
            costTrial.innerHTML = `
                <div class="pricing-active-license-badge tier-trial">
                    <span class="active-pulse-dot"></span>
                    <span>🎁 Active 14-Day Free Evaluation</span>
                </div>
                ${createKeyBoxHtml('Trial Evaluation Key', key, '✓ 14-Day Evaluation Active · 1 PC')}
            `;
        }
        if (actionTrial) {
            actionTrial.innerHTML = `
                <a href="../purchase_page/purchase.html?plan=9a8f10e7b9c2d4a6" class="pricing-action-btn btn-active-license">
                    <span>⬇️ Download Product & Manage Trial</span>
                </a>
            `;
        }

        // Basic Tab/Card: Show price + Upgrade to Basic button
        if (costBasic) {
            costBasic.innerHTML = `
                <div class="pricing-strike-group">
                    <span class="pricing-original-strike">₹245</span>
                    <span class="pricing-amount">₹49</span>
                </div>
                <span class="pricing-tenure">One-Time Lifetime License</span>
            `;
        }
        if (actionBasic) {
            actionBasic.innerHTML = `
                <a href="../purchase_page/purchase.html?plan=4d9e1a7b0c3f8e2a" class="pricing-action-btn btn-upgrade-basic">
                    <span>⭐ Upgrade to Basic — ₹49 (80% OFF)</span>
                </a>
            `;
        }

        // Pro Tab/Card: Show price + Upgrade to Pro button
        if (costPro) {
            costPro.innerHTML = `
                <div class="pricing-strike-group">
                    <span class="pricing-original-strike">₹1,990</span>
                    <span class="pricing-amount">₹199</span>
                </div>
                <span class="pricing-tenure">One-Time Lifetime VIP</span>
            `;
        }
        if (actionPro) {
            actionPro.innerHTML = `
                <a href="../purchase_page/purchase.html?plan=6b2f8c1a9d4e07bf" class="pricing-action-btn btn-upgrade-pro">
                    <span>👑 Upgrade to Pro — ₹199 (90% OFF)</span>
                </a>
            `;
        }

        // Global CTA Buttons
        updateHeroCtaButtons('🎁 Trial Active · Upgrade Plan', '../purchase_page/purchase.html?plan=6b2f8c1a9d4e07bf');
    }
}

function updateHeroCtaButtons(label, targetUrl) {
    const buyButtonIds = [
        'btn-hero-pro',
        'btn-cta-pro',
        'btn-cta-basic'
    ];
    buyButtonIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.innerHTML = `<span class="btn-icon">⚡</span> ${label}`;
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = targetUrl;
            };
        }
    });
}

function escapeCardHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

window.copyCardKey = function(keyVal, btn) {
    if (!keyVal) return;
    navigator.clipboard.writeText(keyVal).then(() => {
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✓ Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('copied');
            }, 2500);
        }
    }).catch(err => {
        console.warn('Clipboard write failed:', err);
    });
};

/* ==========================================================================
   5. Post-Auth Welcome Toast Notification
   ========================================================================== */

function checkPostAuthWelcomeToast() {
    try {
        if (sessionStorage.getItem('privcloud_just_authenticated')) {
            sessionStorage.removeItem('privcloud_just_authenticated');
            const savedName = sessionStorage.getItem('privcloud_auth_user_name') || '';
            if (savedName) sessionStorage.removeItem('privcloud_auth_user_name');

            const toast = document.createElement('div');
            toast.className = 'product-auth-welcome-toast';
            toast.innerHTML = `
                <div class="product-auth-toast-icon">✨</div>
                <div class="product-auth-toast-content">
                    <span class="product-auth-toast-title">Authenticated Successfully</span>
                    <span class="product-auth-toast-msg">${savedName ? `Welcome, ${savedName}! ` : ''}Your PrivCloud personal cloud space is ready.</span>
                </div>
                <button class="product-auth-toast-close" aria-label="Close">&times;</button>
            `;
            document.body.appendChild(toast);

            setTimeout(() => toast.classList.add('visible'), 150);

            const closeToast = () => {
                toast.classList.remove('visible');
                setTimeout(() => toast.remove(), 400);
            };

            const closeBtn = toast.querySelector('.product-auth-toast-close');
            if (closeBtn) closeBtn.onclick = closeToast;

            setTimeout(closeToast, 5000);
        }
    } catch (e) {
        console.warn('Toast display error:', e);
    }
}

