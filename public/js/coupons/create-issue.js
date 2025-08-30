document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('createIssueForm');
    
    if (!form) {
        console.error('Форма createIssueForm не найдена!');
        return;
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch('/admin/coupons/issue/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Issue created successfully!');
                window.location.href = `/admin/coupons/issue/${result.issueId}`;
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Error creating issue: ' + error.message);
        }
    });
});