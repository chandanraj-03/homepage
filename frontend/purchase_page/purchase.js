/**
 * PrivCloud Purchase & Razorpay Payment Integration
 */

let currentPlan = '9a8f10e7b9c2d4a6';
let currentUser = null;

// 16-Character Secure Plan Token Mapping
const PLAN_ALIAS_MAP = {
    'trial': '9a8f10e7b9c2d4a6',
    'basic': '4d9e1a7b0c3f8e2a',
    'pro': '6b2f8c1a9d4e07bf',
    'free': '9a8f10e7b9c2d4a6',
    '9a8f10e7b9c2d4a6': '9a8f10e7b9c2d4a6',
    '4d9e1a7b0c3f8e2a': '4d9e1a7b0c3f8e2a',
    '6b2f8c1a9d4e07bf': '6b2f8c1a9d4e07bf'
};

const PLANS_DATA = {
    '9a8f10e7b9c2d4a6': {
        id: '9a8f10e7b9c2d4a6',
        name: 'Free Trial Edition',
        badge: '🎁 14-Day Evaluation',
        price: '₹0',
        amountNum: 0,
        tenure: '14-Day Free Access (1 PC)',
        keyPrefix: 'PC30-TRIAL',
        bullets: [
            '14-Day Full Feature Evaluation',
            '1 PC Local Installation',
            '5 GB Storage Quota',
            'Local Wi-Fi Network Mode',
            'Wi-Fi Peer Radar & Sharing',
            'In-App 1-Click Upgrade',
            'Zero-Knowledge Privacy Security'
        ],
        isFree: true
    },
    '4d9e1a7b0c3f8e2a': {
        id: '4d9e1a7b0c3f8e2a',
        name: 'Basic Edition',
        badge: '⭐ Standard Lifetime',
        price: '₹1,499',
        amountNum: 1499,
        tenure: 'One-Time Lifetime License ($19.99)',
        keyPrefix: 'PRIV-BAS',
        bullets: [
            'Lifetime License (1 PC)',
            '500 GB Storage Quota',
            'Dynamic Remote Tunnel',
            'Wi-Fi Peer Radar & Sharing',
            'Full In-Browser Media & Preview Suite',
            'Smart Sharing & Password Links',
            '10-Character Product License Key'
        ],
        isFree: false
    },
    '6b2f8c1a9d4e07bf': {
        id: '6b2f8c1a9d4e07bf',
        name: 'Pro Edition',
        badge: '👑 Professional Lifetime',
        price: '₹2,999',
        amountNum: 2999,
        tenure: 'One-Time Lifetime License ($39.99)',
        keyPrefix: 'PRIV-PRO',
        bullets: [
            'Lifetime License (1 PC)',
            'Unlimited Storage Capacity',
            'Permanent Custom Subdomain',
            'Wi-Fi Peer Radar & Sharing',
            'Client Upload Dropboxes',
            'Full In-Browser Media Suite',
            'Priority Tunnel Routing',
            'VIP Lifetime Customer Support',
            '16-Character Product License Key'
        ],
        isFree: false
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check URL Parameters for Plan and auto-upgrade legacy parameters to 16-char tokens
    const urlParams = new URLSearchParams(window.location.search);
    const rawPlanParam = urlParams.get('plan') || urlParams.get('pid');
    if (rawPlanParam && PLAN_ALIAS_MAP[rawPlanParam.toLowerCase()]) {
        currentPlan = PLAN_ALIAS_MAP[rawPlanParam.toLowerCase()];
    }

    // Auto-normalize URL to display only the secure 16-character token
    const normalizedUrl = new URL(window.location);
    normalizedUrl.searchParams.delete('pid');
    normalizedUrl.searchParams.set('plan', currentPlan);
    window.history.replaceState({}, '', normalizedUrl);

    // 2. Supabase Auth Verification
    await verifyAuthentication();

    // 3. Render Selected Plan
    renderPlan(currentPlan);

    // 4. Bind Plan Tab Switchers
    document.querySelectorAll('.plan-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const plan = btn.getAttribute('data-plan');
            const targetPlan = PLAN_ALIAS_MAP[plan] || plan;
            if (targetPlan && PLANS_DATA[targetPlan]) {
                currentPlan = targetPlan;
                renderPlan(currentPlan);
                // Update URL to 16-character secure token
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('plan', currentPlan);
                window.history.replaceState({}, '', newUrl);
            }
        });
    });

    // 5. Bind Checkout / License Activation Button
    const checkoutBtn = document.getElementById('btn-submit-order');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleOrderSubmission);
    }
});

/**
 * Verify user session with Supabase
 */
async function verifyAuthentication() {
    const authOverlay = document.getElementById('auth-guard-overlay');
    const userBadgeEl = document.getElementById('user-badge-container');

    if (!window.PrivCloudAuth) {
        await new Promise(r => setTimeout(r, 400));
    }

    if (window.PrivCloudAuth) {
        const session = await window.PrivCloudAuth.getSession();
        if (session && session.user) {
            currentUser = session.user;
            const email = currentUser.email || 'User';
            const username = email.split('@')[0];

            if (userBadgeEl) {
                userBadgeEl.innerHTML = `
                    <span class="user-badge">👤 ${username}</span>
                    <button class="btn-signout" onclick="handleSignOut()">Sign Out</button>
                `;
            }

            const custEmailField = document.getElementById('cust-email');
            if (custEmailField) custEmailField.value = email;

            if (authOverlay) authOverlay.style.display = 'none';
            return;
        }
    }

    // Unauthenticated -> Show Guard Overlay
    if (authOverlay) {
        authOverlay.style.display = 'flex';
    }
}

function redirectToAuth() {
    window.location.href = `../auth_page/auth.html?redirect=purchase&plan=${encodeURIComponent(currentPlan)}#e9b4c0f81d3ea72a`;
}

async function handleSignOut() {
    if (window.PrivCloudAuth) {
        await window.PrivCloudAuth.signOut();
    }
    window.location.href = '../index.html';
}

/**
 * Show error or alert notification on checkout card
 */
function showPaymentNotice(type, message) {
    const banner = document.getElementById('payment-notice-banner');
    if (!banner) return;
    banner.className = `payment-notice-banner ${type}`;
    banner.innerHTML = `<span>${message}</span>`;
    banner.style.display = 'flex';
}

function hidePaymentNotice() {
    const banner = document.getElementById('payment-notice-banner');
    if (banner) {
        banner.style.display = 'none';
        banner.innerHTML = '';
    }
}

/**
 * Render the chosen plan in the summary and checkout UI
 */
function renderPlan(planId) {
    hidePaymentNotice();
    const plan = PLANS_DATA[planId] || PLANS_DATA.trial;

    // 1. Update Tabs Active State
    document.querySelectorAll('.plan-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-plan') === planId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 2. Update Plan Summary Box
    const nameEl = document.getElementById('summary-plan-name');
    const costEl = document.getElementById('summary-plan-cost');
    const tenureEl = document.getElementById('summary-plan-tenure');
    const bulletsList = document.getElementById('summary-plan-bullets');

    if (nameEl) nameEl.textContent = plan.name;
    if (costEl) costEl.textContent = plan.price;
    if (tenureEl) tenureEl.textContent = plan.tenure;

    if (bulletsList) {
        bulletsList.innerHTML = plan.bullets.map(b => `<li><span style="color: #0284c7; font-weight: 800;">✓</span> ${b}</li>`).join('');
    }

    // 3. Update Order Invoice Summary
    const invoiceSubtotal = document.getElementById('invoice-subtotal');
    const invoiceTax = document.getElementById('invoice-tax');
    const invoiceTotal = document.getElementById('invoice-total');
    const paySection = document.getElementById('payment-section-container');
    const submitBtn = document.getElementById('btn-submit-order');

    if (plan.isFree) {
        if (invoiceSubtotal) invoiceSubtotal.textContent = '₹0';
        if (invoiceTax) invoiceTax.textContent = '₹0';
        if (invoiceTotal) invoiceTotal.textContent = '₹0 (Free Trial)';
        if (paySection) paySection.style.display = 'none';
        if (submitBtn) {
            submitBtn.innerHTML = `<span>🚀 Activate Free Trial & Download</span>`;
            submitBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        }
    } else {
        if (invoiceSubtotal) invoiceSubtotal.textContent = plan.price;
        if (invoiceTax) invoiceTax.textContent = '₹0 (Included)';
        if (invoiceTotal) invoiceTotal.textContent = plan.price;
        if (paySection) paySection.style.display = 'block';
        if (submitBtn) {
            submitBtn.innerHTML = `<span>🔒 Pay ${plan.price} via Razorpay</span>`;
            submitBtn.style.background = 'linear-gradient(135deg, #0284c7 0%, #0072ff 100%)';
        }
    }

    // Hide previous success if switching plans
    const successBox = document.getElementById('license-success-box');
    const checkoutForm = document.getElementById('checkout-interactive-form');
    if (successBox) successBox.style.display = 'none';
    if (checkoutForm) checkoutForm.style.display = 'block';
}

/**
 * Handle Order Submission (Free Trial or Razorpay Checkout Modal)
 */
async function handleOrderSubmission() {
    hidePaymentNotice();
    const plan = PLANS_DATA[currentPlan] || PLANS_DATA.trial;
    const submitBtn = document.getElementById('btn-submit-order');
    const originalBtnHtml = submitBtn.innerHTML;

    // Case 1: Free Trial Plan
    if (plan.isFree) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳ Activating Free Trial...</span>`;
        await new Promise(r => setTimeout(r, 800));
        onPaymentSuccess(plan, 'FREE_TRIAL');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        return;
    }

    // Case 2: Paid Plan via Razorpay Standard Checkout
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>⏳ Creating Razorpay Order...</span>`;

    try {
        // Step 1: Create Order on Backend (amount in paise, minimum 100 paise)
        const amountPaise = plan.amountNum * 100;
        const createOrderRes = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amountPaise,
                currency: 'INR',
                receipt: `rcpt_${plan.id}_${Date.now()}`,
                notes: {
                    plan_id: plan.id,
                    plan_name: plan.name,
                    user_email: currentUser ? currentUser.email : 'unauthenticated'
                }
            })
        });

        const orderData = await createOrderRes.json();

        if (!createOrderRes.ok || !orderData.order_id) {
            throw new Error(orderData.error || 'Failed to initialize payment order with Razorpay.');
        }

        // Step 2: Open Razorpay Standard Checkout Modal
        if (typeof Razorpay === 'undefined') {
            throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
        }

        submitBtn.innerHTML = `<span>🔒 Opening Razorpay Checkout...</span>`;

        const userEmail = currentUser ? currentUser.email : '';
        const userName = currentUser ? (currentUser.user_metadata?.full_name || userEmail.split('@')[0]) : 'PrivCloud User';

        const razorpayOptions = {
            key: orderData.key_id,
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'PrivCloud 3.0',
            description: `${plan.name} — Lifetime License`,
            image: 'https://qrxjyvezlotjwggtgoqe.supabase.co/storage/v1/object/public/assets/logo.png',
            order_id: orderData.order_id,
            prefill: {
                name: userName,
                email: userEmail,
                contact: ''
            },
            notes: {
                plan_id: plan.id,
                plan_name: plan.name
            },
            theme: {
                color: '#0284c7'
            },
            modal: {
                ondismiss: function () {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHtml;
                    showPaymentNotice('warning', '⚠️ Payment cancelled. You can retry checkout whenever ready.');
                }
            },
            handler: async function (response) {
                // Step 3: Payment captured in modal -> Verify signature with backend
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<span>🛡️ Verifying Payment Signature...</span>`;

                try {
                    const verifyRes = await fetch('/api/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    });

                    const verifyData = await verifyRes.json();

                    if (verifyRes.ok && verifyData.success) {
                        showPaymentNotice('success', '✅ Payment verified successfully!');
                        onPaymentSuccess(plan, response.razorpay_payment_id);
                    } else {
                        showPaymentNotice('error', `❌ Payment verification failed: ${verifyData.message || 'Signature mismatch.'}`);
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalBtnHtml;
                    }
                } catch (verifyErr) {
                    showPaymentNotice('error', `❌ Network error while verifying payment: ${verifyErr.message}`);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHtml;
                }
            }
        };

        const rzp = new Razorpay(razorpayOptions);

        rzp.on('payment.failed', function (response) {
            const errorDesc = response.error ? (response.error.description || response.error.reason) : 'Payment transaction failed';
            showPaymentNotice('error', `❌ Payment failed: ${errorDesc}`);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        });

        rzp.open();

    } catch (err) {
        showPaymentNotice('error', `❌ ${err.message}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
    }
}

/**
 * Handle successful payment / license activation
 */
function onPaymentSuccess(plan, paymentReference) {
    const generatedKey = generateLicenseKey(plan);

    // Hide checkout form and show success box
    const checkoutForm = document.getElementById('checkout-interactive-form');
    const successBox = document.getElementById('license-success-box');
    const keyDisplay = document.getElementById('display-license-key');
    const successTitle = document.getElementById('success-plan-title');

    if (checkoutForm) checkoutForm.style.display = 'none';
    if (successBox) successBox.style.display = 'block';
    if (keyDisplay) keyDisplay.textContent = generatedKey;
    if (successTitle) successTitle.textContent = `${plan.name} Activated!`;

    // Bind License Certificate Download
    const downloadCertBtn = document.getElementById('btn-download-cert');
    if (downloadCertBtn) {
        downloadCertBtn.onclick = () => downloadLicenseCertificate(plan.name, generatedKey, paymentReference);
    }
}

/**
 * Generate cryptographic mock license key
 */
function generateLicenseKey(plan) {
    const randomHex = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    if (plan.id === 'trial') {
        return `${plan.keyPrefix}-${randomHex()}-${randomHex()}`;
    } else if (plan.id === 'basic') {
        return `${plan.keyPrefix}-${randomHex()}-${randomHex()}-${randomHex()}`;
    } else {
        return `${plan.keyPrefix}-${randomHex()}-${randomHex()}-${randomHex()}-${randomHex()}`;
    }
}

/**
 * Trigger download of License Certificate text file
 */
function downloadLicenseCertificate(planName, licenseKey, paymentReference) {
    const userEmail = currentUser ? currentUser.email : 'user@privcloud.local';
    const content = `========================================================
             PRIVCLOUD 3.0 LICENSE CERTIFICATE
========================================================

Product: ${planName}
Issued To: ${userEmail}
Issued At: ${new Date().toISOString()}
License Key: ${licenseKey}
Payment Reference: ${paymentReference || 'N/A'}

STATUS: ACTIVE & VERIFIED

QUICK START INSTRUCTIONS:
1. Run PrivCloud_Setup_v3.0.exe on your Windows PC.
2. Launch Settings.bat from your desktop dashboard.
3. Paste the License Key above into the Activation Prompt.
4. Point to your storage directory and start your private cloud!

Support: support@privcloud.com
========================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PrivCloud_License_${licenseKey}.txt`;
    link.click();
}

/**
 * Trigger Installer Download Simulation
 */
function triggerInstallerDownload() {
    alert("Downloading PrivCloud_Setup_v3.0.exe (Windows 64-bit Installer, 125 MB)... \n\nPlease keep your License Key handy for setup!");
}
