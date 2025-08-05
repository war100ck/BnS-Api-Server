 document.getElementById('addDepositForm').addEventListener('submit', async function(e) {
             e.preventDefault();
         
             const formData = new FormData(this);
             const data = Object.fromEntries(formData.entries());
             const submitBtn = this.querySelector('button[type="submit"]');
             const originalBtnText = submitBtn.innerHTML;
             
             try {
                 // Показываем индикатор загрузки
                 submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Processing...`;
                 submitBtn.disabled = true;
                 
                 const response = await axios.post('/add-deposit/process', data);
                 
                 if (response.data.totalAmount && response.data.totalBalance) {
                     updateTotals(response.data.totalAmount, response.data.totalBalance);
                     
                     // Отображаем красивый результат
                     if (response.data.resultPageContent) {
                         document.getElementById('result').innerHTML = `
                             <div class="card shadow-sm">
                                 <div class="card-header bg-white d-flex align-items-center">
                                     <i class="fas fa-list-check text-primary me-2"></i>
                                     <h5 class="mb-0">Deposit Results</h5>
                                 </div>
                                 <div class="card-body">
                                     ${response.data.resultPageContent}
                                 </div>
                             </div>
                         `;
                     }
                 }
                 
                 showToast('success', `Successfully added ${data.amount} Hangmoon Coins`);
                 this.reset();
                 
             } catch (error) {
                 const errorMsg = error.response?.data?.message || 'An error occurred while adding the deposit';
                 showToast('error', errorMsg);
                 console.error('Deposit error:', error);
             } finally {
                 // Восстанавливаем кнопку
                 submitBtn.innerHTML = originalBtnText;
                 submitBtn.disabled = false;
             }
         });
         
         // Валидация ввода суммы
         document.getElementById('amount').addEventListener('input', function() {
             const maxAmount = 9007199254740991;
             const value = parseFloat(this.value);
             
             if (isNaN(value)) return;
             
             if (value > maxAmount) {
                 this.value = maxAmount;
                 showToast('warning', `Maximum allowed value is ${maxAmount.toLocaleString()}`);
             }
         });
         
         // Функция показа toast-уведомлений
         function showToast(type, message) {
             const toastContainer = document.getElementById('toastContainer');
             
             // Создаем toast элемент
             const toastEl = document.createElement('div');
             toastEl.className = `toast show align-items-center text-white bg-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'danger'} border-0`;
             toastEl.role = 'alert';
             toastEl.ariaLive = 'assertive';
             toastEl.ariaAtomic = 'true';
             
             // Иконка в зависимости от типа уведомления
             const iconClass = type === 'success' ? 'fa-check-circle' : 
                              type === 'warning' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle';
             
             toastEl.innerHTML = `
                 <div class="d-flex">
                     <div class="toast-body">
                         <i class="fas ${iconClass} me-2"></i>
                         ${message}
                     </div>
                     <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                 </div>
             `;
             
             // Добавляем toast в контейнер
             toastContainer.appendChild(toastEl);
             
             // Автоматическое скрытие через 5 секунд
             setTimeout(() => {
                 toastEl.classList.remove('show');
                 setTimeout(() => toastEl.remove(), 150);
             }, 5000);
             
             // Обработчик закрытия
             toastEl.querySelector('.btn-close').addEventListener('click', () => {
                 toastEl.classList.remove('show');
                 setTimeout(() => toastEl.remove(), 150);
             });
         }
         
         // Обновление сумм на странице
         function updateTotals(totalAmount, totalBalance) {
             const amountElements = document.querySelectorAll('.card-body .fs-5');
             if (amountElements.length >= 2) {
                 amountElements[0].innerHTML = `${totalAmount} <img src="/images/money/NCoin.webp" alt="Hangmoon Coins" class="money-icon">`;
                 amountElements[1].innerHTML = `${totalBalance} <img src="/images/money/NCoin.webp" alt="Hangmoon Coins" class="money-icon">`;
             }
         }