 async function deleteCoupon(couponId) {
            if (!confirm('Are you sure you want to delete this coupon?')) return;
            
            try {
                const response = await fetch('/admin/coupons/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ couponId })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Coupon deleted successfully!');
                    window.location.reload();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                alert('Error deleting coupon: ' + error.message);
            }
        }