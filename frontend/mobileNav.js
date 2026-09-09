/**
 * PrivCloud — Unified Mobile Navigation Controller (mobileNav.js)
 * Handles mobile drawer toggling, touch events, smooth scroll navigation,
 * backdrop dismissal, accessibility attributes, and Supabase auth state sync.
 */

(function () {
    'use strict';

    function initMobileNav() {
        const toggleBtn = document.getElementById('mobile-nav-toggle');
        const drawer = document.getElementById('mobile-nav-drawer');
        const backdrop = document.getElementById('mobile-nav-backdrop');
        const closeBtn = document.getElementById('mobile-drawer-close');
        const mobileLinks = document.querySelectorAll('.mobile-nav-link');
        const mobileNavActions = document.getElementById('mobile-nav-actions');
        const desktopNavActions = document.querySelector('.nav-actions');

        if (!toggleBtn || !drawer) {
            return;
        }

        function openDrawer() {
            drawer.classList.add('is-open');
            if (backdrop) backdrop.classList.add('is-open');
            toggleBtn.classList.add('is-active');
            toggleBtn.setAttribute('aria-expanded', 'true');
            drawer.setAttribute('aria-hidden', 'false');
            document.body.classList.add('nav-drawer-open');
        }

        function closeDrawer() {
            drawer.classList.remove('is-open');
            if (backdrop) backdrop.classList.remove('is-open');
            toggleBtn.classList.remove('is-active');
            toggleBtn.setAttribute('aria-expanded', 'false');
            drawer.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('nav-drawer-open');
        }

        function toggleDrawer() {
            if (drawer.classList.contains('is-open')) {
                closeDrawer();
            } else {
                openDrawer();
            }
        }

        // 1. Event Listeners for Open / Close
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDrawer();
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeDrawer();
            });
        }

        if (backdrop) {
            backdrop.addEventListener('click', () => {
                closeDrawer();
            });
        }

        // 2. Close on Escape Key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
                closeDrawer();
            }
        });

        // 3. Close on link click & handle smooth scroll
        mobileLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                closeDrawer();

                // If anchor link on current page
                if (href && href.startsWith('#') && href.length > 1) {
                    const targetEl = document.querySelector(href);
                    if (targetEl) {
                        e.preventDefault();
                        const navHeight = 64;
                        const targetPosition = targetEl.getBoundingClientRect().top + window.pageYOffset - navHeight;
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });

        // 4. Update Active Link Highlighting in Mobile Nav
        function updateActiveMobileLink() {
            const currentPath = window.location.pathname.toLowerCase();
            const currentHash = window.location.hash.toLowerCase();

            mobileLinks.forEach(link => {
                const href = link.getAttribute('href') || '';
                let isActive = false;

                if (href.startsWith('#') && currentHash) {
                    isActive = href.toLowerCase() === currentHash;
                } else if (!href.startsWith('#')) {
                    const targetFilename = href.split('/').pop().split('?')[0].split('#')[0];
                    const currentFilename = currentPath.split('/').pop() || 'index.html';
                    if (targetFilename && currentFilename.includes(targetFilename)) {
                        isActive = true;
                    }
                }

                if (isActive) {
                    link.classList.add('active');
                }
            });
        }
        updateActiveMobileLink();

        // 5. Dual-Target Supabase Authentication State Synchronization
        if (window.PrivCloudAuth) {
            const updateAuthElements = (session) => {
                if (session && session.user) {
                    const user = session.user;
                    const meta = user.user_metadata || {};
                    let displayName = meta.full_name || meta.name || user.email?.split('@')[0] || 'User';

                    const renderAuthUI = (name) => {
                        // Desktop Nav Actions
                        if (desktopNavActions) {
                            desktopNavActions.innerHTML = `
                                <span style="font-size: 0.88rem; font-weight: 600; color: #0284c7; background: rgba(2,132,199,0.08); padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(2,132,199,0.2); display: inline-flex; align-items: center; gap: 6px;">
                                    👤 ${escapeHtml(name)}
                                </span>
                                <button id="btn-logout-desktop" class="btn-login" style="cursor: pointer; border: none; background: transparent;">Sign Out</button>
                            `;
                            const desktopLogout = document.getElementById('btn-logout-desktop');
                            if (desktopLogout) {
                                desktopLogout.addEventListener('click', async () => {
                                    await window.PrivCloudAuth.signOut();
                                    window.location.reload();
                                });
                            }
                        }

                        // Mobile Nav Actions
                        if (mobileNavActions) {
                            mobileNavActions.innerHTML = `
                                <div class="mobile-user-badge">
                                    <span>👤</span>
                                    <span>${escapeHtml(name)}</span>
                                </div>
                                <button id="btn-logout-mobile" class="mobile-btn-logout">
                                    <span>🚪</span>
                                    <span>Sign Out</span>
                                </button>
                            `;
                            const mobileLogout = document.getElementById('btn-logout-mobile');
                            if (mobileLogout) {
                                mobileLogout.addEventListener('click', async () => {
                                    await window.PrivCloudAuth.signOut();
                                    window.location.reload();
                                });
                            }
                        }
                    };

                    renderAuthUI(displayName);

                    // Async resolve full name if not in metadata
                    if (!meta.full_name && user.email && window.PrivCloudAuth.resolveIdentifier) {
                        window.PrivCloudAuth.resolveIdentifier(user.email).then(res => {
                            if (res && res.fullName) {
                                renderAuthUI(res.fullName);
                            }
                        }).catch(() => { });
                    }
                }
            };

            window.PrivCloudAuth.getSession().then(updateAuthElements);

            const client = window.PrivCloudAuth.getClient();
            if (client && client.auth) {
                client.auth.onAuthStateChange((_event, session) => {
                    updateAuthElements(session);
                });
            }
        }

        // Expose API
        window.PrivCloudMobileNav = {
            open: openDrawer,
            close: closeDrawer,
            toggle: toggleDrawer
        };
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileNav);
    } else {
        initMobileNav();
    }
})();
