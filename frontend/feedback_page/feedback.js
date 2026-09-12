/**
 * PrivCloud — Community Feedback & Feature Roadmap Logic (feedback.js)
 * Verified Basic & Pro buyers submission gate, dual-tab filters, upvotes.
 */

(function () {
    'use strict';

    let currentTab = 'review'; // 'review' | 'suggestion'
    let currentCategory = 'all';
    let currentPlan = 'all';
    let currentSort = 'top';
    let feedbackItems = [];
    let verifiedBuyerData = null; // { eligible: true, email, plan_tier, plan_name, badge, is_vip }
    let selectedRating = 5;

    function resolveApiUrl(path) {
        if (typeof window !== 'undefined' && window.getPrivCloudApiUrl) {
            return window.getPrivCloudApiUrl(path);
        }
        const cfg = (typeof window !== 'undefined' && window.PRIVCLOUD_CONFIG) ? window.PRIVCLOUD_CONFIG : {};
        if (cfg.backendUrl) {
            const clean = path.startsWith('/') ? path : '/' + path;
            return `${cfg.backendUrl.replace(/\/+$/, '')}${clean}`;
        }
        if (typeof window !== 'undefined' && (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '5001'))) {
            return `http://127.0.0.1:5001${path.startsWith('/') ? path : '/' + path}`;
        }
        return path;
    }

    document.addEventListener('DOMContentLoaded', () => {
        initUI();
        fetchFeedback();
        checkCurrentUserEligibility();
    });

    function initUI() {
        // Tab Switching
        const tabReviews = document.getElementById('tab-reviews');
        const tabSuggestions = document.getElementById('tab-suggestions');

        if (tabReviews && tabSuggestions) {
            tabReviews.addEventListener('click', () => switchTab('review'));
            tabSuggestions.addEventListener('click', () => switchTab('suggestion'));
        }

        // Category Pills
        document.querySelectorAll('.category-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
                e.currentTarget.classList.add('active');
                currentCategory = e.currentTarget.getAttribute('data-category') || 'all';
                renderItems();
            });
        });

        // Plan & Sort Selects
        const filterPlan = document.getElementById('filter-plan');
        const filterSort = document.getElementById('filter-sort');

        if (filterPlan) {
            filterPlan.addEventListener('change', (e) => {
                currentPlan = e.target.value;
                renderItems();
            });
        }

        if (filterSort) {
            filterSort.addEventListener('change', (e) => {
                currentSort = e.target.value;
                fetchFeedback(); // re-fetch with backend sort
            });
        }

        // Open Submit Modal
        const btnOpenSubmit = document.getElementById('btn-open-submit');
        if (btnOpenSubmit) {
            btnOpenSubmit.addEventListener('click', handleOpenSubmit);
        }

        // Close Modals
        document.querySelectorAll('.modal-close-btn, .modal-backdrop').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target === el || e.target.classList.contains('modal-close-btn')) {
                    closeAllModals();
                }
            });
        });

        // Star Rating Selector in Modal
        const starSpans = document.querySelectorAll('.stars-selector span');
        starSpans.forEach(span => {
            span.addEventListener('click', (e) => {
                selectedRating = parseInt(e.currentTarget.getAttribute('data-star') || '5', 10);
                updateStarSelector(selectedRating);
            });
        });

        // Form Submit
        const feedbackForm = document.getElementById('feedback-submission-form');
        if (feedbackForm) {
            feedbackForm.addEventListener('submit', handleFeedbackSubmit);
        }

        // Form Type Switch
        const formTypeSelect = document.getElementById('form-feedback-type');
        if (formTypeSelect) {
            formTypeSelect.addEventListener('change', (e) => {
                const ratingGroup = document.getElementById('form-rating-group');
                if (ratingGroup) {
                    ratingGroup.style.display = e.target.value === 'review' ? 'block' : 'none';
                }
            });
        }
    }

    function switchTab(tab) {
        currentTab = tab;
        const tabReviews = document.getElementById('tab-reviews');
        const tabSuggestions = document.getElementById('tab-suggestions');

        if (tab === 'review') {
            tabReviews.classList.add('active');
            tabSuggestions.classList.remove('active');
        } else {
            tabSuggestions.classList.add('active');
            tabReviews.classList.remove('active');
        }

        renderItems();
    }

    async function fetchFeedback() {
        const container = document.getElementById('feedback-cards-container');
        if (!container) return;

        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #64748b;">
                <div style="font-size: 2rem; margin-bottom: 12px; animation: pulse 1.5s infinite;">⏳</div>
                <div style="font-size: 1.1rem; font-weight: 600;">Loading verified customer feedback...</div>
            </div>
        `;

        try {
            const queryParams = new URLSearchParams({
                sort: currentSort
            });
            const res = await fetch(resolveApiUrl(`/api/feedback?${queryParams.toString()}`));
            if (!res.ok) throw new Error('Failed to fetch community feedback');

            const data = await res.json();
            feedbackItems = data.items || [];

            // Update stats dynamically from database metrics
            const m = data.metrics || data.stats || {};
            const statRating = document.getElementById('stat-average-rating');
            const statReviews = document.getElementById('stat-total-reviews');
            const statSat = document.getElementById('stat-satisfaction-rate');
            const statSugg = document.getElementById('stat-active-suggestions');

            if (statRating) {
                statRating.textContent = (m.avg_rating != null && m.total_reviews > 0) ? m.avg_rating : '5.0';
            }
            if (statReviews) {
                statReviews.textContent = `${m.total_reviews || 0}`;
            }
            if (statSat) {
                statSat.textContent = `${m.satisfaction_pct != null ? m.satisfaction_pct : 100}%`;
            }
            if (statSugg) {
                statSugg.textContent = `${m.total_suggestions || 0} Active`;
            }

            renderItems();
        } catch (err) {
            console.error('[Feedback] Fetch error:', err);
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">
                    ❌ Unable to load feedback right now. Please refresh the page.
                </div>
            `;
        }
    }

    function renderItems() {
        const container = document.getElementById('feedback-cards-container');
        if (!container) return;

        // Filter items by currentTab, currentCategory, currentPlan
        let filtered = feedbackItems.filter(item => {
            if (item.feedback_type !== currentTab) return false;
            if (currentCategory !== 'all' && (item.category || '').toLowerCase() !== currentCategory.toLowerCase()) return false;
            if (currentPlan !== 'all' && (item.plan_tier || '').toLowerCase() !== currentPlan.toLowerCase()) return false;
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.7); border-radius: 20px; border: 1px dashed #cbd5e1;">
                    <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
                    <h3 style="font-size: 1.2rem; font-weight: 700; color: #0f172a; margin-bottom: 6px;">No entries match this filter</h3>
                    <p style="color: #64748b; font-size: 0.95rem;">Try selecting "All Categories" or "All Editions" to explore community feedback.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(item => {
            const isReview = item.feedback_type === 'review';
            const isPro = (item.plan_tier || '').toLowerCase() === 'pro';
            const badgeClass = isPro ? 'badge-verified-pro' : 'badge-verified-basic';
            const badgeText = isPro ? '👑 Verified Pro Buyer' : '⭐ Verified Basic Buyer';
            const initials = (item.user_name || 'Buyer').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            // Stars string
            let starsHtml = '';
            if (isReview && item.rating) {
                const fullStars = '★'.repeat(item.rating);
                const emptyStars = '☆'.repeat(5 - item.rating);
                starsHtml = `<div class="card-rating-stars">${fullStars}${emptyStars}</div>`;
            }

            // Status badge for suggestions
            let statusHtml = '';
            if (!isReview) {
                const status = (item.status || 'under_review').toLowerCase().replace(' ', '_');
                const statusLabel = (item.status || 'Under Review').replace('_', ' ');
                statusHtml = `<span class="badge-status status-${status}">${statusLabel}</span>`;
            }

            return `
                <div class="feedback-card" id="card-${item.id}">
                    <div class="card-header">
                        <div class="card-author-info">
                            <div class="author-avatar">${initials}</div>
                            <div class="author-name-group">
                                <span class="author-name">${escapeHtml(item.user_name || 'Verified Customer')}</span>
                                <span class="${badgeClass}">${badgeText}</span>
                            </div>
                        </div>
                        <span class="duration-tag">⏱️ ${escapeHtml(item.usage_duration || '2–4 weeks')}</span>
                    </div>

                    ${starsHtml}
                    ${statusHtml ? `<div style="margin-bottom: 10px;">${statusHtml}</div>` : ''}

                    <h4 class="card-title">${escapeHtml(item.title)}</h4>
                    <p class="card-content">${escapeHtml(item.content)}</p>

                    <div class="card-footer">
                        <span class="category-tag">📂 ${escapeHtml(item.category || 'General')}</span>
                        <button class="btn-helpful" onclick="window.upvoteFeedback('${item.id}')">
                            <span>👍</span>
                            <span id="helpful-count-${item.id}">${item.helpful_count || 0}</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Upvote feedback
    window.upvoteFeedback = async function (id) {
        try {
            const countEl = document.getElementById(`helpful-count-${id}`);
            if (countEl) {
                const current = parseInt(countEl.textContent || '0', 10);
                countEl.textContent = current + 1;
            }

            const res = await fetch(resolveApiUrl(`/api/feedback/${id}/helpful`), { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (countEl && data.helpful_count) {
                    countEl.textContent = data.helpful_count;
                }
            }
        } catch (err) {
            console.error('[Feedback] Upvote error:', err);
        }
    };

    // Check buyer eligibility from active session
    async function checkCurrentUserEligibility() {
        let userEmail = '';
        let userName = '';

        if (window.PrivCloudAuth && window.PrivCloudAuth.getSession) {
            const session = await window.PrivCloudAuth.getSession();
            if (session && session.user) {
                userEmail = session.user.email;
                userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || userEmail.split('@')[0];
            }
        }

        if (!userEmail) {
            // Check localStorage
            const savedUser = localStorage.getItem('privcloud_auth_user');
            if (savedUser) {
                try {
                    const parsed = JSON.parse(savedUser);
                    userEmail = parsed.email || '';
                    userName = parsed.fullName || parsed.username || '';
                } catch (e) {}
            }
        }

        if (!userEmail) {
            verifiedBuyerData = null;
            return;
        }

        try {
            const res = await fetch(resolveApiUrl(`/api/feedback/verify-eligibility?email=${encodeURIComponent(userEmail)}`));
            if (res.ok) {
                const data = await res.json();
                if (data.eligible) {
                    verifiedBuyerData = {
                        ...data,
                        userName: userName || data.userName || userEmail.split('@')[0]
                    };
                }
            }
        } catch (err) {
            console.warn('[Feedback] Verification check failed:', err);
        }
    }

    // Handle "Submit Review or Feature Idea"
    async function handleOpenSubmit() {
        // Re-check eligibility
        await checkCurrentUserEligibility();

        if (!verifiedBuyerData || !verifiedBuyerData.eligible) {
            // Show Friendly Lock Modal
            const lockModal = document.getElementById('modal-locked-notice');
            if (lockModal) lockModal.classList.add('is-open');
            return;
        }

        // Open Unlocked Submission Modal
        const submitModal = document.getElementById('modal-feedback-submission');
        if (submitModal) {
            const nameEl = document.getElementById('modal-user-name');
            const badgeEl = document.getElementById('modal-user-badge');
            if (nameEl) nameEl.textContent = verifiedBuyerData.userName || verifiedBuyerData.email;
            if (badgeEl) {
                badgeEl.className = verifiedBuyerData.plan_tier === 'pro' ? 'badge-verified-pro' : 'badge-verified-basic';
                badgeEl.textContent = verifiedBuyerData.badge || 'Verified Buyer';
            }
            submitModal.classList.add('is-open');
        }
    }

    function updateStarSelector(rating) {
        document.querySelectorAll('.stars-selector span').forEach(span => {
            const starNum = parseInt(span.getAttribute('data-star') || '0', 10);
            if (starNum <= rating) {
                span.classList.add('active');
            } else {
                span.classList.remove('active');
            }
        });
    }

    async function handleFeedbackSubmit(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-feedback');
        const originalText = submitBtn.innerHTML;

        if (!verifiedBuyerData || !verifiedBuyerData.email) {
            showToast('Please log in with your verified Basic or Pro account to submit feedback.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Publish to Community</span>';
            return;
        }

        const type = document.getElementById('form-feedback-type').value;
        const duration = document.getElementById('form-usage-duration').value;
        const category = document.getElementById('form-category').value;
        const title = document.getElementById('form-title').value;
        const content = document.getElementById('form-content').value;

        const payload = {
            user_email: verifiedBuyerData.email,
            user_name: verifiedBuyerData.userName || 'Verified Buyer',
            plan_tier: verifiedBuyerData.plan_tier || 'pro',
            feedback_type: type,
            rating: type === 'review' ? selectedRating : null,
            category: category,
            usage_duration: duration,
            title: title,
            content: content
        };

        try {
            const fbUrl = resolveApiUrl('/api/feedback');
            const res = await fetch(fbUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                closeAllModals();
                // Add to list and re-render
                feedbackItems.unshift(data.item);
                currentTab = type;
                switchTab(type);
                alert('🎉 Thank you! Your verified feedback has been published to the community feed.');
                e.target.reset();
            } else {
                alert(`❌ ${data.detail || data.error || 'Failed to submit feedback'}`);
            }
        } catch (err) {
            alert(`❌ Network error while submitting: ${err.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    function closeAllModals() {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('is-open'));
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

})();
