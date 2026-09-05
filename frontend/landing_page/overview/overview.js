/**
 * PrivCloud - Overview & Navigation Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-links a');

    // 16-Character Alphanumeric Section ID Mapping
    const SECTION_ALIAS_MAP = {
        'overview': 'a8f10e7b9c2d4a6e',
        'features': '3b8c2f1e4a7d90bc',
        'sec-a8f10e': 'a8f10e7b9c2d4a6e',
        'sec-3b8c2f': '3b8c2f1e4a7d90bc'
    };

    // Auto-resolve legacy / simple addresses to secure 16-character alphanumeric hashes
    const currentHash = window.location.hash.replace(/^#/, '');
    if (SECTION_ALIAS_MAP[currentHash]) {
        const secureHash = SECTION_ALIAS_MAP[currentHash];
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

    // Section active state for Overview page
    function getActiveSection() {
        return 'a8f10e7b9c2d4a6e';
    }

    function updateNavHighlight() {
        const activeId = getActiveSection();
        navLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            const target = href.replace(/.*#/, '');
            if (target === activeId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    window.addEventListener('scroll', updateNavHighlight, { passive: true });
    window.addEventListener('resize', updateNavHighlight, { passive: true });
    updateNavHighlight();

    // Smooth scroll for in-page anchors
    document.querySelectorAll('.navbar a[href^="#"], .site-footer a[href^="#"]').forEach(anchor => {
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

                setTimeout(updateNavHighlight, 300);
            }
        });
    });

    // Supabase Auth state listener for Navbar
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
                        <span style="font-size: 0.88rem; font-weight: 600; color: #0284c7; background: rgba(2,132,199,0.08); padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(2,132,199,0.2);">
                            👤 ${name}
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
                };

                renderNav(displayName);

                // Asynchronously fetch full name from backend if not yet in session metadata
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
});
