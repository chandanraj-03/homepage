/**
 * PrivCloud Purchase & Razorpay Payment Integration
 */

let currentPlan = '9a8f10e7b9c2d4a6';
let currentUser = null;
let trialDonationMode = 'skip'; // 'skip' or 'donate'
let selectedDonationAmount = 99; // Default preset amount in INR
let verifiedOrderSession = null;

function resolveApiUrl(path) {
    if (typeof window !== 'undefined' && window.getPrivCloudApiUrl) {
        return window.getPrivCloudApiUrl(path);
    }
    if (typeof window !== 'undefined' && (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '5001'))) {
        return `http://localhost:5001${path.startsWith('/') ? path : '/' + path}`;
    }
    return path;
}

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
        tenure: 'One-Time Lifetime License (₹1,499)',
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
        tenure: 'One-Time Lifetime VIP (₹2,999)',
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

    // 3. Bind Plan Tab Switchers
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

    // 4. Bind Donation Mode Toggle
    bindDonationControls();

    // 5. Render Selected Plan
    renderPlan(currentPlan);

    // 6. Bind Checkout / License Activation Button
    const checkoutBtn = document.getElementById('btn-submit-order');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleOrderSubmission);
    }

    // 7. Check for restored verified payment session for current authenticated user
    await restoreVerifiedOrderSession();
});

/**
 * Bind Donation controls (Skip vs Donate mode, presets, custom input)
 */
function bindDonationControls() {
    const modeSkip = document.getElementById('mode-skip-donation');
    const modeAdd = document.getElementById('mode-add-donation');
    const radioSkip = modeSkip ? modeSkip.querySelector('input[type="radio"]') : null;
    const radioAdd = modeAdd ? modeAdd.querySelector('input[type="radio"]') : null;

    if (modeSkip) {
        modeSkip.addEventListener('click', () => {
            trialDonationMode = 'skip';
            if (radioSkip) radioSkip.checked = true;
            if (radioAdd) radioAdd.checked = false;
            modeSkip.classList.add('active');
            if (modeAdd) modeAdd.classList.remove('active');
            updateTrialDonationUI();
        });
    }

    if (modeAdd) {
        modeAdd.addEventListener('click', () => {
            trialDonationMode = 'donate';
            if (radioAdd) radioAdd.checked = true;
            if (radioSkip) radioSkip.checked = false;
            modeAdd.classList.add('active');
            if (modeSkip) modeSkip.classList.remove('active');
            updateTrialDonationUI();
        });
    }

    // Preset Amount Buttons
    document.querySelectorAll('.donation-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.donation-preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const amount = parseInt(btn.getAttribute('data-amount'), 10);
            if (!isNaN(amount) && amount > 0) {
                selectedDonationAmount = amount;
                const customInput = document.getElementById('custom-donation-input');
                if (customInput) customInput.value = '';
                updateTrialDonationUI();
            }
        });
    });

    // Custom Amount Input
    const customInput = document.getElementById('custom-donation-input');
    if (customInput) {
        customInput.addEventListener('input', () => {
            const val = parseInt(customInput.value, 10);
            if (!isNaN(val) && val > 0) {
                document.querySelectorAll('.donation-preset-btn').forEach(b => b.classList.remove('active'));
                selectedDonationAmount = val;
                updateTrialDonationUI();
            } else if (customInput.value === '') {
                const defaultPreset = document.querySelector('.donation-preset-btn[data-amount="99"]') || document.querySelector('.donation-preset-btn');
                if (defaultPreset) {
                    defaultPreset.classList.add('active');
                    selectedDonationAmount = parseInt(defaultPreset.getAttribute('data-amount'), 10) || 99;
                }
                updateTrialDonationUI();
            }
        });
    }
}

/**
 * Update UI when toggling donation on Free Trial
 */
function updateTrialDonationUI() {
    const plan = PLANS_DATA[currentPlan];
    if (!plan || !plan.isFree) return;

    const donationPanel = document.getElementById('donation-amount-panel');
    const invoiceDonationRow = document.getElementById('invoice-donation-row');
    const invoiceDonation = document.getElementById('invoice-donation');
    const invoiceTotal = document.getElementById('invoice-total');
    const invoiceSubtotal = document.getElementById('invoice-subtotal');
    const paySection = document.getElementById('payment-section-container');
    const payTitle = document.getElementById('payment-section-title');
    const payDesc = document.getElementById('razorpay-desc-text');
    const submitBtn = document.getElementById('btn-submit-order');

    if (invoiceSubtotal) invoiceSubtotal.textContent = '₹0';

    if (trialDonationMode === 'donate') {
        if (donationPanel) donationPanel.style.display = 'block';
        if (invoiceDonationRow) invoiceDonationRow.style.display = 'flex';
        if (invoiceDonation) invoiceDonation.textContent = `₹${selectedDonationAmount.toLocaleString('en-IN')}`;
        if (invoiceTotal) invoiceTotal.textContent = `₹${selectedDonationAmount.toLocaleString('en-IN')}`;
        
        if (paySection) paySection.style.display = 'block';
        if (payTitle) payTitle.innerHTML = `<span>💳</span> Secure Donation via Razorpay`;
        if (payDesc) payDesc.textContent = `Your optional ₹${selectedDonationAmount.toLocaleString('en-IN')} contribution directly powers PrivCloud zero-telemetry development and hosting. Pay securely via UPI, Cards, Net Banking, or Wallets.`;

        if (submitBtn) {
            submitBtn.innerHTML = `<span>🤝 Donate ₹${selectedDonationAmount.toLocaleString('en-IN')} & Activate Trial</span>`;
            submitBtn.style.background = 'linear-gradient(135deg, #0284c7 0%, #0072ff 100%)';
            submitBtn.style.boxShadow = '0 6px 20px rgba(2, 132, 199, 0.35)';
        }
    } else {
        if (donationPanel) donationPanel.style.display = 'none';
        if (invoiceDonationRow) invoiceDonationRow.style.display = 'none';
        if (invoiceTotal) invoiceTotal.textContent = '₹0 (Free Trial)';
        if (paySection) paySection.style.display = 'none';

        if (submitBtn) {
            submitBtn.innerHTML = `<span>🚀 Activate Free Trial & Download</span>`;
            submitBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            submitBtn.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.35)';
        }
    }
}

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
            const meta = currentUser.user_metadata || {};
            const email = currentUser.email || 'User';
            const displayName = meta.full_name || meta.name || email.split('@')[0] || 'User';

            if (userBadgeEl) {
                userBadgeEl.innerHTML = `
                    <span class="user-badge">👤 ${displayName}</span>
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
    // Cleanly purge all cached verified orders from session storage
    try {
        sessionStorage.removeItem('pc_verified_order');
        Object.keys(sessionStorage).forEach(k => {
            if (k.startsWith('pc_verified_order')) {
                sessionStorage.removeItem(k);
            }
        });
    } catch (e) {}
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
    const plan = PLANS_DATA[planId] || PLANS_DATA['9a8f10e7b9c2d4a6'];

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
    const invoicePlanName = document.getElementById('invoice-plan-name');
    const invoiceSubtotal = document.getElementById('invoice-subtotal');
    const invoiceTax = document.getElementById('invoice-tax');
    const invoiceTotal = document.getElementById('invoice-total');
    const invoiceDonationRow = document.getElementById('invoice-donation-row');
    const paySection = document.getElementById('payment-section-container');
    const payTitle = document.getElementById('payment-section-title');
    const payDesc = document.getElementById('razorpay-desc-text');
    const submitBtn = document.getElementById('btn-submit-order');
    const trialDonationContainer = document.getElementById('trial-donation-container');

    if (invoicePlanName) invoicePlanName.textContent = plan.name;

    if (plan.isFree) {
        if (trialDonationContainer) trialDonationContainer.style.display = 'block';
        if (invoiceTax) invoiceTax.textContent = '₹0';
        updateTrialDonationUI();
    } else {
        if (trialDonationContainer) trialDonationContainer.style.display = 'none';
        if (invoiceDonationRow) invoiceDonationRow.style.display = 'none';
        if (invoiceSubtotal) invoiceSubtotal.textContent = plan.price;
        if (invoiceTax) invoiceTax.textContent = '₹0 (Included)';
        if (invoiceTotal) invoiceTotal.textContent = plan.price;
        if (paySection) paySection.style.display = 'block';
        if (payTitle) payTitle.innerHTML = `<span>💳</span> Secure Payment via Razorpay`;
        if (payDesc) payDesc.textContent = `Pay securely using UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards (Visa, Mastercard, RuPay), Net Banking, or Digital Wallets in the checkout modal.`;
        if (submitBtn) {
            submitBtn.innerHTML = `<span>🔒 Pay ${plan.price} via Razorpay</span>`;
            submitBtn.style.background = 'linear-gradient(135deg, #0284c7 0%, #0072ff 100%)';
            submitBtn.style.boxShadow = '0 6px 20px rgba(2, 132, 199, 0.35)';
        }
    }

    // Ensure product and product key remain permanently visible once generated
    const successBox = document.getElementById('license-success-box');
    const checkoutForm = document.getElementById('checkout-interactive-form');
    const vault = document.getElementById('product-key-vault');
    const keyDisplay = document.getElementById('display-license-key');
    const tierBadge = document.getElementById('vault-tier-badge');
    const successTitle = document.getElementById('success-plan-title');

    if (verifiedOrderSession && (verifiedOrderSession.retrievedKey || verifiedOrderSession.orderId)) {
        // Product & Product key have been generated: ALWAYS keep them visible regardless of selected plan!
        if (successBox) successBox.style.display = 'block';
        if (vault) vault.style.display = 'block';
        if (checkoutForm) checkoutForm.style.display = 'none';

        if (verifiedOrderSession.retrievedKey) {
            if (keyDisplay) keyDisplay.textContent = verifiedOrderSession.retrievedKey;
            if (tierBadge) tierBadge.textContent = verifiedOrderSession.tier || 'PRO';
            const keyBtn = document.getElementById('btn-get-product-key');
            const keyTitle = document.getElementById('btn-key-title');
            const keyDesc = document.getElementById('btn-key-desc');
            if (keyBtn) keyBtn.classList.add('retrieved');
            if (keyTitle) keyTitle.textContent = 'Key Retrieved ✅';
            if (keyDesc) keyDesc.textContent = `Assigned key: ${verifiedOrderSession.retrievedKey}`;
        }

        const purchasedPlan = verifiedOrderSession.plan || PLANS_DATA[currentPlan];
        const isSamePlan = (purchasedPlan && (purchasedPlan.id === planId || purchasedPlan.name === plan.name));

        // Check if user has Basic and is viewing Pro tab → show Upgrade to Pro button
        const purchasedTier = (verifiedOrderSession.tier || '').toUpperCase();
        const viewingProPlan = (planId === '6b2f8c1a9d4e07bf');
        const isBasicUser = (purchasedTier === 'BASIC');

        // Remove any existing upgrade button first
        const existingUpgradeBtn = document.getElementById('btn-upgrade-to-pro');
        if (existingUpgradeBtn) existingUpgradeBtn.remove();

        if (successTitle) {
            if (isSamePlan) {
                successTitle.innerHTML = `<span>🎉 ${purchasedPlan.name} Activated!</span>`;
            } else {
                successTitle.innerHTML = `<span>🎉 ${purchasedPlan.name} Activated!</span><br><span style="font-size: 0.92rem; font-weight: 600; color: #64748b;">(Viewing features for: ${plan.name} · Your product key is kept active below)</span>`;
            }
        }

        // Insert Upgrade to Pro button for Basic users viewing Pro plan
        if (isBasicUser && viewingProPlan && successTitle) {
            const upgradeBtn = document.createElement('div');
            upgradeBtn.id = 'btn-upgrade-to-pro';
            upgradeBtn.style.cssText = 'margin-top: 16px; text-align: center;';
            upgradeBtn.innerHTML = `
                <button type="button" style="
                    background: linear-gradient(135deg, #0284c7 0%, #0072ff 100%);
                    color: #ffffff;
                    font-weight: 800;
                    font-size: 0.95rem;
                    padding: 14px 28px;
                    border: none;
                    border-radius: 14px;
                    cursor: pointer;
                    box-shadow: 0 6px 24px rgba(2, 132, 199, 0.35);
                    transition: all 0.25s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    letter-spacing: -0.2px;
                " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 30px rgba(2,132,199,0.45)'"
                   onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 6px 24px rgba(2,132,199,0.35)'"
                   onclick="resetOrderSession(); currentPlan='6b2f8c1a9d4e07bf'; renderPlan('6b2f8c1a9d4e07bf'); const u=new URL(window.location); u.searchParams.set('plan','6b2f8c1a9d4e07bf'); window.history.replaceState({},'',u);">
                    👑 Upgrade to Pro Edition — ₹2,999
                </button>
                <p style="margin: 8px 0 0; font-size: 0.78rem; color: #64748b; line-height: 1.4;">
                    Unlock Unlimited Storage, Custom Subdomain, Client Dropboxes & VIP Priority Support
                </p>
            `;
            successTitle.parentElement.insertBefore(upgradeBtn, successTitle.nextSibling);
        }

        const normalizedTier = (verifiedOrderSession.tier || '').toLowerCase().includes('pro') ? 'pro' : 'basic';
        updateDevChatCard(normalizedTier, purchasedPlan.name, verifiedOrderSession.orderId || '');
    } else {
        if (successBox) successBox.style.display = 'none';
        if (checkoutForm) checkoutForm.style.display = 'block';
    }
}

/**
 * Handle Order Submission (Free Trial or Razorpay Checkout Modal)
 */
async function handleOrderSubmission() {
    hidePaymentNotice();
    const plan = PLANS_DATA[currentPlan] || PLANS_DATA['9a8f10e7b9c2d4a6'];
    const submitBtn = document.getElementById('btn-submit-order');
    const originalBtnHtml = submitBtn.innerHTML;

    // Case 1: Free Trial without donation (or Skip Donation)
    if (plan.isFree && trialDonationMode === 'skip') {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳ Activating Free Trial...</span>`;
        try {
            const userEmail = currentUser ? currentUser.email : '';
            let trialOrderId = `trial_${Date.now()}`;
            let trialPaymentId = 'FREE_TRIAL';

            try {
                const trialRes = await fetch(resolveApiUrl('/api/create-trial-order'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        plan_id: plan.id,
                        user_email: userEmail
                    })
                });
                if (trialRes.ok) {
                    const trialData = await trialRes.json();
                    if (trialData && trialData.order_id) {
                        trialOrderId = trialData.order_id;
                        trialPaymentId = trialData.payment_id || 'FREE_TRIAL';
                    }
                }
            } catch (apiErr) {
                console.warn("[PrivCloud] /api/create-trial-order notice:", apiErr);
            }

            onPaymentSuccess(plan, trialOrderId, trialPaymentId, 0);
        } catch (trialErr) {
            showPaymentNotice('error', `❌ ${trialErr.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
        return;
    }

    // Case 2: Free Trial with Donation OR Paid Plan via Razorpay Standard Checkout
    const isDonationOrder = plan.isFree && trialDonationMode === 'donate';
    const chargeAmount = isDonationOrder ? selectedDonationAmount : plan.amountNum;

    if (isNaN(chargeAmount) || chargeAmount < 1) {
        showPaymentNotice('error', '⚠️ Please enter a valid contribution amount of at least ₹1.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = isDonationOrder ? `<span>⏳ Creating Donation Order...</span>` : `<span>⏳ Creating Razorpay Order...</span>`;

    try {
        // Step 1: Create Order on Backend (amount in paise, minimum 100 paise)
        const amountPaise = Math.round(chargeAmount * 100);
        const orderNotes = {
            plan_id: plan.id,
            plan_name: plan.name,
            user_email: currentUser ? currentUser.email : 'unauthenticated',
            is_donation: isDonationOrder ? 'true' : 'false',
            donation_amount: isDonationOrder ? chargeAmount.toString() : '0'
        };

        const createOrderRes = await fetch(resolveApiUrl('/api/create-order'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amountPaise,
                currency: 'INR',
                receipt: isDonationOrder ? `rcpt_donate_${Date.now()}` : `rcpt_${plan.id}_${Date.now()}`,
                notes: orderNotes
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
            name: 'PrivCloud',
            description: isDonationOrder 
                ? `PrivCloud Support Contribution — ₹${chargeAmount.toLocaleString('en-IN')}`
                : `${plan.name} — Lifetime License`,
            image: 'https://qrxjyvezlotjwggtgoqe.supabase.co/storage/v1/object/public/assets/logo.png',
            order_id: orderData.order_id,
            prefill: {
                name: userName,
                email: userEmail,
                contact: ''
            },
            notes: orderNotes,
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
                    const userEmail = currentUser ? (currentUser.email || '').toLowerCase() : '';
                    const meta = currentUser ? (currentUser.user_metadata || {}) : {};
                    const userUname = meta.username || (userEmail ? userEmail.split('@')[0] : '');
                    const planTier = plan.name.includes('Pro') ? 'PRO' : (plan.name.includes('Basic') ? 'BASIC' : 'TRIAL');

                    const verifyRes = await fetch(resolveApiUrl('/api/verify-payment'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            user_email: userEmail,
                            username: userUname,
                            plan_id: plan.id,
                            tier: planTier,
                            amount: isDonationOrder ? chargeAmount : plan.amountNum
                        })
                    });

                    const verifyData = await verifyRes.json();

                    if (verifyRes.ok && verifyData.success) {
                        showPaymentNotice('success', isDonationOrder 
                            ? '✅ Thank you for your generous contribution!' 
                            : '✅ Payment verified successfully!');
                        onPaymentSuccess(plan, response.razorpay_order_id, response.razorpay_payment_id, isDonationOrder ? chargeAmount : 0);
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
function onPaymentSuccess(plan, orderId, paymentId, donationAmount = 0) {
    const planTier = plan.name.includes('Pro') ? 'PRO' : (plan.name.includes('Basic') ? 'BASIC' : 'TRIAL');
    const userEmail = currentUser ? (currentUser.email || '').toLowerCase() : '';
    const userMeta = currentUser ? (currentUser.user_metadata || {}) : {};
    const userUname = userMeta.username || (userEmail ? userEmail.split('@')[0] : '');

    // Save verified session strictly scoped to the user
    verifiedOrderSession = {
        userEmail: userEmail,
        username: userUname,
        orderId: orderId,
        paymentId: paymentId,
        plan: plan,
        tier: planTier,
        donationAmount: donationAmount,
        retrievedKey: (verifiedOrderSession && verifiedOrderSession.orderId === orderId) ? verifiedOrderSession.retrievedKey : null
    };

    try {
        // Clear old un-scoped key
        sessionStorage.removeItem('pc_verified_order');
        if (userEmail) {
            sessionStorage.setItem(`pc_verified_order_${encodeURIComponent(userEmail)}`, JSON.stringify(verifiedOrderSession));
        }
    } catch (e) {
        console.warn("[PrivCloud] SessionStorage write warning:", e);
    }

    // Hide checkout form and show success box
    const checkoutForm = document.getElementById('checkout-interactive-form');
    const successBox = document.getElementById('license-success-box');
    const successTitle = document.getElementById('success-plan-title');
    const successDesc = document.getElementById('success-plan-desc');
    const metaOrderId = document.getElementById('meta-order-id');
    const metaPaymentId = document.getElementById('meta-payment-id');
    const metaPlanTier = document.getElementById('meta-plan-tier');
    const vault = document.getElementById('product-key-vault');
    const keyBtn = document.getElementById('btn-get-product-key');
    const keyTitle = document.getElementById('btn-key-title');
    const keyDesc = document.getElementById('btn-key-desc');

    if (checkoutForm) checkoutForm.style.display = 'none';
    if (successBox) successBox.style.display = 'block';

    if (metaOrderId) metaOrderId.textContent = `#${orderId}`;
    if (metaPaymentId) metaPaymentId.textContent = `#${paymentId}`;
    if (metaPlanTier) metaPlanTier.textContent = planTier;

    if (successTitle) {
        if (donationAmount > 0) {
            successTitle.innerHTML = `🤝 Thank You for Donating ₹${donationAmount.toLocaleString('en-IN')}!<br><span style="font-size: 1.15rem; font-weight: 700; color: #0284c7;">${plan.name} Activated!</span>`;
        } else {
            successTitle.textContent = `${plan.name} Activated!`;
        }
    }

    if (successDesc) {
        successDesc.innerHTML = `Your transaction was verified server-side. Your payment receipt and license confirmation have been sent to <strong>${userEmail || 'your email'}</strong>. Your installer and assigned product license key are permanently active below.`;
    }

    // Always display both the product installer download and its product key!
    if (verifiedOrderSession.retrievedKey) {
        const keyDisplay = document.getElementById('display-license-key');
        const tierBadge = document.getElementById('vault-tier-badge');
        if (keyDisplay) keyDisplay.textContent = verifiedOrderSession.retrievedKey;
        if (tierBadge) tierBadge.textContent = planTier;
        if (vault) vault.style.display = 'block';
        if (keyBtn) keyBtn.classList.add('retrieved');
        if (keyTitle) keyTitle.textContent = 'Key Retrieved ✅';
        if (keyDesc) keyDesc.textContent = `Assigned key: ${verifiedOrderSession.retrievedKey}`;

        const downloadCertBtn = document.getElementById('btn-download-cert');
        if (downloadCertBtn) {
            downloadCertBtn.onclick = () => downloadLicenseCertificate(plan.name, verifiedOrderSession.retrievedKey, paymentId, donationAmount);
        }
    } else {
        // Vault is always displayed, and we automatically retrieve/generate the product key
        if (vault) vault.style.display = 'block';
        const keyDisplay = document.getElementById('display-license-key');
        if (keyDisplay) keyDisplay.textContent = 'GENERATING PRODUCT KEY...';
        handleGetProductKey();
    }

    // Persist verified customer info for Live Dev Team Chat
    const customerDisplayName = userMeta.full_name || userMeta.name || userUname || (userEmail ? userEmail.split('@')[0] : 'Customer');
    const isPaidPlan = !plan.isFree && !(planTier || '').toLowerCase().includes('trial');
    const normalizedTier = isPaidPlan 
        ? ((planTier || '').toLowerCase().includes('pro') ? 'pro' : 'basic')
        : 'trial';
    try {
        localStorage.setItem('support_user_tier', normalizedTier);
        if (userEmail) localStorage.setItem('support_customer_email', userEmail);
        if (customerDisplayName) localStorage.setItem('support_customer_name', customerDisplayName);
        localStorage.setItem('support_last_order_id', orderId);
        localStorage.setItem('support_last_payment_id', paymentId);
    } catch (_) {}

    // Update Dev Team Chat Card based on purchased tier
    updateDevChatCard(normalizedTier, plan.name, orderId);
}

/**
 * 1. Download Product Action — downloads the product using its Supabase URL
 */
async function handleDownloadProduct() {
    const btn = document.getElementById('btn-download-product');
    const originalOpacity = btn.style.opacity;
    
    try {
        btn.disabled = true;
        btn.style.opacity = '0.75';
        showFulfillmentAlert('info', '⏳ Generating authorized product download link...');

        let downloadUrl = 'https://qrxjyvezlotjwggtgoqe.supabase.co/storage/v1/object/public/assets/PrivCloud_Setup.exe';
        let filename = 'PrivCloud_Setup.exe';
        let filesize = '37 MB';

        try {
            const orderId = verifiedOrderSession ? verifiedOrderSession.orderId : '';
            const res = await fetch(resolveApiUrl(`/api/payment/download-product?order_id=${encodeURIComponent(orderId)}`));
            if (res.ok) {
                const data = await res.json();
                if (data && data.download_url) {
                    downloadUrl = data.download_url;
                    filename = data.filename || filename;
                    filesize = data.filesize_approx || filesize;
                }
            }
        } catch (apiErr) {
            console.warn("[PrivCloud] /api/payment/download-product notice:", apiErr);
        }

        // Initiate browser file download
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showFulfillmentAlert('success', `⬇️ Download started for <strong>${filename}</strong> (${filesize}). Check your browser downloads.`);
    } catch (err) {
        showFulfillmentAlert('error', `❌ Download failed: ${err.message}`);
    } finally {
        btn.disabled = false;
        btn.style.opacity = originalOpacity || '1';
    }
}

/**
 * 2. Get Product Key Action — retrieve a product key from Supabase
 */
async function handleGetProductKey() {
    if (!verifiedOrderSession) {
        showFulfillmentAlert('error', '⚠️ No verified payment session found. Please complete checkout first.');
        return;
    }

    const keyBtn = document.getElementById('btn-get-product-key');
    const keyTitle = document.getElementById('btn-key-title');
    const keyDesc = document.getElementById('btn-key-desc');
    const vault = document.getElementById('product-key-vault');
    const keyDisplay = document.getElementById('display-license-key');
    const tierBadge = document.getElementById('vault-tier-badge');

    // If key already fetched, toggle vault visibility
    if (verifiedOrderSession.retrievedKey) {
        if (vault) vault.style.display = 'block';
        if (keyDisplay) keyDisplay.textContent = verifiedOrderSession.retrievedKey;
        keyBtn.classList.add('retrieved');
        if (keyTitle) keyTitle.textContent = 'Key Retrieved ✅';
        if (keyDesc) keyDesc.textContent = `Assigned key: ${verifiedOrderSession.retrievedKey}`;
        return;
    }

    keyBtn.disabled = true;
    if (keyTitle) keyTitle.textContent = 'Retrieving Key...';
    if (keyDesc) keyDesc.textContent = 'Connecting to database...';
    showFulfillmentAlert('info', '⏳ Securely assigning your product key from Supabase...');

    try {
        const userEmail = currentUser ? currentUser.email : '';
        const plan = verifiedOrderSession.plan || PLANS_DATA[currentPlan];
        const tier = verifiedOrderSession.tier || (plan.name.includes('Pro') ? 'PRO' : (plan.name.includes('Basic') ? 'BASIC' : 'TRIAL'));

        const res = await fetch(resolveApiUrl('/api/payment/get-product-key'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: verifiedOrderSession.orderId,
                payment_id: verifiedOrderSession.paymentId,
                user_email: userEmail,
                plan_id: plan.id,
                tier: tier
            })
        });

        if (res.status === 405) {
            throw new Error('Please restart your Python server in the terminal (press Ctrl+C, then run python backend/app.py) so it loads the new Supabase endpoints.');
        }

        const data = await res.json();

        if (res.ok && data.success && data.key) {
            verifiedOrderSession.retrievedKey = data.key;
            try {
                if (currentUser && currentUser.email) {
                    sessionStorage.setItem(`pc_verified_order_${encodeURIComponent(currentUser.email.toLowerCase())}`, JSON.stringify(verifiedOrderSession));
                }
            } catch (storeErr) {}

            if (keyDisplay) keyDisplay.textContent = data.key;
            if (tierBadge) tierBadge.textContent = data.tier || tier;
            if (vault) vault.style.display = 'block';

            keyBtn.classList.add('retrieved');
            if (keyTitle) keyTitle.textContent = 'Key Retrieved ✅';
            if (keyDesc) keyDesc.textContent = `Assigned key: ${data.key}`;

            showFulfillmentAlert('success', `🔑 Product Key <strong>${data.key}</strong> retrieved and locked to your account!`);

            // Bind License Certificate Download with actual key
            const downloadCertBtn = document.getElementById('btn-download-cert');
            if (downloadCertBtn) {
                downloadCertBtn.onclick = () => downloadLicenseCertificate(plan.name, data.key, verifiedOrderSession.paymentId, verifiedOrderSession.donationAmount);
            }
        } else {
            throw new Error(data.message || 'Could not retrieve key from database.');
        }
    } catch (err) {
        showFulfillmentAlert('error', `❌ ${err.message}`);
        if (keyTitle) keyTitle.textContent = 'Retry Get Product Key';
        if (keyDesc) keyDesc.textContent = 'Click to try again';
    } finally {
        keyBtn.disabled = false;
    }
}

/**
 * 1-Click Copy Key to Clipboard
 */
function copyProductKey() {
    const keyDisplay = document.getElementById('display-license-key');
    const copyBtn = document.getElementById('btn-copy-key');
    const copyIcon = document.getElementById('copy-btn-icon');
    const copyText = document.getElementById('copy-btn-text');

    if (!keyDisplay || !keyDisplay.textContent || keyDisplay.textContent.includes('...')) return;

    const rawKey = keyDisplay.textContent.trim();

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rawKey).then(() => {
            if (copyBtn) copyBtn.classList.add('copied');
            if (copyIcon) copyIcon.textContent = '✅';
            if (copyText) copyText.textContent = 'Copied!';
            setTimeout(() => {
                if (copyBtn) copyBtn.classList.remove('copied');
                if (copyIcon) copyIcon.textContent = '📋';
                if (copyText) copyText.textContent = 'Copy';
            }, 2500);
        }).catch(() => {
            fallbackCopyText(rawKey);
        });
    } else {
        fallbackCopyText(rawKey);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        alert("Product Key copied to clipboard: " + text);
    } catch (err) {
        prompt("Copy your product key:", text);
    }
    document.body.removeChild(textArea);
}

/**
 * Show inline fulfillment alert banner
 */
function showFulfillmentAlert(type, message) {
    const alertEl = document.getElementById('fulfillment-alert');
    if (!alertEl) return;
    alertEl.className = `fulfillment-alert ${type}`;
    alertEl.innerHTML = `<span>${message}</span>`;
    alertEl.style.display = 'block';
}

/**
 * Restore verified session if user reloads page
 */
/**
 * Restore verified session if user reloads page (strictly isolated per authenticated user)
 */
async function restoreVerifiedOrderSession() {
    // 1. Purge legacy unscoped session key
    try {
        sessionStorage.removeItem('pc_verified_order');
    } catch (e) {}

    if (!currentUser || !currentUser.email) {
        return;
    }

    const userEmail = (currentUser.email || '').toLowerCase().trim();
    const userStorageKey = `pc_verified_order_${encodeURIComponent(userEmail)}`;

    // 2. Check user-scoped sessionStorage
    try {
        const saved = sessionStorage.getItem(userStorageKey);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.orderId && parsed.plan && (parsed.userEmail || '').toLowerCase() === userEmail) {
                verifiedOrderSession = parsed;
                onPaymentSuccess(parsed.plan, parsed.orderId, parsed.paymentId, parsed.donationAmount || 0);
                return;
            }
        }
    } catch (e) {
        console.warn("[PrivCloud] Session restore error:", e);
    }

    // 3. Fallback: Query backend for this specific user's active verified order in Supabase
    try {
        const headers = {};
        if (window.PrivCloudAuth && window.PrivCloudAuth.getSession) {
            const session = await window.PrivCloudAuth.getSession();
            if (session && session.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
        }
        const res = await fetch(resolveApiUrl(`/api/payment/my-license?user_email=${encodeURIComponent(userEmail)}`), { headers });
        if (res.ok) {
            const data = await res.json();
            if (data && data.success && data.has_license && data.order_id) {
                const tier = data.tier || 'TRIAL';
                const planId = (tier === 'PRO') ? '6b2f8c1a9d4e07bf' : ((tier === 'BASIC') ? '4d9e1a7b0c3f8e2a' : '9a8f10e7b9c2d4a6');
                const matchedPlan = PLANS_DATA[planId] || PLANS_DATA['9a8f10e7b9c2d4a6'];

                verifiedOrderSession = {
                    userEmail: userEmail,
                    orderId: data.order_id,
                    paymentId: data.payment_id || 'CONFIRMED',
                    plan: matchedPlan,
                    tier: tier,
                    donationAmount: 0,
                    retrievedKey: data.key || null
                };

                try {
                    sessionStorage.setItem(userStorageKey, JSON.stringify(verifiedOrderSession));
                } catch (storeErr) {}

                onPaymentSuccess(matchedPlan, data.order_id, data.payment_id || 'CONFIRMED', 0);
            }
        }
    } catch (apiErr) {
        console.warn("[PrivCloud] /api/payment/my-license notice:", apiErr);
    }
}

/**
 * Reset order session to allow user to order for another PC or pick another plan
 */
function resetOrderSession() {
    if (currentUser && currentUser.email) {
        try {
            sessionStorage.removeItem(`pc_verified_order_${encodeURIComponent(currentUser.email.toLowerCase())}`);
        } catch (e) {}
    }
    try {
        sessionStorage.removeItem('pc_verified_order');
    } catch (e) {}
    verifiedOrderSession = null;

    const successBox = document.getElementById('license-success-box');
    const checkoutForm = document.getElementById('checkout-interactive-form');
    const vault = document.getElementById('product-key-vault');
    const alertEl = document.getElementById('fulfillment-alert');

    if (successBox) successBox.style.display = 'none';
    if (vault) vault.style.display = 'none';
    if (alertEl) alertEl.style.display = 'none';
    if (checkoutForm) checkoutForm.style.display = 'block';

    renderPlan(currentPlan);
}

/**
 * Download License Certificate text file
 */
function downloadLicenseCertificate(planName, licenseKey, paymentReference, donationAmount = 0) {
    const userEmail = currentUser ? currentUser.email : 'user@privcloud.local';
    const donationLine = donationAmount > 0 ? `Optional Community Contribution: ₹${donationAmount.toLocaleString('en-IN')}\n` : '';
    const content = `========================================================
             PRIVCLOUD LICENSE CERTIFICATE
========================================================

Product: ${planName}
Issued To: ${userEmail}
Issued At: ${new Date().toISOString()}
Product Key: ${licenseKey}
${donationLine}Payment Reference: ${paymentReference || 'N/A'}

STATUS: ACTIVE & VERIFIED

QUICK START INSTRUCTIONS:
1. Run PrivCloud_Setup.exe on your Windows PC.
2. Launch Settings.bat from your desktop dashboard.
3. Paste the Product Key above into the Activation Prompt.
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
 * Update Dev Team Chat Card UI after successful payment
 */
function updateDevChatCard(tier, planName, orderId) {
    const card = document.getElementById('dev-chat-card');
    const avatar = document.getElementById('dev-card-avatar');
    const title = document.getElementById('dev-card-title');
    const badge = document.getElementById('dev-chat-tier-badge');
    const desc = document.getElementById('dev-card-desc');
    const startBtn = document.getElementById('btn-start-dev-chat');

    if (!card) return;

    if (tier === 'pro') {
        card.classList.add('tier-pro');
        if (avatar) {
            avatar.textContent = '👑';
            avatar.style.background = 'linear-gradient(135deg, #0f172a, #0284c7)';
            avatar.style.boxShadow = '0 2px 10px rgba(2, 132, 199, 0.3)';
        }
        if (title) title.innerHTML = `<span>Direct Engineering VIP Priority Access</span>`;
        if (badge) {
            badge.textContent = '👑 PRO VIP PRIORITY ACTIVE';
            badge.style.background = 'rgba(245, 158, 11, 0.12)';
            badge.style.color = '#d97706';
            badge.style.border = '1px solid rgba(245, 158, 11, 0.3)';
        }
        if (desc) {
            desc.innerHTML = `Your <strong>Pro VIP Lifetime License</strong> entitles you to top-priority queueing directly with our senior core engineering team for personal cloud setup, 4K media streaming, and remote HTTPS tunnel configuration.`;
        }
        if (startBtn) {
            startBtn.style.display = 'inline-flex';
            startBtn.className = 'btn-dev-chat-primary';
            startBtn.innerHTML = `<span>🤖 Open AI Assistant</span> <span>➔</span>`;
            startBtn.onclick = () => {
                if (window.PrivCloudChatbot && window.PrivCloudChatbot.openAiChat) {
                    window.PrivCloudChatbot.openAiChat();
                }
            };
        }
    } else if (tier === 'basic') {
        card.classList.remove('tier-pro');
        if (avatar) {
            avatar.textContent = '🤖';
            avatar.style.background = '#0284c7';
            avatar.style.boxShadow = '0 2px 8px rgba(2, 132, 199, 0.3)';
        }
        if (title) title.innerHTML = `<span>PrivCloud Assistant & Support</span>`;
        if (badge) {
            badge.textContent = '⭐ BASIC LICENSE ACTIVE';
            badge.style.background = 'rgba(2, 132, 199, 0.12)';
            badge.style.color = '#0284c7';
            badge.style.border = 'none';
        }
        if (desc) {
            desc.innerHTML = `Need help with your Windows personal cloud node, drive mounting, or license verification? Use our 24/7 AI Assistant or contact our engineering team.`;
        }
        if (startBtn) {
            startBtn.style.display = 'inline-flex';
            startBtn.className = 'btn-dev-chat-primary';
            startBtn.innerHTML = `<span>🤖 Open AI Assistant</span> <span>➔</span>`;
            startBtn.onclick = () => {
                if (window.PrivCloudChatbot && window.PrivCloudChatbot.openAiChat) {
                    window.PrivCloudChatbot.openAiChat();
                }
            };
        }
    } else {
        // Free Trial / Non-paying tier
        card.classList.remove('tier-pro');
        if (avatar) {
            avatar.textContent = '🔒';
            avatar.style.background = '#64748b';
            avatar.style.boxShadow = '0 2px 8px rgba(100, 116, 139, 0.2)';
        }
        if (title) title.innerHTML = `<span>PrivCloud Support (Basic & Pro)</span>`;
        if (badge) {
            badge.textContent = '🔒 BASIC / PRO REQUIRED';
            badge.style.background = 'rgba(100, 116, 139, 0.12)';
            badge.style.color = '#475569';
            badge.style.border = '1px solid rgba(100, 116, 139, 0.25)';
        }
        if (desc) {
            desc.innerHTML = `Direct assistance is reserved exclusively for customers on the <strong>Basic Edition</strong> or <strong>Pro VIP</strong> plan. Upgrade anytime to unlock personal cloud features.`;
        }
        if (startBtn) {
            startBtn.style.display = 'inline-flex';
            startBtn.className = 'btn-dev-chat-primary';
            startBtn.innerHTML = `<span>⭐ Upgrade to Basic or Pro Plan</span> <span>➔</span>`;
            startBtn.onclick = () => {
                const form = document.getElementById('checkout-interactive-form');
                const successBox = document.getElementById('license-success-box');
                if (form) form.style.display = 'block';
                if (successBox) successBox.style.display = 'none';
                switchPlanTab('4d9e1a7b0c3f8e2a');
            };
        }
    }
}

/**
 * Open AI Assistant Widget
 */
function openCustomerSupportChat() {
    if (window.PrivCloudChatbot && window.PrivCloudChatbot.openAiChat) {
        window.PrivCloudChatbot.openAiChat();
    }
}

function closeCustomerSupportChat() {
    const modal = document.getElementById('dev-support-chat-modal');
    if (modal) modal.style.display = 'none';
}

function openFullscreenSupport() {
    if (window.PrivCloudChatbot && window.PrivCloudChatbot.openAiChat) {
        window.PrivCloudChatbot.openAiChat();
    } else {
        window.location.href = "mailto:privcloud0@gmail.com";
    }
}

// Expose globally
window.openCustomerSupport = openCustomerSupportChat;
window.openSupportChatWidget = openCustomerSupportChat;
window.openCustomerSupportChat = openCustomerSupportChat;
window.closeCustomerSupportChat = closeCustomerSupportChat;
window.openFullscreenSupport = openFullscreenSupport;


