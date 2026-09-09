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
 * Check if the logged-in user owns an active Basic or Pro license,
 * and if so, change all "Buy" buttons to "Your Keys and Products".
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
        if (data && data.has_license) {
            const tier = (data.tier || '').toUpperCase();
            if (tier === 'BASIC' || tier === 'PRO') {
                updateButtonsForLicensedUser(data);
            }
        }
    } catch (err) {
        console.warn('[PrivCloud] Error checking user license:', err);
    }
}

function updateButtonsForLicensedUser(licenseData) {
    const buyButtonIds = [
        'btn-hero-pro',
        'btn-pricing-basic',
        'btn-pricing-pro',
        'btn-cta-pro',
        'btn-cta-basic'
    ];

    const targetPlan = licenseData.plan_id || (licenseData.tier === 'PRO' ? '6b2f8c1a9d4e07bf' : '4d9e1a7b0c3f8e2a');

    buyButtonIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.innerHTML = `<span class="btn-icon">🔑</span> Your Keys and Products`;
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `../purchase_page/purchase.html?plan=${encodeURIComponent(targetPlan)}`;
            };
        }
    });
}

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

