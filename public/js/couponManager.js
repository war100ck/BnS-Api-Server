// public/js/couponManager.js
class CouponManager {
    constructor() {
        this.userId = document.getElementById('profileData')?.dataset?.userId || '';
        this.userName = document.getElementById('profileData')?.dataset?.userName || '';
        this.animating = false;
        this.TRANSITION_MS = 500;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupInitialState();
    }

    bindEvents() {
        const btnCharacters = document.getElementById('btnCharacters');
        const btnPromoCode = document.getElementById('btnPromoCode');
        const couponForm = document.getElementById('couponForm');

        if (btnCharacters && btnPromoCode) {
            btnCharacters.addEventListener('click', () => this.showCharacters());
            btnPromoCode.addEventListener('click', () => this.showPromoCode());
        }

        if (couponForm) {
            couponForm.addEventListener('submit', (e) => this.handleCouponSubmit(e));
        }
    }

    setupInitialState() {
        const charactersSection = document.getElementById('charactersSection');
        const depositSection = document.getElementById('depositSection');
        
        if (charactersSection) charactersSection.classList.remove('section-hidden');
        if (depositSection) depositSection.classList.remove('section-hidden');
    }

    /* ===== Утилиты анимации ===== */
    animateShow(el) {
        return new Promise(resolve => {
            if (!el) return resolve();
            el.classList.remove('section-hidden');
            el.style.display = 'block';
            el.style.willChange = 'max-height, opacity';
            el.style.overflow = 'hidden';
            el.style.maxHeight = '0px';
            el.style.opacity = '0';
            el.style.transition = `max-height ${this.TRANSITION_MS}ms ease, opacity ${this.TRANSITION_MS}ms ease`;

            void el.offsetHeight;

            const target = el.scrollHeight || el.clientHeight || 0;
            el.style.maxHeight = target + 'px';
            el.style.opacity = '1';

            let done = false;
            const onEnd = (e) => {
                if (e.propertyName !== 'max-height') return;
                if (done) return;
                done = true;
                el.style.overflow = '';
                el.style.opacity = '';
                el.style.transition = '';
                el.style.willChange = '';
                el.removeEventListener('transitionend', onEnd);
                resolve();
            };
            el.addEventListener('transitionend', onEnd);

            setTimeout(() => {
                if (done) return;
                done = true;
                el.style.overflow = '';
                el.style.transition = '';
                el.style.willChange = '';
                resolve();
            }, this.TRANSITION_MS + 150);
        });
    }

    animateHide(el) {
        return new Promise(resolve => {
            if (!el) return resolve();
            if (window.getComputedStyle(el).display === 'none' || el.classList.contains('section-hidden')) {
                el.classList.add('section-hidden');
                el.style.display = 'none';
                return resolve();
            }

            el.style.willChange = 'max-height, opacity';
            el.style.overflow = 'hidden';
            const current = el.scrollHeight || el.clientHeight || 0;
            el.style.maxHeight = current + 'px';
            el.style.opacity = '1';
            el.style.transition = `max-height ${this.TRANSITION_MS}ms ease, opacity ${this.TRANSITION_MS}ms ease`;

            void el.offsetHeight;

            el.style.maxHeight = '0px';
            el.style.opacity = '0';

            let done = false;
            const onEnd = (e) => {
                if (e.propertyName !== 'max-height') return;
                if (done) return;
                done = true;
                el.classList.add('section-hidden');
                el.style.display = 'none';
                el.style.overflow = '';
                el.style.maxHeight = '';
                el.style.opacity = '';
                el.style.transition = '';
                el.style.willChange = '';
                el.removeEventListener('transitionend', onEnd);
                resolve();
            };
            el.addEventListener('transitionend', onEnd);

            setTimeout(() => {
                if (done) return;
                done = true;
                el.classList.add('section-hidden');
                el.style.display = 'none';
                el.style.overflow = '';
                el.style.maxHeight = '';
                el.style.opacity = '';
                el.style.transition = '';
                el.style.willChange = '';
                resolve();
            }, this.TRANSITION_MS + 150);
        });
    }

    /* ===== Логика переключения вкладок ===== */
    async showCharacters() {
        if (this.animating) return;
        this.animating = true;
        
        const btnCharacters = document.getElementById('btnCharacters');
        const btnPromoCode = document.getElementById('btnPromoCode');
        const charactersSection = document.getElementById('charactersSection');
        const depositSection = document.getElementById('depositSection');
        const promoCodeSection = document.getElementById('promoCodeSection');
        const historySection = document.getElementById('historySection');

        if (btnCharacters) btnCharacters.disabled = true;
        if (btnPromoCode) btnPromoCode.disabled = true;

        if (btnCharacters) btnCharacters.classList.add('active');
        if (btnPromoCode) btnPromoCode.classList.remove('active');

        await Promise.all([
            this.animateHide(promoCodeSection),
            this.animateHide(historySection)
        ]);

        await Promise.all([
            this.animateShow(charactersSection),
            this.animateShow(depositSection)
        ]);

        if (btnCharacters) btnCharacters.disabled = false;
        if (btnPromoCode) btnPromoCode.disabled = false;
        this.animating = false;
    }

    async showPromoCode() {
        if (this.animating) return;
        this.animating = true;
        
        const btnCharacters = document.getElementById('btnCharacters');
        const btnPromoCode = document.getElementById('btnPromoCode');
        const charactersSection = document.getElementById('charactersSection');
        const depositSection = document.getElementById('depositSection');
        const promoCodeSection = document.getElementById('promoCodeSection');
        const historySection = document.getElementById('historySection');

        if (btnCharacters) btnCharacters.disabled = true;
        if (btnPromoCode) btnPromoCode.disabled = true;

        if (btnCharacters) btnCharacters.classList.remove('active');
        if (btnPromoCode) btnPromoCode.classList.add('active');

        await Promise.all([
            this.animateHide(charactersSection),
            this.animateHide(depositSection)
        ]);

        await this.loadActivationHistory();

        await Promise.all([
            this.animateShow(promoCodeSection),
            this.animateShow(historySection)
        ]);

        if (btnCharacters) btnCharacters.disabled = false;
        if (btnPromoCode) btnPromoCode.disabled = false;
        this.animating = false;
    }

    /* ===== Обработка формы купона ===== */
    async handleCouponSubmit(e) {
        e.preventDefault();

        const couponCodeInput = document.getElementById('couponCode');
        const couponCode = couponCodeInput?.value.trim() || '';

        if (!couponCode) {
            this.showNotification('Please enter a coupon code', 'error');
            return;
        }

        if (!this.userId) {
            this.showNotification('User ID not found', 'error');
            return;
        }

        try {
            const response = await fetch('/api/coupon/redeem', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    couponCode: couponCode, 
                    userId: this.userId 
                })
            });

            const result = await response.json();

            if (result.success) {
                let rewardsText = '';
                if (result.rewards && result.rewards.length > 0) {
                    rewardsText = result.rewards.map(reward =>
                        `${reward.rewardName || reward.RewardName || 'Item'} x${reward.quantity || reward.Quantity}`
                    ).join(', ');
                }

                this.showNotification(result.message, 'success', rewardsText);
                if (couponCodeInput) couponCodeInput.value = '';

                await this.reloadHistorySection();

                setTimeout(() => {
                    this.updateProfileData();
                }, 1000);
            } else {
                // Обработка специфических ошибок
                let errorMessage = result.error || result.message || 'Activation failed';
                
                if (errorMessage.includes('already redeemed')) {
                    errorMessage = 'You have already redeemed this coupon. Check your activation history.';
                } else if (errorMessage.includes('not found')) {
                    errorMessage = 'Coupon code not found or invalid.';
                } else if (errorMessage.includes('expired')) {
                    errorMessage = 'This coupon has expired.';
                } else if (errorMessage.includes('not yet available')) {
                    errorMessage = 'This coupon is not yet available for redemption.';
                } else if (errorMessage.includes('usage limit')) {
                    errorMessage = 'This coupon has reached its usage limit.';
                }
                
                this.showNotification(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Coupon activation error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        }
    }

    /* ===== Загрузка истории активаций ===== */
    async loadActivationHistory() {
        const couponHistory = document.getElementById('couponHistory');
        if (!couponHistory) return;

        try {
            if (!this.userId) {
                couponHistory.innerHTML = `
                    <div style="text-align: center; color: var(--text-secondary); padding: 20px;">
                        User ID not found
                    </div>
                `;
                return;
            }

            const response = await fetch(`/api/coupon/history?userId=${this.userId}&t=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();

            if (result.success && result.history && result.history.length > 0) {
                couponHistory.innerHTML = '';

                result.history.forEach(item => {
                    const itemWrap = document.createElement('div');
                    itemWrap.className = 'history-item';

                    const content = document.createElement('div');
                    content.className = 'history-content';

                    const codeDiv = document.createElement('div');
                    codeDiv.className = 'history-code';
                    codeDiv.textContent = item.CouponCode || '';

                    const dateDiv = document.createElement('div');
                    dateDiv.className = 'history-date';
                    const activated = item.ActivatedAt ? new Date(item.ActivatedAt) : null;
                    dateDiv.textContent = activated ? activated.toLocaleString() : '';

                    content.appendChild(codeDiv);
                    content.appendChild(dateDiv);

                    if (item.Rewards) {
                        const rewardsDiv = document.createElement('div');
                        rewardsDiv.className = 'history-rewards';
                        rewardsDiv.textContent = item.Rewards;
                        content.appendChild(rewardsDiv);
                    }

                    if (item.IssueName) {
                        const issueDiv = document.createElement('div');
                        issueDiv.className = 'history-issue';
                        issueDiv.textContent = item.IssueName;
                        content.appendChild(issueDiv);
                    }

                    itemWrap.appendChild(content);
                    couponHistory.appendChild(itemWrap);
                });

                if (result.history.length > 3) {
                    couponHistory.classList.add('scrollable');
                    couponHistory.scrollTop = 0;
                } else {
                    couponHistory.classList.remove('scrollable');
                    couponHistory.scrollTop = 0;
                }

            } else {
                couponHistory.innerHTML = `
                    <div style="text-align: center; color: var(--text-secondary); padding: 20px;">
                        ${this.escapeHtml(result.message || 'No activation history found')}
                    </div>
                `;
                couponHistory.classList.remove('scrollable');
            }
        } catch (error) {
            console.error('Error loading history:', error);
            couponHistory.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); padding: 20px;">
                    Error loading activation history: ${this.escapeHtml(error.message)}
                </div>
            `;
            couponHistory.classList.remove('scrollable');
        }
    }

    /* ===== Перезагрузка истории ===== */
    async reloadHistorySection() {
        await this.loadActivationHistory();
        
        const historySection = document.getElementById('historySection');
        const btnPromoCode = document.getElementById('btnPromoCode');
        
        if (btnPromoCode?.classList.contains('active')) {
            if (historySection?.classList.contains('section-hidden')) {
                await this.animateShow(historySection);
            } else if (historySection) {
                historySection.style.transition = '';
                historySection.style.maxHeight = '';
            }
        }
    }

    /* ===== Уведомления ===== */
    showNotification(message, type, rewards = '') {
        document.querySelectorAll('.coupon-notification').forEach(n => {
            n.style.animation = 'slideOut 0.35s forwards';
            setTimeout(() => { if (n.parentNode) n.remove(); }, 350);
        });

        const notification = document.createElement('div');
        notification.className = `coupon-notification ${type}`;

        const iconHtml = type === 'success' ? '<i class="fas fa-check-circle icon"></i>' : '<i class="fas fa-exclamation-circle icon"></i>';

        notification.innerHTML = `
            ${iconHtml}
            <div class="content">
                <div class="title">${this.escapeHtml(message)}</div>
                ${rewards ? `<div class="rewards">Rewards: ${this.escapeHtml(rewards)}</div>` : ''}
            </div>
            <button class="close-btn" aria-label="close">&times;</button>
        `;

        notification.querySelector('.close-btn').addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.35s forwards';
            setTimeout(() => { if (notification.parentNode) notification.remove(); }, 350);
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            if (!notification.parentNode) return;
            notification.style.animation = 'slideOut 0.35s forwards';
            setTimeout(() => { if (notification.parentNode) notification.remove(); }, 350);
        }, 5000);
    }

    /* ===== Вспомогательные функции ===== */
    escapeHtml(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    updateProfileData() {
        fetch(window.location.href, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Cache-Control': 'no-cache'
            }
        })
        .then(response => response.text())
        .then(html => {
            console.log('Profile data updated in background');
        })
        .catch(error => {
            console.error('Background update error:', error);
        });
    }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    window.couponManager = new CouponManager();
});