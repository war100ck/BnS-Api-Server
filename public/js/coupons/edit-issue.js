document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('editIssueForm');
    
    if (!form) {
        console.error('Форма editIssueForm не найдена!');
        return;
    }
    
    // Получаем ID из URL
    const pathParts = window.location.pathname.split('/');
    const issueId = pathParts[pathParts.length - 2]; // предпоследняя часть пути
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch(`/admin/coupons/issue/${issueId}/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Issue updated successfully!');
                window.location.href = `/admin/coupons/issue/${issueId}`;
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Error updating issue: ' + error.message);
        }
    });
});