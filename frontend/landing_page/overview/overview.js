/**
 * PrivCloud - Overview & Navigation Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-links a');

    // Section scrollspy
    function getActiveSection() {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        // Reached bottom of page
        if (scrollY + windowHeight >= documentHeight - 120) {
            return 'about-us';
        }

        const aboutEl = document.getElementById('about-us');
        const featEl = document.getElementById('features');

        if (aboutEl) {
            const aboutTop = aboutEl.offsetTop - 120;
            if (scrollY >= aboutTop) {
                return 'about-us';
            }
        }

        if (featEl) {
            const featTop = featEl.offsetTop - 120;
            const featBottom = featTop + featEl.offsetHeight;
            if (scrollY >= featTop && scrollY < featBottom) {
                return 'features';
            }
        }

        return 'overview';
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
            if (href === '#' || href === '#login' || href === '#register') return;

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
