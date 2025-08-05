// Глобальные переменные для отслеживания состояния
let eventListenersInitialized = false;

// Function to show detailed toast notification
function showToast(type, title, message) {
	const toastContainer = document.getElementById('toastContainer');
	const toastEl = document.createElement('div');
	toastEl.className = `toast show align-items-center text-white bg-${type} border-0`;
	toastEl.setAttribute('role', 'alert');
	toastEl.setAttribute('aria-live', 'assertive');
	toastEl.setAttribute('aria-atomic', 'true');
	toastEl.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">
                        <div class="d-flex align-items-center">
                            <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'} me-2 fs-4"></i>
                            <div>
                                <strong class="me-auto">${title}</strong>
                                <div>${message}</div>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            `;
	toastContainer.appendChild(toastEl);

	// Remove toast after 5 seconds
	setTimeout(() => {
		toastEl.classList.remove('show');
		setTimeout(() => toastEl.remove(), 300);
	}, 5000);
}

// Function to refresh product list
async function refreshProductList() {
	try {
		const response = await fetch(window.location.href, {
			headers: {
				'X-Requested-With': 'XMLHttpRequest'
			}
		});
		if (!response.ok) throw new Error('Failed to fetch products');

		const text = await response.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, 'text/html');
		const newTableBody = doc.getElementById('productTableBody');
		const newBadge = doc.querySelector('.card-header .badge');

		if (newTableBody) {
			document.getElementById('productTableBody').innerHTML = newTableBody.innerHTML;
			document.querySelector('.card-header .badge').textContent = newBadge.textContent;

			// Инициализируем обработчики только если они еще не были инициализированы
			if (!eventListenersInitialized) {
				initializeEventListeners();
				eventListenersInitialized = true;
			}
		}
	} catch (error) {
		console.error('Error refreshing product list:', error);
		showToast('danger', 'Error', 'Failed to refresh product list');
	}
}

// Initialize event listeners for forms
function initializeEventListeners() {
	// Add product form - используем event delegation
	document.body.addEventListener('submit', async function(e) {
		if (e.target.id === 'addProductForm') {
			e.preventDefault();
			const form = e.target;
			const submitBtn = form.querySelector('button[type="submit"]');
			const originalText = submitBtn.innerHTML;
			submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';
			submitBtn.disabled = true;

			try {
				const formData = new FormData(form);
				const response = await fetch(form.action, {
					method: 'POST',
					body: formData,
					headers: {
						'X-Requested-With': 'XMLHttpRequest'
					}
				});

				if (response.ok) {
					showToast('success', 'Success', 'Product added successfully!');
					form.reset();
					await refreshProductList();
				} else {
					const errorData = await response.json();
					throw new Error(errorData.message || 'Failed to add product');
				}
			} catch (error) {
				showToast('danger', 'Error', error.message || 'Error adding product');
				console.error('Error:', error);
			} finally {
				submitBtn.innerHTML = originalText;
				submitBtn.disabled = false;
			}
		}

		// Edit product forms
		if (e.target.classList.contains('edit-product-form')) {
			e.preventDefault();
			const form = e.target;
			const submitBtn = form.querySelector('button[type="submit"]');
			const originalText = submitBtn.innerHTML;
			submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
			submitBtn.disabled = true;

			try {
				const formData = new FormData(form);
				const response = await fetch(form.action, {
					method: 'POST',
					body: formData,
					headers: {
						'X-Requested-With': 'XMLHttpRequest'
					}
				});

				if (response.ok) {
					showToast('success', 'Success', 'Product updated successfully!');
					const modal = bootstrap.Modal.getInstance(form.closest('.modal'));
					if (modal) modal.hide();
					await refreshProductList();
				} else {
					const errorData = await response.json();
					throw new Error(errorData.message || 'Failed to update product');
				}
			} catch (error) {
				showToast('danger', 'Error', error.message || 'Error updating product');
				console.error('Error:', error);
			} finally {
				submitBtn.innerHTML = originalText;
				submitBtn.disabled = false;
			}
		}

		// Delete product forms
		if (e.target.classList.contains('delete-form')) {
			e.preventDefault();
			const form = e.target;

			if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
				return;
			}

			const submitBtn = form.querySelector('button[type="submit"]');
			const originalText = submitBtn.innerHTML;
			submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';
			submitBtn.disabled = true;

			try {
				const response = await fetch(form.action, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-Requested-With': 'XMLHttpRequest'
					}
				});

				if (response.ok) {
					showToast('success', 'Success', 'Product deleted successfully!');
					await refreshProductList();
				} else {
					const errorData = await response.json();
					throw new Error(errorData.message || 'Failed to delete product');
				}
			} catch (error) {
				showToast('danger', 'Error', error.message || 'Error deleting product');
				console.error('Error:', error);
			} finally {
				submitBtn.innerHTML = originalText;
				submitBtn.disabled = false;
			}
		}
	});
}

// Initialize all event listeners when page loads
document.addEventListener('DOMContentLoaded', function() {
	initializeEventListeners();
	eventListenersInitialized = true;
});