 document.addEventListener('DOMContentLoaded', function() {
        const vipForm = document.getElementById('vipForm');
        
        if (vipForm) {
            vipForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                try {
                    // Собираем данные формы
                    const formData = new FormData(vipForm);
                    const params = new URLSearchParams(formData);
                    
                    // Отправляем запрос
                    const response = await fetch('/admin/add-vip', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: params
                    });
                    
                    // Обрабатываем ответ
                    const result = await response.json();
                    
                    // Показываем toast-уведомление
                    if (result.success) {
                        document.getElementById('successToastMessage').textContent = result.message;
                        const successToast = new bootstrap.Toast(document.getElementById('successToast'));
                        successToast.show();
                    } else {
                        document.getElementById('errorToastMessage').textContent = 'An error occurred!';
                        const errorToast = new bootstrap.Toast(document.getElementById('errorToast'));
                        errorToast.show();
                    }
                    
                    // Перезагружаем страницу через 2 секунды
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                    
                } catch (error) {
                    console.error('Error:', error);
                    document.getElementById('errorToastMessage').textContent = 'Error creating subscription!';
                    const errorToast = new bootstrap.Toast(document.getElementById('errorToast'));
                    errorToast.show();
                }
            });
        }
    });