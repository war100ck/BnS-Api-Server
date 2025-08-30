// /public/js/generate-coupons.js

document.addEventListener('DOMContentLoaded', function() {
    // Переключение между single/multiple
    document.querySelectorAll('input[name="generateType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('singleSection').style.display = 
                this.value === 'single' ? 'block' : 'none';
            document.getElementById('multipleSection').style.display = 
                this.value === 'multiple' ? 'block' : 'none';
            
            // Update required attributes
            if (this.value === 'single') {
                document.getElementById('couponCode').setAttribute('required', '');
                document.getElementById('count').removeAttribute('required');
            } else {
                document.getElementById('count').setAttribute('required', '');
                document.getElementById('couponCode').removeAttribute('required');
            }
        });
    });

    // Initialize required attributes on page load
    const initialType = document.querySelector('input[name="generateType"]:checked').value;
    if (initialType === 'single') {
        document.getElementById('couponCode').setAttribute('required', '');
    } else {
        document.getElementById('count').setAttribute('required', '');
    }
    
    document.getElementById('generateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch('/admin/coupons/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Coupons generated successfully!');
                window.location.href = `/admin/coupons/issue/${data.issueId}`;
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Error generating coupons: ' + error.message);
        }
    });
});