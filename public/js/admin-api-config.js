 // Initialize toast
 const toastLiveExample = document.getElementById('liveToast');
 const toastTitle = document.getElementById('toastTitle');
 const toastMessage = document.getElementById('toastMessage');
 const toastIcon = document.getElementById('toastIcon');
 const toast = new bootstrap.Toast(toastLiveExample);

 // Функция для обновления бейджа "New"
 function updateNewBadge(hasNewLogs) {
 	const badge = document.querySelector('#tab-logs .badge');
 	if (hasNewLogs) {
 		if (!badge) {
 			const newBadge = document.createElement('span');
 			newBadge.className = 'badge bg-danger ms-1';
 			newBadge.textContent = 'New';
 			document.querySelector('#tab-logs').appendChild(newBadge);
 		}
 	} else {
 		if (badge) {
 			badge.remove();
 		}
 	}
 }

 // Обновление логов через AJAX
 document.getElementById('refreshLogs').addEventListener('click', function(e) {
 	e.preventDefault();

 	const btn = this;
 	btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Refreshing...';
 	btn.disabled = true;

 	fetch('/admin/apiconfig/refreshlogs?ajax=1')
 		.then(response => {
 			if (!response.ok) {
 				throw new Error('Network response was not ok');
 			}
 			return response.text();
 		})
 		.then(logs => {
 			const container = document.getElementById('logContainer');
 			const hasLogs = logs.trim() && logs !== "No log entries";

 			if (hasLogs) {
 				container.innerHTML = `<pre class="text-white mb-0">${logs}</pre>`;
 			} else {
 				container.innerHTML = '<div class="text-muted">No log entries</div>';
 			}

 			// Обновляем бейдж "New"
 			updateNewBadge(hasLogs);

 			// Show success toast
 			toastTitle.textContent = 'Success';
 			toastMessage.textContent = hasLogs ? 'Logs updated successfully' : 'No new log entries';
 			toastIcon.className = 'bi bi-check-circle-fill text-success me-2';
 			toast.show();

 			// Auto-scroll to bottom
 			container.scrollTop = container.scrollHeight;
 		})
 		.catch(err => {
 			console.error('Error refreshing logs:', err);

 			// Show error toast
 			toastTitle.textContent = 'Error';
 			toastMessage.textContent = 'Failed to update logs';
 			toastIcon.className = 'bi bi-exclamation-triangle-fill text-danger me-2';
 			toast.show();
 		})
 		.finally(() => {
 			btn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i> Refresh';
 			btn.disabled = false;
 		});
 });

 // Очистка логов через AJAX
 document.getElementById('clearLogs').addEventListener('click', function(e) {
 	e.preventDefault();

 	if (!confirm('Are you sure you want to clear all logs?')) {
 		return;
 	}

 	const btn = this;
 	btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Clearing...';
 	btn.disabled = true;

 	fetch('/admin/apiconfig/clearlogs', {
 			method: 'POST',
 			headers: {
 				'Content-Type': 'application/x-www-form-urlencoded',
 			},
 			body: 'ajax=1'
 		})
 		.then(response => {
 			if (!response.ok) {
 				throw new Error('Network response was not ok');
 			}
 			return response.text();
 		})
 		.then(() => {
 			const container = document.getElementById('logContainer');
 			container.innerHTML = '<div class="text-muted">No log entries</div>';

 			// Убираем бейдж "New"
 			updateNewBadge(false);

 			// Show success toast
 			toastTitle.textContent = 'Success';
 			toastMessage.textContent = 'Logs cleared successfully';
 			toastIcon.className = 'bi bi-check-circle-fill text-success me-2';
 			toast.show();
 		})
 		.catch(err => {
 			console.error('Error clearing logs:', err);

 			// Show error toast
 			toastTitle.textContent = 'Error';
 			toastMessage.textContent = 'Failed to clear logs';
 			toastIcon.className = 'bi bi-exclamation-triangle-fill text-danger me-2';
 			toast.show();
 		})
 		.finally(() => {
 			btn.innerHTML = '<i class="bi bi-trash me-1"></i> Clear Logs';
 			btn.disabled = false;
 		});
 });

 // Convert checkboxes to proper true/false values before form submission
 document.querySelectorAll('form').forEach(form => {
 	form.addEventListener('submit', function() {
 		this.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
 			const hiddenInput = document.createElement('input');
 			hiddenInput.type = 'hidden';
 			hiddenInput.name = checkbox.name;
 			hiddenInput.value = checkbox.checked ? 'true' : 'false';
 			checkbox.replaceWith(hiddenInput);
 		});
 	});
 });

 // Auto-scroll logs to bottom on page load
 const logContainer = document.getElementById('logContainer');
 if (logContainer) {
 	logContainer.scrollTop = logContainer.scrollHeight;
 }

 // Инициализация бейджа "New" при загрузке страницы
 document.addEventListener('DOMContentLoaded', function() {
 	const initialLogs = document.getElementById('logContainer').textContent.trim();
 	const hasInitialLogs = initialLogs && initialLogs !== "No log entries";
 	updateNewBadge(hasInitialLogs);
 });

 // Рестарт сервера
 document.getElementById('restartServer').addEventListener('click', function(e) {
 	e.preventDefault();

 	if (!confirm('WARNING: This will restart the server. Are you sure?')) {
 		return;
 	}

 	const btn = this;
 	btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Restarting...';
 	btn.disabled = true;

 	fetch('/admin/server/restart', {
 			method: 'POST',
 			headers: {
 				'Content-Type': 'application/x-www-form-urlencoded',
 			},
 			body: 'ajax=1'
 		})
 		.then(response => {
 			if (!response.ok) {
 				throw new Error('Network response was not ok');
 			}
 			return response.text();
 		})
 		.then(() => {
 			// Show success toast
 			toastTitle.textContent = 'Success';
 			toastMessage.textContent = 'Server restart initiated';
 			toastIcon.className = 'bi bi-check-circle-fill text-success me-2';
 			toast.show();

 			// Disconnect and try to reconnect
 			setTimeout(() => {
 				window.location.reload();
 			}, 3000);
 		})
 		.catch(err => {
 			console.error('Error restarting server:', err);

 			// Show error toast
 			toastTitle.textContent = 'Error';
 			toastMessage.textContent = 'Failed to restart server';
 			toastIcon.className = 'bi bi-exclamation-triangle-fill text-danger me-2';
 			toast.show();
 		})
 		.finally(() => {
 			btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Restart Api Server';
 			btn.disabled = false;
 		});
 });