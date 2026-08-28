/**
 * PrivCloud — Product Page Interactive Logic (product.js)
 * Implements Plan Selection Redirects, Smooth Section Scrolling,
 * and Supabase Auth Navigation State.
 */

document.addEventListener('DOMContentLoaded', () => {
    initSmoothScrolling();
    initNavbarAuth();
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
