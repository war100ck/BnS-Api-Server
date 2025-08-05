document.addEventListener('DOMContentLoaded', function() {
    // Check for active restart timer on page load
    checkRestartTimer();

    // Refresh button functionality
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            // Update last updated time immediately
            document.getElementById('lastUpdatedTime').textContent = new Date().toLocaleString();
            
            // Show loading indicator
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Refreshing';
            
            // Check timer status before reload
            const timerEnd = localStorage.getItem('restartTimerEnd');
            if (timerEnd) {
                localStorage.setItem('restartTimerEnd', timerEnd);
            }
            
            window.location.reload();
        });
    }

    // Settings button functionality
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettings);
    }

    // Common function for button actions
    function handlePromoAction(actionFunction, promoId) {
        const timerEnd = Date.now() + 180000; // 3 minutes in milliseconds
        localStorage.setItem('restartTimerEnd', timerEnd);
        actionFunction(promoId);
        updateRestartTimerDisplay(timerEnd);
    }

    // Stop Event button functionality
    document.querySelectorAll('.stop-event-btn').forEach(button => {
        button.addEventListener('click', function() {
            const promoId = this.getAttribute('data-promo-id');
            const promoName = this.closest('tr').querySelector('.promo-name').textContent;
            
            Swal.fire({
                title: `Stop Promotion #${promoId}?`,
                html: `
                    <div class="text-start">
                        <p>You are about to suspend promotion: <strong>${promoName}</strong></p>
                        <div class="alert alert-warning mt-3">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            This action will immediately prevent all users from participating in this promotion!
                        </div>
                        <div class="alert alert-danger mt-3">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>DO NOT perform any actions</strong> until PromotionStampSrv service restarts completely (about 3 minutes)!
                        </div>
                        <p class="mt-2">Are you sure you want to proceed?</p>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Stop Promotion',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#d33',
                focusCancel: true,
                backdrop: true
            }).then((result) => {
                if (result.isConfirmed) {
                    handlePromoAction(submitStopPromo, promoId);
                }
            });
        });
    });

    // Toggle auto renew button functionality
    document.querySelectorAll('.auto-renew-btn:not(.disabled-btn)').forEach(button => {
        button.addEventListener('click', function() {
            const promoId = this.getAttribute('data-promo-id');
            const currentState = this.getAttribute('data-auto-renew') === 'true';
            const promoName = this.closest('tr').querySelector('.promo-name').textContent;
            
            Swal.fire({
                title: `${currentState ? 'Disable' : 'Enable'} Auto Renewal?`,
                html: `
                    <div class="text-start">
                        <p>You are about to ${currentState ? 'disable' : 'enable'} auto renewal for promotion: <strong>${promoName}</strong></p>
                        <div class="alert ${currentState ? 'alert-info' : 'alert-success'} mt-3">
                            <i class="fas ${currentState ? 'fa-info-circle' : 'fa-check-circle'} me-2"></i>
                            ${currentState ? 
                                'Promotion will NOT automatically extend when it expires.' : 
                                'Promotion will automatically extend for 1 month when it expires.'}
                        </div>
                        <div class="alert alert-danger mt-3">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>Warning:</strong> Avoid any changes to promotions until service restart completes (approximately 3 minutes)!
                        </div>
                        <p class="mt-2">Are you sure you want to proceed?</p>
                    </div>
                `,
                icon: currentState ? 'info' : 'success',
                showCancelButton: true,
                confirmButtonText: currentState ? 'Disable Auto Renew' : 'Enable Auto Renew',
                cancelButtonText: 'Cancel',
                confirmButtonColor: currentState ? '#6c757d' : '#28a745',
                focusCancel: true,
                backdrop: true
            }).then((result) => {
                if (result.isConfirmed) {
                    handlePromoAction(submitToggleAutoRenew, promoId);
                }
            });
        });
    });

    // Extend promotion form handling
    document.querySelectorAll('.extend-promo-form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const promoId = this.querySelector('input[name="PromotionId"]').value;
            const promoName = this.closest('tr').querySelector('.promo-name').textContent;
            
            Swal.fire({
                title: `Extend Promotion #${promoId}?`,
                html: `
                    <div class="text-start">
                        <p>You are about to extend promotion: <strong>${promoName}</strong></p>
                        <div class="alert alert-success mt-3">
                        <i class="fas fa-calendar-plus me-2"></i>
                            Promotion will be extended by 1 month from today.
                        </div>
                        <div class="alert alert-danger mt-3">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>Important:</strong> Service will be restarting. Please wait 3 minutes before making additional changes!
                        </div>
                        <p class="mt-2">Are you sure you want to proceed?</p>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, Extend Promotion',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#28a745',
                focusCancel: true,
                backdrop: true
            }).then((result) => {
                if (result.isConfirmed) {
                    const timerEnd = Date.now() + 180000; // 3 minutes
                    localStorage.setItem('restartTimerEnd', timerEnd);
                    updateRestartTimerDisplay(timerEnd);
                    this.submit();
                }
            });
        });
    });

    // Submit functions
    function submitStopPromo(promoId) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/admin/promotions/update-suspend';
        
        const promoIdInput = document.createElement('input');
        promoIdInput.type = 'hidden';
        promoIdInput.name = 'PromotionId';
        promoIdInput.value = promoId;
        form.appendChild(promoIdInput);
        
        const isSuspendedInput = document.createElement('input');
        isSuspendedInput.type = 'hidden';
        isSuspendedInput.name = 'IsSuspended';
        isSuspendedInput.value = 'true';
        form.appendChild(isSuspendedInput);
        
        document.body.appendChild(form);
        form.submit();
    }

    function submitToggleAutoRenew(promoId) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/admin/promotions/toggle-auto-renew';
        
        const promoIdInput = document.createElement('input');
        promoIdInput.type = 'hidden';
        promoIdInput.name = 'PromotionId';
        promoIdInput.value = promoId;
        form.appendChild(promoIdInput);
        
        // Получаем текущее состояние из атрибута кнопки
        const currentState = document.querySelector(`.auto-renew-btn[data-promo-id="${promoId}"]`).getAttribute('data-auto-renew');
        const autoRenewInput = document.createElement('input');
        autoRenewInput.type = 'hidden';
        autoRenewInput.name = 'AutoRenew';
        autoRenewInput.value = currentState === 'true' ? 'false' : 'true'; // Инвертируем состояние
        form.appendChild(autoRenewInput);
        
        document.body.appendChild(form);
        form.submit();
    }

    // Timer functions
    function checkRestartTimer() {
        const timerEnd = localStorage.getItem('restartTimerEnd');
        const timerElement = document.getElementById('restartTimerStatus');
        
        if (!timerElement) return;

        // Check if service is stopped
        const serviceStatusElement = document.querySelector('.service-status');
        if (serviceStatusElement && serviceStatusElement.textContent.includes('Service Stopped')) {
            timerElement.textContent = 'Service Stopped';
            timerElement.className = 'badge bg-danger';
            return;
        }

        if (timerEnd) {
            const remaining = parseInt(timerEnd) - Date.now();
            if (remaining > 0) {
                updateRestartTimerDisplay(timerEnd);
            } else {
                localStorage.removeItem('restartTimerEnd');
                timerElement.textContent = 'Service Active';
                timerElement.className = 'badge bg-success';
            }
        } else {
            timerElement.textContent = 'Service Active';
            timerElement.className = 'badge bg-success';
        }
    }

    function updateRestartTimerDisplay(timerEnd) {
        const timerElement = document.getElementById('restartTimerStatus');
        if (!timerElement) return;

        const updateDisplay = () => {
            const now = Date.now();
            const remaining = parseInt(timerEnd) - now;

            if (remaining <= 0) {
                timerElement.textContent = 'Service Active';
                timerElement.className = 'badge bg-success';
                localStorage.removeItem('restartTimerEnd');
                return;
            }

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            
            timerElement.textContent = `Service Starting in ${minutes}m ${seconds}s`;
            timerElement.className = 'badge bg-warning text-dark';

            if (remaining > 0) {
                setTimeout(updateDisplay, 1000);
            }
        };

        updateDisplay();
    }
});

function showSettings() {
    Swal.fire({
        title: 'System Settings',
        html: `
            <div class="text-start">
                <div class="mb-3">
                    <label for="checkInterval" class="form-label">Auto-Renew Check Interval (hours):</label>
                    <select class="form-select" id="checkInterval">
                        <option value="1">1 hour</option>
                        <option value="3">3 hours</option>
                        <option value="6" selected>6 hours</option>
                        <option value="12">12 hours</option>
                        <option value="24">24 hours</option>
                    </select>
                </div>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    System will check for expired promotions with auto-renew enabled at this interval.
                </div>
            </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Save Settings',
        cancelButtonText: 'Cancel',
        focusCancel: true,
        didOpen: () => {
            const intervalBadge = document.getElementById('checkIntervalStatus');
            if (intervalBadge) {
                const currentInterval = parseInt(intervalBadge.textContent);
                document.getElementById('checkInterval').value = currentInterval;
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const interval = document.getElementById('checkInterval').value;
            
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/admin/promotions/update-settings';
            
            const intervalInput = document.createElement('input');
            intervalInput.type = 'hidden';
            intervalInput.name = 'checkIntervalHours';
            intervalInput.value = interval;
            form.appendChild(intervalInput);
            
            document.body.appendChild(form);
            form.submit();
        }
    });
}