/**
 * PrivCloud — Master Guide & Interactive Demo Logic (demo.js)
 * Implements Video Player Controls, 10-Step Wizard Stepper,
 * Multi-Device Connectivity, Control Panel Simulator, Searchable FAQ,
 * Cheatsheet Filters, and Supabase Auth Navigation State.
 */

document.addEventListener('DOMContentLoaded', () => {
    initVideoPlayer();
    initWizardStepper();
    initControlPanelMockup();
    initCopyButtons();
    initNavbarAuth();
});

/* ==========================================================================
   1. Video Player & Interactive Chapter Timeline
   ========================================================================== */

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function initVideoPlayer() {
    const video = document.getElementById('main-demo-video');
    const currentTimeElem = document.getElementById('video-current-time');
    const durationElem = document.getElementById('video-duration');
    const rateBtns = document.querySelectorAll('.rate-btn');
    const pipBtn = document.getElementById('btn-toggle-pip');
    const fullscreenBtn = document.getElementById('btn-fullscreen');

    if (!video) return;

    // Time update listener
    video.addEventListener('timeupdate', () => {
        if (currentTimeElem) currentTimeElem.textContent = formatTime(video.currentTime);
    });

    video.addEventListener('loadedmetadata', () => {
        if (durationElem) durationElem.textContent = formatTime(video.duration);
    });

    // Playback Rate Selector
    rateBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const rate = parseFloat(btn.dataset.rate || 1);
            video.playbackRate = rate;
            rateBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Picture-in-Picture
    if (pipBtn) {
        pipBtn.addEventListener('click', async () => {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else if (document.pictureInPictureEnabled) {
                    await video.requestPictureInPicture();
                }
            } catch (err) {
                console.warn('PiP error:', err);
            }
        });
    }

    // Fullscreen
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (video.requestFullscreen) {
                video.requestFullscreen();
            } else if (video.webkitRequestFullscreen) {
                video.webkitRequestFullscreen();
            }
        });
    }
}

/* ==========================================================================
   2. 10-Step Interactive Setup Wizard Stepper
   ========================================================================== */

function initWizardStepper() {
    const stepTabs = document.querySelectorAll('.step-tab-btn');
    const stepPanels = document.querySelectorAll('.wizard-step-panel');
    const prevBtn = document.getElementById('btn-prev-step');
    const nextBtn = document.getElementById('btn-next-step');
    const counterDisplay = document.getElementById('step-counter-display');
    const totalSteps = stepTabs.length || 10;
    let currentStep = 1;

    function goToStep(stepNum) {
        if (stepNum < 1) stepNum = 1;
        if (stepNum > totalSteps) stepNum = totalSteps;
        currentStep = stepNum;

        // Update tabs
        stepTabs.forEach(tab => {
            const stepVal = parseInt(tab.dataset.step, 10);
            if (stepVal === currentStep) {
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            } else {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
            }
        });

        // Update panels
        stepPanels.forEach(panel => {
            panel.classList.remove('active');
        });
        const activePanel = document.getElementById(`wizard-panel-${currentStep}`);
        if (activePanel) {
            activePanel.classList.add('active');
        }

        // Update footer controls
        if (counterDisplay) {
            counterDisplay.textContent = `Step ${currentStep} of ${totalSteps}`;
        }
        if (prevBtn) {
            prevBtn.disabled = (currentStep === 1);
        }
        if (nextBtn) {
            if (currentStep === totalSteps) {
                nextBtn.textContent = '🎉 All Steps Completed';
                nextBtn.disabled = true;
            } else {
                nextBtn.innerHTML = 'Next Step &rarr;';
                nextBtn.disabled = false;
            }
        }
    }

    stepTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const stepNum = parseInt(tab.dataset.step, 10);
            goToStep(stepNum);
        });
    });

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) goToStep(currentStep - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentStep < totalSteps) goToStep(currentStep + 1);
        });
    }
}

/* ==========================================================================
   3. Desktop Control Panel UI Mockup Simulator
   ========================================================================== */

function initControlPanelMockup() {
    const cpTabs = document.querySelectorAll('.cp-tab-btn');
    const cpPanes = document.querySelectorAll('.cp-tab-pane');
    const themeToggle = document.getElementById('mock-theme-toggle');
    const cpWrapper = document.querySelector('.cp-mockup-wrapper');

    cpTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.cptab;

            cpTabs.forEach(t => t.classList.remove('active'));
            cpPanes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const targetPane = document.getElementById(`cp-pane-${targetTab}`);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    if (themeToggle && cpWrapper) {
        themeToggle.addEventListener('click', () => {
            const isDark = themeToggle.textContent.includes('Dark');
            if (isDark) {
                themeToggle.textContent = '☀️ Light';
                cpWrapper.style.filter = 'brightness(0.95)';
            } else {
                themeToggle.textContent = '🌙 Dark';
                cpWrapper.style.filter = 'none';
            }
        });
    }
}

/* ==========================================================================
   4. Copy-to-Clipboard URL Buttons
   ========================================================================== */

function initCopyButtons() {
    const copyBtns = document.querySelectorAll('.btn-copy-url, .btn-copy-code');

    copyBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const textToCopy = btn.dataset.copy || btn.dataset.code || '';
            if (!textToCopy) return;

            try {
                await navigator.clipboard.writeText(textToCopy);
                const originalText = btn.innerHTML;
                btn.innerHTML = '✓';
                btn.style.color = '#10b981';

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.color = '';
                }, 2000);
            } catch (err) {
                console.warn('Clipboard copy failed:', err);
            }
        });
    });
}

/* ==========================================================================
   5. Navbar Supabase Authentication State
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
