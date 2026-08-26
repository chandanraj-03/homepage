/**
 * PrivCloud Authentication Module (auth.js)
 * Supports Unified Login & Register, Email Provider Verification, and Supabase Auth.
 */

// Strict Major Email Provider Allowlist
const ALLOWED_EMAIL_DOMAINS = [
    'gmail.com', 'googlemail.com',
    'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
    'yahoo.com', 'yahoo.co.in', 'ymail.com',
    'proton.me', 'protonmail.com',
    'icloud.com', 'me.com', 'mac.com',
    'zoho.com',
    'aol.com',
    'gmx.com', 'mail.com'
];

let currentMode = 'login'; // 'login' | 'register'

// Strict Email Domain Check
function validateEmailProvider(email) {
    if (!email || !email.includes('@')) {
        return { valid: false, message: "Please enter a valid email address." };
    }
    const parts = email.toLowerCase().trim().split('@');
    if (parts.length !== 2 || !parts[1]) {
        return { valid: false, message: "Invalid email format." };
    }
    const domain = parts[1];
    if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
        return { 
            valid: false, 
            message: `Only major email providers are allowed (Gmail, Outlook, Yahoo, Proton, iCloud, Zoho).` 
        };
    }
    return { valid: true };
}

// Alert Box Helpers
function showAuthAlert(message, isSuccess = false) {
    const alertBox = document.getElementById('auth-alert');
    const alertText = document.getElementById('auth-alert-text');
    if (!alertBox || !alertText) return;

    alertText.textContent = message;
    alertBox.classList.remove('hidden', 'success');
    if (isSuccess) {
        alertBox.classList.add('success');
    }
}

function clearAuthAlert() {
    const alertBox = document.getElementById('auth-alert');
    if (alertBox) {
        alertBox.classList.add('hidden');
    }
}

// 16-Character Auth Hash Identifiers
const AUTH_HASH_MAP = {
    login: 'e9b4c0f81d3ea72a',
    register: 'f2d8a0c4e6b1973f'
};

// Switch between Sign In and Create Account
function switchAuthMode(mode, updateHistory = true) {
    currentMode = mode;
    clearAuthAlert();
    hideOtpView();

    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const pageTitle = document.getElementById('page-title');
    const subtitle = document.getElementById('auth-subtitle');
    const forgotWrapper = document.getElementById('forgot-wrapper');
    const submitBtnText = document.getElementById('submit-btn-text');
    const footerText = document.getElementById('auth-footer-text');
    const passwordInput = document.getElementById('auth-password');
    const groupUsername = document.getElementById('group-username');
    const groupConfirmPassword = document.getElementById('group-confirm-password');

    if (mode === 'register') {
        if (tabLogin) {
            tabLogin.classList.remove('active');
            tabLogin.setAttribute('aria-selected', 'false');
        }
        if (tabRegister) {
            tabRegister.classList.add('active');
            tabRegister.setAttribute('aria-selected', 'true');
        }

        if (pageTitle) pageTitle.textContent = "PrivCloud - Create Account";
        if (subtitle) subtitle.textContent = "Create your personal cloud account to get started.";
        if (groupUsername) groupUsername.classList.remove('hidden');
        if (groupConfirmPassword) groupConfirmPassword.classList.remove('hidden');
        if (forgotWrapper) forgotWrapper.style.display = 'none';
        if (submitBtnText) submitBtnText.textContent = "Create Account";
        if (passwordInput) passwordInput.placeholder = "Create password (min. 6 chars)";
        if (footerText) footerText.innerHTML = `Already have an account? <a href="#${AUTH_HASH_MAP.login}" onclick="switchAuthMode('login'); return false;">Sign in</a>`;
        
        if (updateHistory && window.location.hash !== `#${AUTH_HASH_MAP.register}`) {
            history.replaceState(null, null, `#${AUTH_HASH_MAP.register}`);
        }
    } else {
        if (tabRegister) {
            tabRegister.classList.remove('active');
            tabRegister.setAttribute('aria-selected', 'false');
        }
        if (tabLogin) {
            tabLogin.classList.add('active');
            tabLogin.setAttribute('aria-selected', 'true');
        }

        if (pageTitle) pageTitle.textContent = "PrivCloud - Sign In";
        if (subtitle) subtitle.textContent = "Welcome back! Sign in to access your cloud storage.";
        if (groupUsername) groupUsername.classList.add('hidden');
        if (groupConfirmPassword) groupConfirmPassword.classList.add('hidden');
        if (forgotWrapper) forgotWrapper.style.display = 'flex';
        if (submitBtnText) submitBtnText.textContent = "Sign In to PrivCloud";
        if (passwordInput) passwordInput.placeholder = "Enter your password";
        if (footerText) footerText.innerHTML = `Don't have an account? <a href="#${AUTH_HASH_MAP.register}" onclick="switchAuthMode('register'); return false;">Create one now</a>`;
        
        if (updateHistory && window.location.hash !== `#${AUTH_HASH_MAP.login}` && window.location.hash !== '') {
            history.replaceState(null, null, `#${AUTH_HASH_MAP.login}`);
        }
    }
}

// ---------------------------------------------------------
// 6-BOX OTP UI CONTROLS & AUTO-NAVIGATION
// ---------------------------------------------------------

let registeredEmail = '';
let resendTimerInterval = null;

function showOtpView(email) {
    registeredEmail = email;
    clearAuthAlert();

    const tabGroup = document.getElementById('auth-tab-group');
    const authForm = document.getElementById('auth-form');
    const otpView = document.getElementById('otp-view');
    const targetEmailSpan = document.getElementById('otp-target-email');
    const footerText = document.getElementById('auth-footer-text');
    const subtitle = document.getElementById('auth-subtitle');
    const pageTitle = document.getElementById('page-title');

    if (tabGroup) tabGroup.style.display = 'none';
    if (authForm) {
        authForm.classList.add('hidden');
        authForm.style.display = 'none';
    }
    if (otpView) {
        otpView.classList.remove('hidden');
        otpView.style.display = 'block';
    }
    if (footerText) footerText.style.display = 'none';

    if (pageTitle) pageTitle.textContent = "PrivCloud - Verify Code";
    if (subtitle) subtitle.textContent = "Enter your 6-digit verification code.";
    if (targetEmailSpan) targetEmailSpan.textContent = email;

    const boxes = document.querySelectorAll('.otp-digit-box');
    boxes.forEach(box => {
        box.value = '';
        box.classList.remove('filled', 'input-error');
    });
    if (boxes[0]) boxes[0].focus();

    startResendCountdown(45);
}

function hideOtpView() {
    if (resendTimerInterval) clearInterval(resendTimerInterval);

    const tabGroup = document.getElementById('auth-tab-group');
    const authForm = document.getElementById('auth-form');
    const otpView = document.getElementById('otp-view');
    const footerText = document.getElementById('auth-footer-text');

    if (tabGroup) tabGroup.style.display = 'flex';
    if (authForm) {
        authForm.classList.remove('hidden');
        authForm.style.display = 'block';
    }
    if (otpView) {
        otpView.classList.add('hidden');
        otpView.style.display = 'none';
    }
    if (footerText) footerText.style.display = 'block';
}

function backToRegisterForm() {
    hideOtpView();
    switchAuthMode('register');
}

function setupOtpBoxListeners() {
    const boxes = document.querySelectorAll('.otp-digit-box');

    boxes.forEach((box, idx) => {
        box.addEventListener('input', (e) => {
            clearAuthAlert();
            boxes.forEach(b => b.classList.remove('input-error'));
            const val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val ? val.slice(-1) : '';

            if (e.target.value) {
                e.target.classList.add('filled');
                if (idx < boxes.length - 1) {
                    boxes[idx + 1].focus();
                }
            } else {
                e.target.classList.remove('filled');
            }
        });

        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                boxes[idx - 1].focus();
                boxes[idx - 1].value = '';
                boxes[idx - 1].classList.remove('filled');
            }
        });

        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim().replace(/[^0-9]/g, '');
            if (pasteData.length > 0) {
                const digits = pasteData.slice(0, 6).split('');
                digits.forEach((digit, i) => {
                    if (boxes[i]) {
                        boxes[i].value = digit;
                        boxes[i].classList.add('filled');
                    }
                });
                const nextIndex = Math.min(digits.length, boxes.length - 1);
                if (boxes[nextIndex]) boxes[nextIndex].focus();
            }
        });
    });
}

function startResendCountdown(seconds) {
    const btnResend = document.getElementById('btn-resend-otp');
    if (!btnResend) return;

    if (resendTimerInterval) clearInterval(resendTimerInterval);

    let remaining = seconds;
    btnResend.disabled = true;
    btnResend.textContent = `Resend in ${remaining}s`;

    resendTimerInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(resendTimerInterval);
            btnResend.disabled = false;
            btnResend.textContent = "Resend Code";
        } else {
            btnResend.textContent = `Resend in ${remaining}s`;
        }
    }, 1000);
}

async function handleResendOtp() {
    if (!registeredEmail) return;
    clearAuthAlert();

    try {
        if (window.PrivCloudAuth && window.PrivCloudAuth.resendOtp) {
            const { error } = await window.PrivCloudAuth.resendOtp(registeredEmail, 'signup');
            if (error) {
                showAuthAlert(error.message);
            } else {
                showAuthAlert("A new 6-digit code has been sent!", true);
                startResendCountdown(60);
            }
        }
    } catch (err) {
        showAuthAlert(err.message || "Failed to resend code.");
    }
}

async function handleOtpVerify(e) {
    e.preventDefault();
    clearAuthAlert();

    const boxes = document.querySelectorAll('.otp-digit-box');
    let otpCode = '';
    boxes.forEach(box => otpCode += box.value.trim());

    if (otpCode.length !== 6) {
        showAuthAlert("Please enter all 6 digits of the verification code.");
        boxes.forEach(box => box.classList.add('input-error'));
        if (boxes[0]) boxes[0].focus();
        return;
    }

    const btn = document.getElementById('otp-verify-btn');
    const btnText = document.getElementById('otp-verify-text');
    const originalText = btnText ? btnText.textContent : 'Verify';

    if (btnText) btnText.textContent = "Verifying Code...";
    if (btn) btn.disabled = true;

    try {
        if (window.PrivCloudAuth && window.PrivCloudAuth.verifyOtp) {
            const { data, error } = await window.PrivCloudAuth.verifyOtp(registeredEmail, otpCode, 'signup');
            if (error) {
                showAuthAlert(error.message || "Invalid or expired verification code. Please try again.");
                boxes.forEach(box => {
                    box.classList.add('input-error');
                    box.value = '';
                    box.classList.remove('filled');
                });
                if (boxes[0]) boxes[0].focus();
                if (btn) btn.disabled = false;
                if (btnText) btnText.textContent = originalText;
            } else {
                showAuthAlert("Code verified! Redirecting...", true);
                setTimeout(() => {
                    window.location.href = getPostAuthRedirectDestination();
                }, 1000);
            }
        }
    } catch (err) {
        showAuthAlert(err.message || "Verification failed. Please try again.");
        boxes.forEach(box => {
            box.classList.add('input-error');
            box.value = '';
            box.classList.remove('filled');
        });
        if (boxes[0]) boxes[0].focus();
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = originalText;
    }
}

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

// Initialize state on page load and handle browser back/forward
async function handleHashRouting() {
    const hash = window.location.hash.toLowerCase().replace(/^#/, '');
    if (hash === AUTH_HASH_MAP.register || hash === 'register') {
        switchAuthMode('register', true);
    } else {
        switchAuthMode('login', true);
    }

    setupOtpBoxListeners();

    // Check if user is already authenticated and redirect is requested
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('redirect') === 'purchase' && window.PrivCloudAuth) {
        try {
            const session = await window.PrivCloudAuth.getSession();
            if (session && session.user) {
                const rawPlan = urlParams.get('plan') || '9a8f10e7b9c2d4a6';
                const planToken = PLAN_TOKEN_MAP[rawPlan] || '9a8f10e7b9c2d4a6';
                window.location.href = `../purchase_page/purchase.html?plan=${encodeURIComponent(planToken)}`;
            }
        } catch (e) {
            console.warn('Session check warning:', e);
        }
    }
}

function getPostAuthRedirectDestination() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTarget = urlParams.get('redirect');
    const rawPlan = urlParams.get('plan') || '9a8f10e7b9c2d4a6';
    const planToken = PLAN_TOKEN_MAP[rawPlan] || '9a8f10e7b9c2d4a6';

    if (redirectTarget === 'purchase') {
        return `../purchase_page/purchase.html?plan=${encodeURIComponent(planToken)}`;
    }
    return '../index.html';
}

window.addEventListener('DOMContentLoaded', handleHashRouting);
window.addEventListener('hashchange', handleHashRouting);
window.addEventListener('popstate', handleHashRouting);

// Password Show/Hide Toggle
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input || !btn) return;
    const eyeOpen = btn.querySelector('.eye-open');
    const eyeClosed = btn.querySelector('.eye-closed');

    if (input.type === 'password') {
        input.type = 'text';
        if (eyeOpen) eyeOpen.classList.add('hidden');
        if (eyeClosed) eyeClosed.classList.remove('hidden');
        btn.setAttribute('title', 'Hide password');
    } else {
        input.type = 'password';
        if (eyeClosed) eyeClosed.classList.add('hidden');
        if (eyeOpen) eyeOpen.classList.remove('hidden');
        btn.setAttribute('title', 'Show password');
    }
}

// Handle Forgot Password
async function handleForgotPassword() {
    clearAuthAlert();
    const emailInput = document.getElementById('auth-email');
    if (!emailInput) return;
    const email = emailInput.value.trim();

    if (!email) {
        showAuthAlert("Please enter your email above to receive password reset instructions.");
        emailInput.focus();
        return;
    }

    const validation = validateEmailProvider(email);
    if (!validation.valid) {
        showAuthAlert(validation.message);
        return;
    }

    try {
        if (!window.PrivCloudAuth) {
            showAuthAlert("Supabase Auth client not initialized.");
            return;
        }
        const { error } = await window.PrivCloudAuth.resetPassword(email);
        if (error) {
            showAuthAlert(error.message);
        } else {
            showAuthAlert(`Password reset instructions sent to ${email}`, true);
        }
    } catch (err) {
        showAuthAlert(err.message || "Failed to send reset link.");
    }
}

// Form Submit with Supabase Auth
async function handleAuthSubmit(e) {
    e.preventDefault();
    clearAuthAlert();

    const emailInput = document.getElementById('auth-email');
    const email = (emailInput ? emailInput.value : '').trim();
    const passwordInput = document.getElementById('auth-password');
    const password = passwordInput ? passwordInput.value : '';

    const validation = validateEmailProvider(email);
    if (!validation.valid) {
        showAuthAlert(validation.message);
        if (emailInput) emailInput.focus();
        return;
    }

    if (currentMode === 'register') {
        const usernameInput = document.getElementById('auth-username');
        const username = usernameInput ? usernameInput.value.trim() : '';
        const confirmPasswordInput = document.getElementById('auth-confirm-password');
        const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

        if (!username || username.length < 3) {
            showAuthAlert("Please enter a valid username (at least 3 characters).");
            if (usernameInput) usernameInput.focus();
            return;
        }

        if (!password || password.length < 6) {
            showAuthAlert("Password must be at least 6 characters.");
            if (passwordInput) passwordInput.focus();
            return;
        }

        if (password !== confirmPassword) {
            showAuthAlert("Passwords do not match. Please re-enter.");
            if (confirmPasswordInput) confirmPasswordInput.focus();
            return;
        }

        const btn = document.getElementById('auth-submit-btn');
        const submitText = document.getElementById('submit-btn-text');
        const originalText = submitText ? submitText.textContent : 'Create Account';

        if (submitText) submitText.textContent = "Creating Account...";
        if (btn) btn.disabled = true;

        try {
            if (window.PrivCloudAuth && window.PrivCloudAuth.signUp) {
                const res = await window.PrivCloudAuth.signUp(email, password, {
                    username: username,
                    email: email
                });
                if (res && res.error) {
                    showAuthAlert(res.error.message);
                    if (btn) btn.disabled = false;
                    if (submitText) submitText.textContent = originalText;
                    return;
                }
            }
        } catch (err) {
            if (err && err.message) {
                showAuthAlert(err.message);
                if (btn) btn.disabled = false;
                if (submitText) submitText.textContent = originalText;
                return;
            }
        }

        if (btn) btn.disabled = false;
        if (submitText) submitText.textContent = originalText;
        showOtpView(email);
        return;
    }

    // Sign In Mode
    if (!password || password.length < 6) {
        showAuthAlert("Password must be at least 6 characters.");
        return;
    }

    const btn = document.getElementById('auth-submit-btn');
    const submitText = document.getElementById('submit-btn-text');
    const originalText = submitText ? submitText.textContent : 'Sign In';

    if (submitText) submitText.textContent = 'Signing In...';
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.8';
    }

    try {
        if (!window.PrivCloudAuth) {
            showAuthAlert("Supabase Auth client is not ready. Please try again.");
            return;
        }

        const { data, error } = await window.PrivCloudAuth.signIn(email, password);

        if (error) {
            showAuthAlert(error.message);
        } else {
            showAuthAlert("Signed in successfully! Redirecting...", true);
            setTimeout(() => {
                window.location.href = getPostAuthRedirectDestination();
            }, 1000);
        }
    } catch (err) {
        showAuthAlert(err.message || "An unexpected error occurred.");
    } finally {
        if (submitText) submitText.textContent = originalText;
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }
}
