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

// Switch between Sign In and Create Account
function switchAuthMode(mode, updateHistory = true) {
    currentMode = mode;
    clearAuthAlert();

    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const pageTitle = document.getElementById('page-title');
    const subtitle = document.getElementById('auth-subtitle');
    const forgotWrapper = document.getElementById('forgot-wrapper');
    const submitBtnText = document.getElementById('submit-btn-text');
    const footerText = document.getElementById('auth-footer-text');
    const passwordInput = document.getElementById('auth-password');
    const labelUsername = document.getElementById('label-username');
    const usernameInput = document.getElementById('auth-username');

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
        if (forgotWrapper) forgotWrapper.style.display = 'none';
        if (submitBtnText) submitBtnText.textContent = "Create Account";
        if (labelUsername) labelUsername.textContent = "Email Address";
        if (usernameInput) usernameInput.placeholder = "e.g. alex@gmail.com";
        if (passwordInput) passwordInput.placeholder = "Create a password (min 6 characters)";
        if (footerText) footerText.innerHTML = 'Already have an account? <a href="#login" onclick="switchAuthMode(\'login\'); return false;">Sign in</a>';
        
        if (updateHistory && window.location.hash !== '#register') {
            history.replaceState(null, null, '#register');
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
        if (forgotWrapper) forgotWrapper.style.display = 'flex';
        if (submitBtnText) submitBtnText.textContent = "Sign In to PrivCloud";
        if (labelUsername) labelUsername.textContent = "Email Address";
        if (usernameInput) usernameInput.placeholder = "e.g. alex@gmail.com";
        if (passwordInput) passwordInput.placeholder = "Enter your password";
        if (footerText) footerText.innerHTML = 'Don\'t have an account? <a href="#register" onclick="switchAuthMode(\'register\'); return false;">Create one now</a>';
        
        if (updateHistory && window.location.hash !== '#login' && window.location.hash !== '') {
            history.replaceState(null, null, '#login');
        }
    }
}

// Initialize state on page load and handle browser back/forward
async function handleHashRouting() {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#register') {
        switchAuthMode('register', false);
    } else {
        switchAuthMode('login', false);
    }

    // Check if user is already authenticated and redirect is requested
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('redirect') === 'purchase' && window.PrivCloudAuth) {
        try {
            const session = await window.PrivCloudAuth.getSession();
            if (session && session.user) {
                const plan = urlParams.get('plan') || 'trial';
                window.location.href = `../purchase_page/purchase.html?plan=${encodeURIComponent(plan)}`;
            }
        } catch (e) {
            console.warn('Session check warning:', e);
        }
    }
}

function getPostAuthRedirectDestination() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTarget = urlParams.get('redirect');
    const planParam = urlParams.get('plan') || 'trial';

    if (redirectTarget === 'purchase') {
        return `../purchase_page/purchase.html?plan=${encodeURIComponent(planParam)}`;
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
    const emailInput = document.getElementById('auth-username');
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

    const email = (document.getElementById('auth-username')?.value || '').trim();
    const password = document.getElementById('auth-password')?.value || '';
    const validation = validateEmailProvider(email);

    if (!validation.valid) {
        showAuthAlert(validation.message);
        return;
    }

    if (!password || password.length < 6) {
        showAuthAlert("Password must be at least 6 characters.");
        return;
    }

    const btn = document.getElementById('auth-submit-btn');
    const submitText = document.getElementById('submit-btn-text');
    const originalText = submitText ? submitText.textContent : 'Submit';
    
    if (submitText) submitText.textContent = currentMode === 'login' ? 'Signing In...' : 'Creating Account...';
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.8';
    }

    try {
        if (!window.PrivCloudAuth) {
            showAuthAlert("Supabase Auth client is not ready. Please try again.");
            return;
        }

        if (currentMode === 'register') {
            const { data, error } = await window.PrivCloudAuth.signUp(email, password, {
                email: email
            });

            if (error) {
                showAuthAlert(error.message);
            } else {
                if (data && data.session) {
                    showAuthAlert("Account created and signed in successfully!", true);
                    setTimeout(() => {
                        window.location.href = getPostAuthRedirectDestination();
                    }, 1200);
                } else {
                    showAuthAlert("Account registered! Please check your email for the confirmation link.", true);
                }
            }
        } else {
            const { data, error } = await window.PrivCloudAuth.signIn(email, password);

            if (error) {
                showAuthAlert(error.message);
            } else {
                showAuthAlert("Signed in successfully! Redirecting...", true);
                setTimeout(() => {
                    window.location.href = getPostAuthRedirectDestination();
                }, 1000);
            }
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
