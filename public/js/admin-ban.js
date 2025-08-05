document.addEventListener('DOMContentLoaded', () => {
	const showToast = (message, type = 'success') => {
		const toastContainer = document.getElementById('toastContainer');
		const toastId = 'toast-' + Date.now();

		const toast = document.createElement('div');
		toast.id = toastId;
		toast.className = `toast show align-items-center text-bg-${type} border-0 mb-2`;
		toast.setAttribute('role', 'alert');
		toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body d-flex align-items-center">
                    <i class="bi ${getToastIcon(type)} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

		toastContainer.appendChild(toast);

		setTimeout(() => {
			const toastElement = document.getElementById(toastId);
			if (toastElement) {
				toastElement.remove();
			}
		}, 5000);
	};

	const getToastIcon = (type) => {
		switch (type) {
			case 'success':
				return 'bi-check-circle-fill';
			case 'danger':
				return 'bi-exclamation-triangle-fill';
			case 'info':
				return 'bi-info-circle-fill';
			case 'warning':
				return 'bi-exclamation-circle-fill';
			default:
				return 'bi-info-circle-fill';
		}
	};

	// Функция для обновления статуса бана
	function updateBanStatus(isBanned) {
		const banStatusBadge = document.getElementById('banStatusBadge');
		if (isBanned) {
			banStatusBadge.className = 'badge bg-danger py-1 px-2';
			banStatusBadge.innerHTML = '<i class="fas fa-ban me-1"></i><small>Status Banned: Active</small>';
		} else {
			banStatusBadge.className = 'badge bg-success py-1 px-2';
			banStatusBadge.innerHTML = '<i class="fas fa-check me-1"></i><small>Status Banned: None</small>';
		}
	}

	// Kick user
	document.getElementById('kickUserBtn').addEventListener('click', async function() {
		const userId = document.getElementById('userId').value;
		const userName = document.getElementById('userName').value;

		if (!userId) {
			showToast('User ID is missing!', 'danger');
			return;
		}

		try {
			const response = await fetch(`/admin/kick-user?userId=${userId}`);
			const result = await response.json();

			if (result.success) {
				showToast(`User ${result.message}`, 'success');
				console.log(`User ${userName} (UserId: ${userId}) has been kicked for reason: Banned`);
				refreshBans();
			} else {
				showToast(`Error: ${result.message}`, 'danger');
			}
		} catch (err) {
			showToast('An unexpected error occurred during the kick operation.', 'danger');
			console.error(err);
		}
	});

	// Add ban
	document.getElementById('banForm').addEventListener('submit', async function(e) {
		e.preventDefault();

		const form = e.target;
		const formData = new FormData(form);
		const data = Object.fromEntries(formData);
		const userName = document.getElementById('userName').value;

		try {
			const response = await fetch(form.action || '/admin/add-ban', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});

			if (response.ok) {
				const message = await response.text();
				showToast('Ban added successfully!', 'success');
				showToast('The user will be kicked automatically in 1 minute.', 'info');
				console.log(`User ${userName} (UserId: ${data.userId}) has been banned`);
				startCountdown(180);
				updateBanStatus(true);
				refreshBans();
			} else {
				const error = await response.text();
				showToast(`Error: ${error}`, 'danger');
			}
		} catch (err) {
			showToast('An unexpected error occurred while adding the ban.', 'danger');
			console.error(err);
		}

		setTimeout(async () => {
			const userId = document.getElementById('userId').value;
			if (!userId) {
				showToast('User ID is missing!', 'danger');
				return;
			}

			try {
				const response = await fetch(`/admin/kick-user?userId=${userId}`);
				const result = await response.json();

				if (result.success) {
					showToast(`User ${result.message}`, 'success');
					refreshBans();
				} else {
					showToast(`Error: ${result.message}`, 'danger');
				}
			} catch (err) {
				showToast('An unexpected error occurred during the kick operation.', 'danger');
				console.error(err);
			}
		}, 60000);
	});

	// Unban user
	let isUnbanProcessing = false;
	document.getElementById('bansContainer').addEventListener('click', async function(e) {
		if (e.target && (e.target.classList.contains('unban-btn') || e.target.closest('.unban-btn'))) {
			if (isUnbanProcessing) return;
			isUnbanProcessing = true;

			const btn = e.target.classList.contains('unban-btn') ? e.target : e.target.closest('.unban-btn');
			const banId = btn.getAttribute('data-ban-id');
			const userId = document.getElementById('userId').value;
			const userName = document.getElementById('userName').value;

			if (!userId || !banId) {
				showToast('User ID or Ban ID is missing!', 'danger');
				isUnbanProcessing = false;
				return;
			}

			try {
				const response = await fetch('/admin/unban-user', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						userId,
						banId,
						userName
					})
				});

				if (response.ok) {
					const message = await response.text();
					showToast('User unbanned successfully!', 'success');
					showToast('The service will be restarted automatically.', 'info');
					console.log(`User ${userName} (UserId: ${userId}): Unbanned`);
					startCountdown(180);
					updateBanStatus(false);
					refreshBans();
				} else {
					const error = await response.text();
					showToast(`Error: ${error}`, 'danger');
				}
			} catch (err) {
				showToast('An unexpected error occurred while unbanning the user.', 'danger');
				console.error(err);
			} finally {
				isUnbanProcessing = false;
			}
		}
	});

	// Refresh bans list
	async function refreshBans() {
		try {
			const response = await fetch(window.location.href);
			const html = await response.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');
			const newBans = doc.getElementById('bansContainer').innerHTML;
			document.getElementById('bansContainer').innerHTML = newBans;

			const hasActiveBans = doc.querySelector('.badge.bg-danger') !== null;
			updateBanStatus(hasActiveBans);
		} catch (err) {
			console.error('Failed to refresh bans:', err);
		}
	}

	function startCountdown(duration) {
		const countdownContainer = document.getElementById('countdownContainer');
		const countdownTimer = document.getElementById('countdownTimer');

		countdownContainer.classList.remove('d-none');
		let remainingTime = duration;

		const updateTimerDisplay = () => {
			const minutes = Math.floor(remainingTime / 60);
			const seconds = remainingTime % 60;
			countdownTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
		};

		updateTimerDisplay();

		const interval = setInterval(() => {
			remainingTime--;

			if (remainingTime <= 0) {
				clearInterval(interval);
				countdownContainer.classList.add('d-none');
			} else {
				updateTimerDisplay();
			}
		}, 1000);
	}

	async function restartService() {
		try {
			const response = await fetch('/admin/restart-service', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
			});

			if (response.ok) {
			} else {
				const error = await response.text();
				console.error(`Error restarting service: ${error}`);
			}
		} catch (err) {
			console.error('An unexpected error occurred while restarting the service:', err);
		}
	}
});