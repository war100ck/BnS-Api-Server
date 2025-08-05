document.addEventListener('DOMContentLoaded', function() {
    // Проверка загрузки SweetAlert2
    if (typeof Swal === 'undefined') {
        console.error('SweetAlert2 is not loaded!');
        return;
    }

    // Иконки для уведомлений
    const icons = {
        success: '<i class="fas fa-check-circle fa-fw"></i>',
        error: '<i class="fas fa-times-circle fa-fw"></i>',
        warning: '<i class="fas fa-exclamation-triangle fa-fw"></i>',
        info: '<i class="fas fa-info-circle fa-fw"></i>',
        question: '<i class="fas fa-question-circle fa-fw"></i>'
    };

    // Функция для получения никнейма
    const getUsername = () => {
        const username = localStorage.getItem('username');
        return username || 'Guest';
    };

    // Форматирование суммы Velirs
    const formatVelirs = (num) => {
        return `<span class="velirs-value">${new Intl.NumberFormat('en-US').format(num)}</span> <span class="velirs-label">Velirs</span>`;
    };

    // Функция для создания качественной анимации конфетти
    const createConfettiAnimation = () => {
        const container = document.createElement('div');
        container.className = 'confetti-container';
        
        // Создаем 4 дубликата GIF для покрытия всего экрана
        const positions = [
            { top: 0, left: 0 },
            { top: 0, left: '50%' },
            { top: '50%', left: 0 },
            { top: '50%', left: '50%' }
        ];

        positions.forEach(pos => {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.top = pos.top;
            piece.style.left = pos.left;
            
            const img = document.createElement('img');
            img.src = '/images/backgrounds/confetti.gif';
            img.className = 'confetti-img';
            
            piece.appendChild(img);
            container.appendChild(piece);
        });

        document.body.appendChild(container);
        return container;
    };

    // Обработчики кнопок доната
    document.querySelectorAll('.donateButton').forEach(button => {
        button.addEventListener('click', async function(event) {
            event.preventDefault();

            const username = getUsername();
            if (username === 'Guest') {
                await Swal.fire({
                    title: `${icons.warning} Authorization Required`,
                    html: `<div class="swal-custom-content">Please sign in to complete your donation</div>`,
                    icon: 'warning',
                    confirmButtonText: 'OK',
                    width: 380,
                    background: '#2d3748',
                    color: '#fff',
                    allowOutsideClick: false
                });
                return;
            }

            const productName = this.getAttribute('data-name');
            const quantity = parseInt(this.getAttribute('data-amount')) || 0;
            const bonus = parseInt(this.getAttribute('data-bonus')) || 0;
            const price = parseFloat(this.getAttribute('data-price')) || 0;
            const productId = parseInt(this.getAttribute('data-id')) || 0;
            const totalAmount = quantity + bonus;

            // Окно подтверждения с никнеймом
            const { isConfirmed } = await Swal.fire({
                title: `${username}, Confirm Purchase`,
                html: `
                    <div class="swal-custom-content">
                        <div class="product-title">${productName}</div>
                        <div class="detail-row">
                            <span class="detail-label">Amount:</span>
                            <span class="detail-value">${formatVelirs(quantity)}</span>
                        </div>
                        ${bonus > 0 ? `
                        <div class="detail-row bonus">
                            <span class="detail-label">Bonus:</span>
                            <span class="detail-value">+${formatVelirs(bonus)}</span>
                        </div>
                        ` : ''}
                        <div class="divider"></div>
                        <div class="detail-row total">
                            <span class="detail-label">Total:</span>
                            <span class="detail-value">${formatVelirs(totalAmount)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Price:</span>
                            <span class="detail-value">$${price.toFixed(2)}</span>
                        </div>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Confirm',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#38a169',
                cancelButtonColor: '#e53e3e',
                width: 380,
                background: '#2d3748',
                color: '#fff',
                customClass: {
                    popup: 'swal-custom-popup',
                    title: 'swal-custom-title',
                    htmlContainer: 'swal-custom-html'
                },
                allowOutsideClick: false
            });

            if (!isConfirmed) return;

            // Окно загрузки
            Swal.fire({
                title: `${icons.info} Processing`,
                html: `<div class="swal-custom-content">Processing your purchase, ${username}...</div>`,
                width: 320,
                background: '#2d3748',
                color: '#fff',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                const response = await fetch('/donate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: username,
                        amount: totalAmount,
                        productName: productName,
                        price: price,
                        productId: productId,
                        bonus: bonus
                    })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    // Создаем анимацию конфетти
                    const confettiContainer = createConfettiAnimation();

                    // Таймер для автоматического удаления через 4 секунды
                    const confettiTimer = setTimeout(() => {
                        confettiContainer.style.opacity = '0';
                        setTimeout(() => {
                            if (document.body.contains(confettiContainer)) {
                                confettiContainer.remove();
                            }
                        }, 500);
                    }, 1000);

                    // Показываем окно успеха
                    await Swal.fire({
                        title: `${username}, Thank You!`,
html: `
    <div class="swal-custom-content">
        <div class="success-icon">
            <i class="fas fa-gift fa-2x"></i>
        </div>
        <div class="product-title">${productName}</div>
        <div class="detail-row">
            <span class="detail-label">Product Value:</span>
            <span class="detail-value">${formatVelirs(quantity)}</span>
        </div>
        <div class="detail-row bonus">
            <span class="detail-label">Bonus:</span>
            <span class="detail-value">+${formatVelirs(bonus)}</span>
        </div>
        <div class="divider"></div>
        <div class="detail-row total-received">
            <span class="detail-label">Received:</span>
            <span class="detail-value">${formatVelirs(totalAmount)}</span>
        </div>
        <div class="detail-row balance">
            <span class="detail-label">New Balance:</span>
            <span class="detail-value">${formatVelirs(result.newBalance)}</span>
        </div>
        <div class="transaction-id">
            Transaction ID: ${result.depositId}
        </div>
    </div>
`,
                        icon: 'success',
                        confirmButtonText: 'Done',
                        confirmButtonColor: '#38a169',
                        width: 380,
                        background: '#2d3748',
                        color: '#fff',
                        customClass: {
                            popup: 'swal-custom-popup success',
                            title: 'swal-custom-title',
                            htmlContainer: 'swal-custom-html'
                        },
                        allowOutsideClick: false,
                        willClose: () => {
                            clearTimeout(confettiTimer);
                            if (document.body.contains(confettiContainer)) {
                                confettiContainer.remove();
                            }
                        }
                    });

                    // Дополнительная проверка на случай если окно все еще открыто
                    if (document.body.contains(confettiContainer)) {
                        confettiContainer.remove();
                    }
                } else {
                    throw new Error(result.message || 'Transaction failed');
                }
            } catch (error) {
                await Swal.fire({
                    title: `${icons.error} Error`,
                    html: `<div class="swal-custom-content">${error.message}</div>`,
                    icon: 'error',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#e53e3e',
                    width: 380,
                    background: '#2d3748',
                    color: '#fff',
                    allowOutsideClick: false
                });
            }
        });
    });
});