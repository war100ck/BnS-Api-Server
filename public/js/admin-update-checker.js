document.addEventListener('DOMContentLoaded', function() {
            const updateForm = document.querySelector('form[action="/admin/update"]');
            const progressContainer = document.getElementById('progressContainer');
            const progressBar = document.getElementById('updateProgress');
            const progressText = document.getElementById('progressText');
            const progressPercent = document.getElementById('progressPercent');
            const updateLogContainer = document.getElementById('updateLogContainer');
            const updateButton = document.getElementById('updateButton');
            const successAlert = document.getElementById('successAlert');
            const backupButton = document.getElementById('backupButton');
            
            // Обработчик кнопки Backup
            if (backupButton) {
                backupButton.addEventListener('click', async function() {
                    const { value: backupPath } = await Swal.fire({
                        title: 'Create Backup',
                        html: `
                            <div class="text-start mb-3">
                                <p>Please specify the folder where the backup will be saved:</p>
                                <p class="small text-muted">Example: C:/backups or /home/user/backups</p>
                            </div>
                        `,
                        input: 'text',
                        inputLabel: 'Backup folder path',
                        inputPlaceholder: 'Enter backup folder path...',
                        showCancelButton: true,
                        confirmButtonText: 'Create Backup',
                        cancelButtonText: 'Cancel',
                        inputValidator: (value) => {
                            if (!value) {
                                return 'You need to specify a path!';
                            }
                        }
                    });
                    
                    if (backupPath) {
                        Swal.fire({
                            title: 'Creating Backup',
                            html: 'Please wait while we create your backup...',
                            allowOutsideClick: false,
                            didOpen: () => {
                                Swal.showLoading();
                                
                                // Отправляем запрос на сервер для создания бэкапа
                                fetch('/admin/update/backup', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({ backupPath })
                                })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        Swal.fire({
                                            icon: 'success',
                                            title: 'Backup Created!',
                                            html: `
                                                <div class="text-start">
                                                    <p>Backup was successfully created at:</p>
                                                    <code class="d-block p-2 bg-light rounded">${data.path}</code>
                                                    <p class="mt-2 small text-muted">You can now safely proceed with the update.</p>
                                                </div>
                                            `,
                                            confirmButtonText: 'OK'
                                        });
                                    } else {
                                        Swal.fire({
                                            icon: 'error',
                                            title: 'Backup Failed',
                                            text: data.message,
                                            confirmButtonText: 'OK'
                                        });
                                    }
                                })
                                .catch(error => {
                                    Swal.fire({
                                        icon: 'error',
                                        title: 'Error',
                                        text: 'Failed to create backup: ' + error.message,
                                        confirmButtonText: 'OK'
                                    });
                                });
                            }
                        });
                    }
                });
            }
            
            // Обработчик формы обновления
            if (updateForm) {
                updateForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    
                    // Показываем прогресс-бар
                    progressContainer.classList.remove('d-none');
                    updateButton.disabled = true;
                    updateButton.innerHTML = '<i class="bi bi-download me-1"></i> Updating...';
                    
                    if (successAlert) {
                        successAlert.classList.add('d-none');
                    }
                    
                    // Создаем EventSource для получения событий с сервера
                    const eventSource = new EventSource('/admin/update/stream');
                    
                    eventSource.onmessage = function(event) {
                        const data = JSON.parse(event.data);
                        
                        if (data.type === 'progress') {
                            // Обновляем прогресс-бар
                            const percent = Math.round(data.current / data.total * 100);
                            progressBar.style.width = percent + '%';
                            progressPercent.textContent = percent + '%';
                            progressText.textContent = `Updating ${data.current} of ${data.total} files: ${data.file}`;
                            
                            // Добавляем лог
                            const logEntry = document.createElement('div');
                            logEntry.className = 'log-entry';
                            logEntry.innerHTML = `<span class="text-muted">[${new Date().toLocaleTimeString()}]</span> ${data.message}`;
                            updateLogContainer.appendChild(logEntry);
                            updateLogContainer.scrollTop = updateLogContainer.scrollHeight;
                        }
                        else if (data.type === 'complete') {
                            // Обновление завершено
                            progressBar.classList.remove('progress-bar-animated', 'progress-bar-striped');
                            progressBar.classList.add('bg-success');
                            progressText.textContent = 'Update completed successfully!';
                            progressPercent.textContent = '100%';
                            
                            const logEntry = document.createElement('div');
                            logEntry.className = 'log-entry text-success fw-bold';
                            logEntry.innerHTML = `[${new Date().toLocaleTimeString()}] Update completed successfully!`;
                            updateLogContainer.appendChild(logEntry);
                            updateLogContainer.scrollTop = updateLogContainer.scrollHeight;
                            
                            // Показываем сообщение об успехе
                            if (successAlert) {
                                successAlert.classList.remove('d-none');
                            }
                            
                            // Обновляем страницу через 3 секунды
                            setTimeout(() => {
                                window.location.reload();
                            }, 3000);
                            
                            eventSource.close();
                        }
                        else if (data.type === 'error') {
                            // Ошибка при обновлении
                            progressBar.classList.remove('progress-bar-animated', 'progress-bar-striped');
                            progressBar.classList.add('bg-danger');
                            progressText.textContent = 'Update failed!';
                            progressPercent.textContent = 'Error';
                            
                            const logEntry = document.createElement('div');
                            logEntry.className = 'log-entry text-danger fw-bold';
                            logEntry.innerHTML = `[${new Date().toLocaleTimeString()}] ERROR: ${data.message}`;
                            updateLogContainer.appendChild(logEntry);
                            updateLogContainer.scrollTop = updateLogContainer.scrollHeight;
                            
                            updateButton.disabled = false;
                            updateButton.innerHTML = '<i class="bi bi-download me-1"></i> Update';
                            
                            eventSource.close();
                        }
                    };
                    
                    // Отправляем форму
                    fetch('/admin/update', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams(new FormData(updateForm))
                    }).catch(err => {
                        console.error('Error:', err);
                    });
                });
            }
        });