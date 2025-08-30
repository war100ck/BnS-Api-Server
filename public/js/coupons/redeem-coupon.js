// /public/js/redeem-coupon.js

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('redeemForm');
    const resultDiv = document.getElementById('result');
    
    if (!form) {
        console.error('Форма redeemForm не найдена!');
        return;
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div class="alert alert-info d-flex align-items-center"><i class="fas fa-spinner fa-spin me-2"></i> Processing...</div>';
        
        try {
            const response = await fetch('/api/coupon/redeem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                let rewardsHtml = '';
                if (result.rewards && result.rewards.length > 0) {
                    rewardsHtml = `
                        <h6>Rewards:</h6>
                        <div class="list-group">
                            ${result.rewards.map(reward => `
                                <div class="list-group-item">
                                    <strong>${reward.rewardName || 'Item'}</strong> - 
                                    Quantity: ${reward.quantity}
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
                
                resultDiv.innerHTML = `
                    <div class="alert alert-success">
                        <h6 class="d-flex align-items-center"><i class="fas fa-check-circle me-2"></i> Success!</h6>
                        <p>${result.message}</p>
                        ${rewardsHtml}
                    </div>
                `;
                
                // Очищаем форму после успешного погашения
                form.reset();
                
            } else {
                resultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <h6 class="d-flex align-items-center"><i class="fas fa-exclamation-triangle me-2"></i> Error</h6>
                        <p>${result.error}</p>
                    </div>
                `;
            }
        } catch (error) {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h6 class="d-flex align-items-center"><i class="fas fa-exclamation-triangle me-2"></i> Network Error</h6>
                    <p>Please check your connection and try again.</p>
                </div>
            `;
        }
    });
});