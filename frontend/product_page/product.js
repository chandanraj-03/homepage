/**
 * PrivCloud Product Page Interactivity
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. FAQ Accordion Toggle
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                faqItems.forEach(other => other.classList.remove('open'));
                if (!isOpen) {
                    item.classList.add('open');
                }
            });
        }
    });

    // 2. Dynamic Footer Year
    const copyEl = document.querySelector('.footer-copy');
    if (copyEl) {
        copyEl.innerHTML = `&copy; ${new Date().getFullYear()} PrivCloud. All rights reserved.`;
    }

    // 3. 16-Character Alphanumeric Hash Alias Resolution & Smooth Scrolling
    const PRODUCT_SECTION_ALIASES = {
        'comparison': '4d9e1a7b0c3f8e2a',
        'pricing': '6b2f8c1a9d4e07bf',
        'faq': '5c7a3d9b1e8f20ac',
        'sec-4d9e1a': '4d9e1a7b0c3f8e2a',
        'sec-6b2f8c': '6b2f8c1a9d4e07bf',
        'sec-5c7a3d': '5c7a3d9b1e8f20ac'
    };

    const initialHash = window.location.hash.replace(/^#/, '');
    if (PRODUCT_SECTION_ALIASES[initialHash]) {
        const secureHash = PRODUCT_SECTION_ALIASES[initialHash];
        history.replaceState(null, null, `#${secureHash}`);
        setTimeout(() => {
            const el = document.getElementById(secureHash);
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
            if (href === '#' || href === '#login' || href === '#register' || href === '#e9b4c0f81d3ea72a' || href === '#f2d8a0c4e6b1973f') return;

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

    // 4. Supabase Auth State for Navbar
    if (window.PrivCloudAuth) {
        const updateNavbarUser = (session) => {
            const navActions = document.querySelector('.nav-actions');
            if (!navActions) return;
            if (session && session.user) {
                const email = session.user.email || 'User';
                const username = email.split('@')[0];
                navActions.innerHTML = `
                    <span style="font-size: 0.88rem; font-weight: 600; color: #0284c7; background: rgba(2,132,199,0.08); padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(2,132,199,0.2);">
                        👤 ${username}
                    </span>
                    <button id="btn-logout" class="btn-login" style="cursor: pointer; border: none; background: transparent;">Sign Out</button>
                `;
                const logoutBtn = document.getElementById('btn-logout');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', async () => {
                        await window.PrivCloudAuth.signOut();
                        window.location.reload();
                    });
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
});

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
