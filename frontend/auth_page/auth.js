/**
 * PrivCloud Instagram-Style Authentication Controller (auth.js)
 * Supports Email/Username dual login, live validation, unique username checking,
 * 6-box OTP verification, and Dashboard redirection.
 */

// 16-Character Auth Hash Identifiers
const AUTH_HASH_MAP = {
    login: 'e9b4c0f81d3ea72a',
    register: 'f2d8a0c4e6b1973f',
    forgot: 'forgot'
};

// Allowed email provider domains (synced dynamically from backend /api/config)
let ALLOWED_EMAIL_DOMAINS = [
    'gmail.com', 'googlemail.com',
    'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
    'yahoo.com', 'yahoo.co.in', 'ymail.com',
    'proton.me', 'protonmail.com',
    'icloud.com', 'me.com', 'mac.com',
    'zoho.com',
    'aol.com',
    'gmx.com', 'mail.com'
];

try {
    const configUrl = (typeof window !== 'undefined' && window.getPrivCloudApiUrl) 
        ? window.getPrivCloudApiUrl('/api/config') 
        : (window.location.protocol === 'file:' ? 'http://localhost:5001/api/config' : '/api/config');
    fetch(configUrl).then(r => r.json()).then(cfg => {
        if (cfg && Array.isArray(cfg.allowedEmailDomains) && cfg.allowedEmailDomains.length > 0) {
            ALLOWED_EMAIL_DOMAINS = cfg.allowedEmailDomains;
        }
    }).catch(() => {});
} catch (e) {}

let currentAuthMode = 'login'; // 'login' | 'register' | 'forgot' | 'otp' | 'reset-password'
let registeredEmail = '';
let registeredUsername = '';
let resendTimerInterval = null;
let usernameDebounceTimer = null;
let otpPurpose = 'signup'; // 'signup' | 'reset'
let isUsernameAvailable = false;

// ----------------------------------------------------
// UI Alert Helpers
// ----------------------------------------------------
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

// ----------------------------------------------------
// Mode Switcher (Instagram-Style Flow)
// ----------------------------------------------------
function switchAuthMode(mode, updateHistory = true) {
    currentAuthMode = mode;
    clearAuthAlert();

    const viewLogin = document.getElementById('view-login');
    const viewRegister = document.getElementById('view-register');
    const viewForgot = document.getElementById('view-forgot');
    const viewOtp = document.getElementById('view-otp');
    const viewResetPassword = document.getElementById('view-reset-password');

    const pageTitle = document.getElementById('page-title');
    const subtitle = document.getElementById('auth-subtitle');
    const secondaryCard = document.getElementById('auth-secondary-card');
    const secondaryText = document.getElementById('secondary-card-text');
    const secondaryLink = document.getElementById('secondary-card-link');

    // Hide all views first
    [viewLogin, viewRegister, viewForgot, viewOtp, viewResetPassword].forEach(view => {
        if (view) view.classList.add('hidden');
    });

    if (mode === 'register') {
        if (viewRegister) viewRegister.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = "PrivCloud - Create Account";
        if (subtitle) {
            subtitle.style.display = 'block';
            subtitle.textContent = "Sign up to securely store and share your personal files.";
        }
        if (secondaryCard) {
            secondaryCard.style.display = 'flex';
            if (secondaryText) secondaryText.textContent = "Have an account?";
            if (secondaryLink) {
                secondaryLink.textContent = "Log in";
                secondaryLink.href = `#${AUTH_HASH_MAP.login}`;
            }
        }
        if (updateHistory && window.location.hash !== `#${AUTH_HASH_MAP.register}`) {
            history.replaceState(null, null, `#${AUTH_HASH_MAP.register}`);
        }
    } else if (mode === 'forgot') {
        if (viewForgot) viewForgot.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = "PrivCloud - Reset Password";
        if (subtitle) {
            subtitle.style.display = 'block';
            subtitle.textContent = "Recover access to your private vault.";
        }
        if (secondaryCard) {
            secondaryCard.style.display = 'flex';
            if (secondaryText) secondaryText.textContent = "Remember your password?";
            if (secondaryLink) {
                secondaryLink.textContent = "Back to Log In";
                secondaryLink.href = `#${AUTH_HASH_MAP.login}`;
            }
        }
        if (updateHistory) {
            history.replaceState(null, null, '#forgot');
        }
    } else if (mode === 'otp') {
        if (viewOtp) viewOtp.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = "PrivCloud - Verify Code";
        if (subtitle) {
            subtitle.style.display = 'block';
            subtitle.textContent = "Confirm your identity with 6-digit code.";
        }
        if (secondaryCard) secondaryCard.style.display = 'none';
    } else if (mode === 'reset-password') {
        if (viewResetPassword) viewResetPassword.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = "PrivCloud - Set New Password";
        if (subtitle) {
            subtitle.style.display = 'block';
            subtitle.textContent = "Create a new strong password for your vault.";
        }
        if (secondaryCard) secondaryCard.style.display = 'none';
    } else {
        // Default: login
        currentAuthMode = 'login';
        if (viewLogin) viewLogin.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = "PrivCloud - Log In";
        if (subtitle) {
            subtitle.style.display = 'block';
            subtitle.textContent = "Log in to your private cloud storage.";
        }
        if (secondaryCard) {
            secondaryCard.style.display = 'flex';
            if (secondaryText) secondaryText.textContent = "Don't have an account?";
            if (secondaryLink) {
                secondaryLink.textContent = "Create New Account";
                secondaryLink.href = `#${AUTH_HASH_MAP.register}`;
            }
        }
        if (updateHistory && window.location.hash !== `#${AUTH_HASH_MAP.login}` && window.location.hash !== '') {
            history.replaceState(null, null, `#${AUTH_HASH_MAP.login}`);
        }
    }
}

function handleSecondaryCardClick() {
    if (currentAuthMode === 'login' || currentAuthMode === 'forgot') {
        switchAuthMode('register');
    } else {
        switchAuthMode('login');
    }
}

// ----------------------------------------------------
// Validation Logic
// ----------------------------------------------------
function validateEmailProvider(email) {
    if (!email || !email.includes('@')) {
        return { valid: false, message: "Please enter a valid email address." };
    }
    const parts = email.toLowerCase().trim().split('@');
    if (parts.length !== 2 || !parts[1]) {
        return { valid: false, message: "Invalid email address format." };
    }
    const domain = parts[1];
    if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
        return {
            valid: false,
            message: "Only major email providers are allowed (Gmail, Outlook, Yahoo, Proton, iCloud, Zoho, AOL, GMX)."
        };
    }
    return { valid: true };
}

function renderUsernameSuggestions(suggestions) {
    const wrap = document.getElementById('username-suggestions-wrap');
    const list = document.getElementById('username-suggestions-list');
    if (!wrap || !list) return;

    if (!suggestions || suggestions.length === 0) {
        wrap.classList.add('hidden');
        list.innerHTML = '';
        return;
    }

    list.innerHTML = '';
    suggestions.forEach(sugg => {
        const pill = document.createElement('span');
        pill.className = 'suggestion-pill';
        pill.textContent = `@${sugg}`;
        pill.title = `Click to choose @${sugg}`;
        pill.onclick = () => applyUsernameSuggestion(sugg);
        list.appendChild(pill);
    });

    wrap.classList.remove('hidden');
}

function applyUsernameSuggestion(username) {
    const input = document.getElementById('reg-username');
    const feedbackSpan = document.getElementById('username-feedback');
    const wrap = document.getElementById('username-suggestions-wrap');

    if (input) {
        input.value = username;
        input.classList.remove('input-invalid');
        input.classList.add('input-valid');
    }

    if (feedbackSpan) {
        feedbackSpan.className = 'status-feedback available';
        feedbackSpan.textContent = '✓ Available';
    }

    if (wrap) {
        wrap.classList.add('hidden');
    }

    isUsernameAvailable = true;
    clearAuthAlert();
}

let currentUsernameCheckQuery = "";

function handleUsernameInput(input) {
    clearAuthAlert();
    const rawVal = input.value.trim().toLowerCase();
    const feedbackSpan = document.getElementById('username-feedback');
    const statusIcon = document.getElementById('username-status-icon');
    const fullNameInput = document.getElementById('reg-fullname');
    const fullName = fullNameInput ? fullNameInput.value.trim() : '';

    if (usernameDebounceTimer) clearTimeout(usernameDebounceTimer);

    if (!rawVal) {
        if (feedbackSpan) feedbackSpan.textContent = '';
        if (statusIcon) statusIcon.innerHTML = '';
        input.classList.remove('input-valid', 'input-invalid');
        isUsernameAvailable = false;
        renderUsernameSuggestions([]);
        return;
    }

    if (rawVal.length < 3) {
        if (feedbackSpan) {
            feedbackSpan.className = 'status-feedback taken';
            feedbackSpan.textContent = 'Min. 3 characters';
        }
        input.classList.remove('input-valid');
        input.classList.add('input-invalid');
        isUsernameAvailable = false;
        renderUsernameSuggestions([]);
        return;
    }

    // Format validation
    const validCharsRegex = /^[a-zA-Z0-9._]+$/;
    if (!validCharsRegex.test(rawVal) || rawVal.startsWith('.') || rawVal.startsWith('_') || rawVal.endsWith('.') || rawVal.endsWith('_')) {
        if (feedbackSpan) {
            feedbackSpan.className = 'status-feedback taken';
            feedbackSpan.textContent = 'Invalid format';
        }
        input.classList.remove('input-valid');
        input.classList.add('input-invalid');
        isUsernameAvailable = false;
        renderUsernameSuggestions([]);
        return;
    }

    if (feedbackSpan) {
        feedbackSpan.className = 'status-feedback checking';
        feedbackSpan.textContent = 'Checking...';
    }

    currentUsernameCheckQuery = rawVal;

    usernameDebounceTimer = setTimeout(async () => {
        try {
            if (window.PrivCloudAuth && window.PrivCloudAuth.checkUsernameAvailability) {
                const res = await window.PrivCloudAuth.checkUsernameAvailability(rawVal, fullName);
                
                // Discard stale responses if user continued typing
                const activeVal = input.value.trim().toLowerCase();
                if (activeVal !== rawVal) {
                    return;
                }

                if (res.available) {
                    if (feedbackSpan) {
                        feedbackSpan.className = 'status-feedback available';
                        feedbackSpan.textContent = '✓ Available';
                    }
                    input.classList.remove('input-invalid');
                    input.classList.add('input-valid');
                    isUsernameAvailable = true;
                    renderUsernameSuggestions([]);
                } else {
                    if (feedbackSpan) {
                        feedbackSpan.className = 'status-feedback taken';
                        feedbackSpan.textContent = res.message || 'Username taken';
                    }
                    input.classList.remove('input-valid');
                    input.classList.add('input-invalid');
                    isUsernameAvailable = false;
                    renderUsernameSuggestions(res.suggestions || []);
                }
            }
        } catch (e) {
            console.warn("Username availability check error:", e);
        }
    }, 300);
}

function handlePasswordStrength(input) {
    const val = input.value;
    const bar = document.getElementById('reg-strength-bar');
    if (!bar) return;

    if (!val) {
        bar.className = 'strength-bar';
        return;
    }

    if (val.length < 6) {
        bar.className = 'strength-bar strength-weak';
    } else if (val.length < 10 || !/[0-9]/.test(val) || !/[A-Z]/.test(val)) {
        bar.className = 'strength-bar strength-medium';
    } else {
        bar.className = 'strength-bar strength-strong';
    }
}

// ----------------------------------------------------
// Password Visibility Toggle
// ----------------------------------------------------
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

// ----------------------------------------------------
// Form Handlers: LOGIN (Dual Identifier: Username or Email)
// ----------------------------------------------------
async function handleLoginSubmit(e) {
    e.preventDefault();
    clearAuthAlert();

    const identInput = document.getElementById('login-identifier');
    const passInput = document.getElementById('login-password');
    const identifier = identInput ? identInput.value.trim() : '';
    const password = passInput ? passInput.value : '';

    if (!identifier) {
        showAuthAlert("Please enter your email or username.");
        if (identInput) identInput.focus();
        return;
    }

    if (!password || password.length < 6) {
        showAuthAlert("Password must be at least 6 characters long.");
        if (passInput) passInput.focus();
        return;
    }

    const btn = document.getElementById('btn-login-submit');
    const btnText = btn ? btn.querySelector('.btn-text') : null;
    const spinner = btn ? btn.querySelector('.btn-spinner') : null;
    const arrow = btn ? btn.querySelector('.btn-arrow') : null;

    if (btnText) btnText.textContent = "Logging In...";
    if (spinner) spinner.classList.remove('hidden');
    if (arrow) arrow.classList.add('hidden');
    if (btn) btn.disabled = true;

    try {
        if (!window.PrivCloudAuth) {
            showAuthAlert("Authentication client not ready. Please refresh the page.");
            return;
        }

        const res = await window.PrivCloudAuth.signInWithIdentifier(identifier, password);

        if (res.error) {
            showAuthAlert(res.error.message || "Invalid login credentials. Please verify your email/username and password.");
            if (btn) btn.disabled = false;
            if (btnText) btnText.textContent = "Log In";
            if (spinner) spinner.classList.add('hidden');
            if (arrow) arrow.classList.remove('hidden');
            return;
        }

        const displayName = (res && res.user) ? window.PrivCloudAuth.getUserDisplayName(res.user) : identifier;
        showAuthAlert("Login successful! Entering PrivCloud...", true);
        setTimeout(() => {
            playAuthTransitionVideo(getPostAuthRedirectDestination(), displayName);
        }, 300);

    } catch (err) {
        showAuthAlert(err.message || "An unexpected error occurred during login.");
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = "Log In";
        if (spinner) spinner.classList.add('hidden');
        if (arrow) arrow.classList.remove('hidden');
    }
}

// ----------------------------------------------------
// Form Handlers: SIGNUP / CREATE ACCOUNT
// ----------------------------------------------------
async function handleRegisterSubmit(e) {
    e.preventDefault();
    clearAuthAlert();

    const fullNameInput = document.getElementById('reg-fullname');
    const usernameInput = document.getElementById('reg-username');
    const emailInput = document.getElementById('reg-email');
    const passwordInput = document.getElementById('reg-password');
    const confirmPasswordInput = document.getElementById('reg-confirm-password');

    const fullName = fullNameInput ? fullNameInput.value.trim() : '';
    const username = usernameInput ? usernameInput.value.trim().toLowerCase() : '';
    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    const password = passwordInput ? passwordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

    if (!fullName || fullName.length < 2) {
        showAuthAlert("Please enter your full name.");
        if (fullNameInput) fullNameInput.focus();
        return;
    }

    if (!username || username.length < 3) {
        showAuthAlert("Please enter a username with at least 3 characters.");
        if (usernameInput) usernameInput.focus();
        return;
    }

    const emailCheck = validateEmailProvider(email);
    if (!emailCheck.valid) {
        showAuthAlert(emailCheck.message);
        if (emailInput) emailInput.focus();
        return;
    }

    if (!password || password.length < 6) {
        showAuthAlert("Password must be at least 6 characters long.");
        if (passwordInput) passwordInput.focus();
        return;
    }

    if (password !== confirmPassword) {
        showAuthAlert("Passwords do not match. Please re-enter your confirm password.");
        if (confirmPasswordInput) confirmPasswordInput.focus();
        return;
    }

    if (isUsernameAvailable === false) {
        showAuthAlert("This username is already taken. Please choose another username from the suggestions below.");
        if (usernameInput) {
            usernameInput.classList.remove('input-valid');
            usernameInput.classList.add('input-invalid');
            usernameInput.focus();
        }
        return;
    }

    const btn = document.getElementById('btn-register-submit');
    const btnText = btn ? btn.querySelector('.btn-text') : null;
    const spinner = btn ? btn.querySelector('.btn-spinner') : null;
    const arrow = btn ? btn.querySelector('.btn-arrow') : null;

    if (btnText) btnText.textContent = "Creating Account...";
    if (spinner) spinner.classList.remove('hidden');
    if (arrow) arrow.classList.add('hidden');
    if (btn) btn.disabled = true;

    try {
        if (!window.PrivCloudAuth) {
            showAuthAlert("Authentication client not ready. Please try again.");
            return;
        }

        const res = await window.PrivCloudAuth.signUpWithProfile({
            fullName,
            username,
            email,
            password
        });

        if (res.error) {
            const errMsg = res.error.message || "Failed to create account.";
            showAuthAlert(errMsg);

            // If error indicates username is taken, immediately synchronize username UI feedback & suggestions
            if (errMsg.toLowerCase().includes("username is already taken") || errMsg.toLowerCase().includes("choose another")) {
                isUsernameAvailable = false;
                const feedbackSpan = document.getElementById('username-feedback');
                if (feedbackSpan) {
                    feedbackSpan.className = 'status-feedback taken';
                    feedbackSpan.textContent = errMsg;
                }
                if (usernameInput) {
                    usernameInput.classList.remove('input-valid');
                    usernameInput.classList.add('input-invalid');
                    usernameInput.focus();
                }
                // Fetch and render smart username suggestions
                try {
                    if (window.PrivCloudAuth && window.PrivCloudAuth.checkUsernameAvailability) {
                        window.PrivCloudAuth.checkUsernameAvailability(username, fullName).then(availRes => {
                            if (availRes && availRes.suggestions && availRes.suggestions.length > 0) {
                                renderUsernameSuggestions(availRes.suggestions);
                            }
                        });
                    }
                } catch (_) {}
            }
            return;
        }

        // Show 6-digit OTP verification screen
        showOtpView(email, username);

    } catch (err) {
        const errMsg = err.message || "An unexpected error occurred during signup.";
        showAuthAlert(errMsg);
        if (errMsg.toLowerCase().includes("username is already taken") || errMsg.toLowerCase().includes("choose another")) {
            isUsernameAvailable = false;
            const feedbackSpan = document.getElementById('username-feedback');
            if (feedbackSpan) {
                feedbackSpan.className = 'status-feedback taken';
                feedbackSpan.textContent = errMsg;
            }
            if (usernameInput) {
                usernameInput.classList.remove('input-valid');
                usernameInput.classList.add('input-invalid');
                usernameInput.focus();
            }
        }
    } finally {
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = "Create Account";
        if (spinner) spinner.classList.add('hidden');
        if (arrow) arrow.classList.remove('hidden');
    }
}

// ----------------------------------------------------
// Form Handlers: FORGOT PASSWORD
// ----------------------------------------------------
function openDirectOtpEntry() {
    const identInput = document.getElementById('forgot-identifier');
    const email = (identInput && identInput.value.trim()) ? identInput.value.trim() : (registeredEmail || '');
    showOtpView(email, '', 'reset');
}

async function handleForgotSubmit(e) {
    e.preventDefault();
    clearAuthAlert();

    const identInput = document.getElementById('forgot-identifier');
    const identifier = identInput ? identInput.value.trim() : '';

    if (!identifier) {
        showAuthAlert("Please enter your email address or username.");
        if (identInput) identInput.focus();
        return;
    }

    const btn = document.getElementById('btn-forgot-submit');
    const btnText = btn ? btn.querySelector('.btn-text') : null;
    const spinner = btn ? btn.querySelector('.btn-spinner') : null;

    if (btnText) btnText.textContent = "Sending Code...";
    if (spinner) spinner.classList.remove('hidden');
    if (btn) btn.disabled = true;

    try {
        if (!window.PrivCloudAuth) {
            showAuthAlert("Authentication client not ready.");
            return;
        }

        const res = await window.PrivCloudAuth.resetPassword(identifier);
        if (res && res.error) {
            showAuthAlert(res.error.message || "Could not send reset instructions.");
        } else {
            const targetEmail = res.email || identifier;
            showOtpView(targetEmail, '', 'reset');
        }
    } catch (err) {
        showAuthAlert(err.message || "Failed to process forgot password request.");
    } finally {
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = "Send Reset Code";
        if (spinner) spinner.classList.add('hidden');
    }
}

// ----------------------------------------------------
// 6-BOX OTP VERIFICATION ENGINE
// ----------------------------------------------------
function showOtpView(email, username = '', purpose = 'signup') {
    registeredEmail = email || registeredEmail || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('privcloud_auth_email') : '') || '';
    registeredUsername = username || registeredUsername || '';
    otpPurpose = purpose;
    if (typeof sessionStorage !== 'undefined' && email) {
        sessionStorage.setItem('privcloud_auth_email', email);
    }
    switchAuthMode('otp', false);

    const titleEl = document.getElementById('otp-view-title');
    const descEl = document.getElementById('otp-view-desc');
    const submitBtnText = document.getElementById('otp-submit-text');

    if (purpose === 'reset') {
        if (titleEl) titleEl.textContent = "Reset Password Code";
        if (descEl) descEl.innerHTML = `Enter the 6-digit confirmation code sent to<br><span class="otp-email-highlight" id="otp-target-email">${email || 'your email'}</span><br>to reset your password.`;
        if (submitBtnText) submitBtnText.textContent = "Verify & Reset Password";
    } else {
        if (titleEl) titleEl.textContent = "Enter Confirmation Code";
        if (descEl) descEl.innerHTML = `Enter the 6-digit confirmation code sent to<br><span class="otp-email-highlight" id="otp-target-email">${email || 'your email'}</span>`;
        if (submitBtnText) submitBtnText.textContent = "Verify & Go to Product Page";
    }

    const boxes = document.querySelectorAll('.otp-digit-box');
    boxes.forEach(box => {
        box.value = '';
        box.classList.remove('filled', 'input-error');
    });

    if (boxes[0]) boxes[0].focus();
    startResendCountdown(45);
}

function backToOriginForm() {
    if (resendTimerInterval) clearInterval(resendTimerInterval);
    if (otpPurpose === 'reset') {
        switchAuthMode('forgot');
    } else {
        switchAuthMode('register');
    }
}

function backToRegisterForm() {
    backToOriginForm();
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
            const { error } = await window.PrivCloudAuth.resendOtp(registeredEmail, otpPurpose);
            if (error) {
                showAuthAlert(error.message);
            } else {
                showAuthAlert("A new 6-digit confirmation code has been sent!", true);
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
        showAuthAlert("Please enter all 6 digits of the confirmation code.");
        boxes.forEach(box => box.classList.add('input-error'));
        if (boxes[0]) boxes[0].focus();
        return;
    }

    const btn = document.getElementById('btn-otp-submit');
    const btnText = document.getElementById('otp-submit-text');
    const spinner = btn ? btn.querySelector('.btn-spinner') : null;
    const arrow = btn ? btn.querySelector('.btn-arrow') : null;

    if (btnText) btnText.textContent = "Verifying Code...";
    if (spinner) spinner.classList.remove('hidden');
    if (arrow) arrow.classList.add('hidden');
    if (btn) btn.disabled = true;

    try {
        if (!window.PrivCloudAuth) {
            showAuthAlert("Authentication client not ready.");
            return;
        }

        const { data, error } = await window.PrivCloudAuth.verifyOtp(registeredEmail, otpCode, otpPurpose, registeredUsername);

        if (error) {
            showAuthAlert(error.message || "Invalid or expired confirmation code. Please try again.");
            boxes.forEach(box => {
                box.classList.add('input-error');
                box.value = '';
                box.classList.remove('filled');
            });
            if (boxes[0]) boxes[0].focus();
            if (btn) btn.disabled = false;
            if (btnText) btnText.textContent = otpPurpose === 'reset' ? "Verify & Reset Password" : "Verify & Continue";
            if (spinner) spinner.classList.add('hidden');
            if (arrow) arrow.classList.remove('hidden');
            return;
        }

        if (otpPurpose === 'reset') {
            if (btn) btn.disabled = false;
            if (btnText) btnText.textContent = "Verify & Reset Password";
            if (spinner) spinner.classList.add('hidden');
            if (arrow) arrow.classList.remove('hidden');

            switchAuthMode('reset-password');
            const newPassInput = document.getElementById('reset-new-password');
            if (newPassInput) newPassInput.focus();
            showAuthAlert("Code verified! Please set your new password.", true);
            return;
        }

        showAuthAlert("Account verified! Welcome to PrivCloud...", true);
        setTimeout(() => {
            playAuthTransitionVideo(getPostAuthRedirectDestination(), registeredUsername || registeredEmail);
        }, 300);

    } catch (err) {
        showAuthAlert(err.message || "Verification failed. Please try again.");
        boxes.forEach(box => {
            box.classList.add('input-error');
            box.value = '';
            box.classList.remove('filled');
        });
        if (boxes[0]) boxes[0].focus();
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = otpPurpose === 'reset' ? "Verify & Reset Password" : "Verify & Continue";
        if (spinner) spinner.classList.add('hidden');
        if (arrow) arrow.classList.remove('hidden');
    }
}

// ----------------------------------------------------
// Form Handlers: NEW PASSWORD SETUP
// ----------------------------------------------------
function handleResetPasswordStrength(input) {
    clearAuthAlert();
    const val = input.value;
    const strengthBar = document.getElementById('reset-strength-bar');
    if (!strengthBar) return;

    if (!val) {
        strengthBar.style.width = '0%';
        strengthBar.className = 'strength-bar';
        return;
    }

    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    if (score <= 2) {
        strengthBar.style.width = '33%';
        strengthBar.className = 'strength-bar strength-weak';
    } else if (score <= 4) {
        strengthBar.style.width = '66%';
        strengthBar.className = 'strength-bar strength-medium';
    } else {
        strengthBar.style.width = '100%';
        strengthBar.className = 'strength-bar strength-strong';
    }
}

async function handleNewPasswordSubmit(e) {
    e.preventDefault();
    clearAuthAlert();

    const newPassInput = document.getElementById('reset-new-password');
    const confirmPassInput = document.getElementById('reset-confirm-password');

    const newPass = newPassInput ? newPassInput.value : '';
    const confirmPass = confirmPassInput ? confirmPassInput.value : '';

    if (!newPass || newPass.length < 6) {
        showAuthAlert("Password must be at least 6 characters long.");
        if (newPassInput) newPassInput.focus();
        return;
    }

    if (newPass !== confirmPass) {
        showAuthAlert("Passwords do not match. Please retype carefully.");
        if (confirmPassInput) confirmPassInput.focus();
        return;
    }

    const btn = document.getElementById('btn-reset-password-submit');
    const btnText = btn ? btn.querySelector('.btn-text') : null;
    const spinner = btn ? btn.querySelector('.btn-spinner') : null;
    const arrow = btn ? btn.querySelector('.btn-arrow') : null;

    if (btnText) btnText.textContent = "Updating Password...";
    if (spinner) spinner.classList.remove('hidden');
    if (arrow) arrow.classList.add('hidden');
    if (btn) btn.disabled = true;

    try {
        if (!window.PrivCloudAuth || !window.PrivCloudAuth.updatePassword) {
            showAuthAlert("Authentication client not ready.");
            return;
        }

        const targetEmail = (registeredEmail || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('privcloud_auth_email') : '') || (document.getElementById('forgot-identifier')?.value || '')).trim();

        if (!targetEmail) {
            showAuthAlert("Session expired or email missing. Please restart the password reset process.");
            switchAuthMode('forgot');
            return;
        }

        const res = await window.PrivCloudAuth.updatePassword(targetEmail, newPass);
        if (res && res.error) {
            showAuthAlert(res.error.message || "Failed to update password.");
        } else {
            showAuthAlert("Password updated successfully! Please log in with your new password.", true);
            switchAuthMode('login');
            const loginIdent = document.getElementById('login-identifier');
            if (loginIdent) {
                loginIdent.value = targetEmail;
            }
            const loginPass = document.getElementById('login-password');
            if (loginPass) {
                loginPass.value = '';
                loginPass.focus();
            }
        }
    } catch (err) {
        showAuthAlert(err.message || "Failed to update password.");
    } finally {
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = "Update Password";
        if (spinner) spinner.classList.add('hidden');
        if (arrow) arrow.classList.remove('hidden');
    }
}

// ----------------------------------------------------
// Google OAuth Authentication
// ----------------------------------------------------
async function handleGoogleAuth() {
    clearAuthAlert();

    const activeBtn = (currentAuthMode === 'register')
        ? document.getElementById('btn-google-register')
        : document.getElementById('btn-google-login');

    const btnText = activeBtn ? activeBtn.querySelector('.btn-google-text') : null;
    const originalText = btnText ? btnText.textContent : 'Continue with Google';

    if (btnText) btnText.textContent = 'Connecting to Google...';
    if (activeBtn) activeBtn.disabled = true;

    try {
        if (!window.PrivCloudAuth || !window.PrivCloudAuth.signInWithGoogle) {
            showAuthAlert('Authentication service is initializing. Please try again.');
            return;
        }

        // Build current return redirect URL preserving any parameters
        const currentSearch = window.location.search || '';
        const callbackUrl = window.location.origin + window.location.pathname + currentSearch;

        const { data, error } = await window.PrivCloudAuth.signInWithGoogle(callbackUrl);
        if (error) {
            showAuthAlert(error.message || 'Could not connect to Google. Please check your network or try email login.');
        }
    } catch (err) {
        showAuthAlert(err.message || 'An error occurred while connecting with Google.');
    } finally {
        setTimeout(() => {
            if (activeBtn) activeBtn.disabled = false;
            if (btnText) btnText.textContent = originalText;
        }, 3000);
    }
}

// ----------------------------------------------------
// Post-Auth Redirection & Hash Routing
// ----------------------------------------------------
const PLAN_TOKEN_MAP = {
    'trial': '9a8f10e7b9c2d4a6',
    'basic': '4d9e1a7b0c3f8e2a',
    'pro': '6b2f8c1a9d4e07bf',
    'free': '9a8f10e7b9c2d4a6'
};

const AUTH_TRANSITION_VIDEO_URL = "https://qrxjyvezlotjwggtgoqe.supabase.co/storage/v1/object/public/assets/after_auth.mp4";
let transitionTriggered = false;

function getPostAuthRedirectDestination() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTarget = urlParams.get('redirect');
    const rawPlan = urlParams.get('plan') || '9a8f10e7b9c2d4a6';
    const planToken = PLAN_TOKEN_MAP[rawPlan] || rawPlan;

    if (redirectTarget === 'purchase') {
        return `../purchase_page/purchase.html?plan=${encodeURIComponent(planToken)}`;
    }
    return '../product_page/product.html';
}

function playAuthTransitionVideo(destinationUrl = null, userDisplayName = '') {
    if (transitionTriggered) return;
    transitionTriggered = true;

    const targetUrl = destinationUrl || getPostAuthRedirectDestination();
    const overlay = document.getElementById('auth-transition-overlay');
    const video = document.getElementById('auth-transition-video');
    const skipBtn = document.getElementById('auth-transition-skip-btn');

    // Store auth flag for product page welcome notification
    try {
        sessionStorage.setItem('privcloud_just_authenticated', '1');
        if (userDisplayName) {
            sessionStorage.setItem('privcloud_auth_user_name', userDisplayName);
        }
    } catch (e) {}

    if (!overlay) {
        window.location.href = targetUrl;
        return;
    }

    // Activate clean video transition overlay
    overlay.classList.remove('hidden');
    void overlay.offsetWidth; // Reflow
    overlay.classList.add('active');

    let navigated = false;
    const executeNavigation = () => {
        if (navigated) return;
        navigated = true;
        overlay.style.opacity = '0';
        setTimeout(() => {
            window.location.href = targetUrl;
        }, 280);
    };

    if (skipBtn) {
        skipBtn.onclick = (e) => {
            e.preventDefault();
            executeNavigation();
        };
    }

    const keyHandler = (e) => {
        if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
            window.removeEventListener('keydown', keyHandler);
            executeNavigation();
        }
    };
    window.addEventListener('keydown', keyHandler);

    let maxFallbackTimeout = 4000;

    if (video) {
        const srcElem = video.querySelector('source');
        if (srcElem && srcElem.src !== AUTH_TRANSITION_VIDEO_URL) {
            srcElem.src = AUTH_TRANSITION_VIDEO_URL;
            video.load();
        }

        video.currentTime = 0;
        video.muted = true;

        const onVideoMeta = () => {
            if (video.duration && !isNaN(video.duration) && video.duration > 0) {
                maxFallbackTimeout = Math.min(8000, Math.floor(video.duration * 1000) + 150);
            }
        };

        if (video.readyState >= 1) {
            onVideoMeta();
        } else {
            video.addEventListener('loadedmetadata', onVideoMeta, { once: true });
        }

        video.addEventListener('ended', () => {
            executeNavigation();
        }, { once: true });

        video.addEventListener('error', (err) => {
            console.warn("[PrivCloud Transition] Video playback fallback:", err);
            setTimeout(executeNavigation, 2000);
        }, { once: true });

        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.warn("[PrivCloud Transition] Auto-play notice:", err);
            });
        }
    }

    // Safety timeout in case video does not trigger ended event
    setTimeout(() => {
        if (!navigated) {
            executeNavigation();
        }
    }, maxFallbackTimeout);
}
window.playAuthTransitionVideo = playAuthTransitionVideo;

async function handleHashRouting() {
    const hash = window.location.hash.toLowerCase().replace(/^#/, '');

    // Check if OAuth callback or active session exists
    if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
        if (window.PrivCloudAuth) {
            try {
                // Poll for session establishment after Supabase processes OAuth redirect
                for (let attempt = 0; attempt < 6; attempt++) {
                    await new Promise(r => setTimeout(r, 350));
                    const session = await window.PrivCloudAuth.getSession();
                    if (session && session.user) {
                        const displayName = window.PrivCloudAuth.getUserDisplayName(session.user);
                        showAuthAlert(`Welcome back, ${displayName}! Redirecting...`, true);
                        setTimeout(() => {
                            playAuthTransitionVideo(getPostAuthRedirectDestination(), displayName);
                        }, 300);
                        return;
                    }
                }
            } catch (e) {
                console.warn('OAuth session resolution:', e);
            }
        }
    }

    if (hash === AUTH_HASH_MAP.register || hash === 'register' || hash === 'signup') {
        switchAuthMode('register', true);
    } else if (hash === 'forgot') {
        switchAuthMode('forgot', true);
    } else if (hash === 'otp') {
        openDirectOtpEntry();
    } else if (hash === 'reset-password') {
        switchAuthMode('reset-password', true);
    } else {
        switchAuthMode('login', true);
    }

    setupOtpBoxListeners();

    // If user already has active session and requested redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('redirect') === 'purchase' && window.PrivCloudAuth) {
        try {
            const session = await window.PrivCloudAuth.getSession();
            if (session && session.user) {
                window.location.href = getPostAuthRedirectDestination();
            }
        } catch (e) {
            console.warn('Session check error:', e);
        }
    }
}

window.addEventListener('DOMContentLoaded', handleHashRouting);
window.addEventListener('hashchange', handleHashRouting);
window.addEventListener('popstate', handleHashRouting);

