async function resetActivation(activationId) {
    if (!confirm('Are you sure you want to reset this activation?')) return;
    
    try {
        const response = await fetch('/admin/coupons/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ activationId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Activation reset successfully!');
            window.location.reload();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        alert('Error resetting activation: ' + error.message);
    }
}

// Дополнительные функции для страницы активаций (если понадобятся)
function initActivationsPage() {
    console.log('Activations page initialized');
}

// DOMContentLoaded не обязателен, но можно добавить для будущего расширения
document.addEventListener('DOMContentLoaded', initActivationsPage);