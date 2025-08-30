// Функция должна быть объявлена в ГЛОБАЛЬНОЙ области видимости
async function removeReward(rewardId) {
    if (!confirm('Are you sure you want to remove this reward?')) return;
    
    try {
        const response = await fetch('/admin/coupons/reward/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rewardId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Reward removed successfully!');
            window.location.reload();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        alert('Error removing reward: ' + error.message);
    }
}

// Обработчик формы (только для DOMContentLoaded)
document.addEventListener('DOMContentLoaded', function() {
    const addRewardForm = document.getElementById('addRewardForm');
    
    if (addRewardForm) {
        addRewardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const issueId = data.issueId;
                const response = await fetch(`/admin/coupons/issue/${issueId}/reward`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Reward added successfully!');
                    window.location.reload();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                alert('Error adding reward: ' + error.message);
            }
        });
    }
});