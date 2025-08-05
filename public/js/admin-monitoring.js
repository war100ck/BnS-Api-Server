// admin-monitoring.js
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация переменных
    const isEnvDisabled = typeof envBotEnabled !== 'undefined' ? !envBotEnabled : false;

    // Загрузка текущих настроек
    async function loadSettings() {
        try {
            const response = await fetch('/admin/discord/settings');
            if (response.ok) {
                const settings = await response.json();
                document.getElementById('botToken').value = settings.botToken || '';
                document.getElementById('statusChannel').value = settings.statusChannelId || '';
                document.getElementById('autoUpdates').checked = settings.autoUpdates || false;
                document.getElementById('updateInterval').value = settings.updateInterval || 5;
                
                if (isEnvDisabled) {
                    document.getElementById('botEnabled').checked = false;
                    document.getElementById('botEnabled').disabled = true;
                    updateBotStatus('disabled');
                } else {
                    document.getElementById('botEnabled').checked = settings.botEnabled || false;
                    updateBotStatus(settings.botEnabled ? 'online' : 'offline');
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            updateBotStatus('error');
        }
    }

    // Переключение видимости токена
    document.getElementById('toggleTokenVisibility').addEventListener('click', function() {
        const tokenInput = document.getElementById('botToken');
        const icon = this.querySelector('i');
        if (tokenInput.type === 'password') {
            tokenInput.type = 'text';
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
        } else {
            tokenInput.type = 'password';
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
        }
    });

    // Обработка формы
    document.getElementById('discordBotForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Saving...';
        updateBotStatus('loading');
        
        try {
            const data = {
                botToken: document.getElementById('botToken').value,
                statusChannelId: document.getElementById('statusChannel').value,
                autoUpdates: document.getElementById('autoUpdates').checked,
                updateInterval: parseInt(document.getElementById('updateInterval').value) || 5,
                enabled: document.getElementById('botEnabled').checked
            };
            
            const response = await fetch('/admin/discord/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            if (response.ok) {
                showToast('Settings saved successfully!', 'success');
                updateBotStatus(data.enabled ? 'online' : 'offline');
            } else {
                showToast(`Error: ${result.error || 'Unknown error'}`, 'error');
                updateBotStatus('error');
            }
        } catch (error) {
            showToast('Error saving settings: ' + error.message, 'error');
            updateBotStatus('error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-save me-1"></i> Save Settings';
        }
    });

    // Тестирование бота
    document.getElementById('testBotBtn').addEventListener('click', async function() {
        const testBtn = document.getElementById('testBotBtn');
        const originalText = testBtn.innerHTML;
        testBtn.disabled = true;
        testBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Testing...';
        
        try {
            const response = await fetch('/admin/discord/test');
            const result = await response.json();
            
            if (response.ok) {
                showToast(result.message || 'Bot responded successfully!', 'success');
            } else {
                showToast(result.error || 'Unknown error occurred', 'error');
            }
        } catch (error) {
            showToast('Error during test: ' + error.message, 'error');
        } finally {
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="bi bi-lightning-charge me-1"></i> Test Connection';
        }
    });

    // Функция обновления статуса бота
    function updateBotStatus(status) {
        const statusElement = document.getElementById('botStatus');
        let badgeClass, statusText, icon;
        
        switch(status) {
            case 'online':
                badgeClass = 'bg-success';
                statusText = 'Online';
                icon = 'bi-check-circle-fill';
                break;
            case 'offline':
                badgeClass = 'bg-secondary';
                statusText = 'Offline';
                icon = 'bi-power';
                break;
            case 'loading':
                badgeClass = 'bg-info';
                statusText = 'Loading';
                icon = 'bi-arrow-repeat';
                break;
            case 'error':
                badgeClass = 'bg-danger';
                statusText = 'Error';
                icon = 'bi-exclamation-triangle-fill';
                break;
            case 'disabled':
                badgeClass = 'bg-danger';
                statusText = 'Disabled in ENV';
                icon = 'bi-lock-fill';
                break;
            default:
                badgeClass = 'bg-warning';
                statusText = 'Unknown';
                icon = 'bi-question-circle-fill';
        }
        
        statusElement.innerHTML = `
            <span class="badge ${badgeClass}">
                <i class="bi ${icon} me-1"></i>Status: ${statusText}
            </span>
        `;
    }

    // Универсальная функция для показа уведомлений
    function showToast(message, type) {
        const toastContainer = document.createElement('div');
        toastContainer.className = 'position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1100';
        
        const toast = document.createElement('div');
        toast.className = 'toast show align-items-center text-white bg-' + (type === 'success' ? 'success' : 'danger');
        toast.role = 'alert';
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        document.body.appendChild(toastContainer);
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toastContainer.remove(), 300);
        }, 5000);
        
        // Закрытие по клику
        toast.querySelector('button').addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toastContainer.remove(), 300);
        });
    }

    // Инициализация загрузки настроек
    loadSettings();
});