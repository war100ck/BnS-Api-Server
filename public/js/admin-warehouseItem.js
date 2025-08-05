// Получаем данные категорий из глобальной переменной
const categories = window.categoriesData || {};

// Основные переменные
let currentPage = 1;
const itemsPerRow = 8;
let itemsPerPage = itemsPerRow * 5; // Начальное значение - 5 рядов
let allItems = [];
const itemModal = new bootstrap.Modal(document.getElementById('itemModal'));
const customTooltip = document.getElementById('customTooltip');

// Функция отображения элементов с пагинацией
function renderItemsPage(items) {
	const itemList = document.getElementById('itemList');
	const pagination = document.getElementById('paginationControls');
	const totalItemsCount = document.getElementById('totalItemsCount');
	const modalBody = document.querySelector('#itemModal .modal-body');

	itemList.innerHTML = '';
	pagination.innerHTML = '';
	totalItemsCount.innerHTML = `<span class="total-items">Total: <strong>${allItems.length}</strong> items</span>`;

	// Рассчитываем необходимое количество рядов
	const rowsNeeded = Math.ceil(items.length / itemsPerRow);
	const actualRows = Math.min(5, rowsNeeded); // Максимум 5 рядов

	// Динамически меняем высоту модального окна
	const isMobile = window.innerWidth <= 576;
	if (isMobile) {
		modalBody.style.height = 'auto';
		modalBody.style.maxHeight = 'calc(100% - 120px)';
	} else {
		modalBody.style.height = `${100 + actualRows * 82}px`;
	}

	// Создаем слоты (8 ячеек в строке × рассчитанное количество рядов)
	const totalSlots = itemsPerRow * actualRows;
	for (let i = 0; i < totalSlots; i++) {
		const slot = document.createElement('div');
		slot.className = 'inventory-slot';

		if (i < items.length) {
			const item = items[i];
			slot.dataset.itemId = item.ItemID;
			slot.dataset.description = item.EN_Description;

			slot.innerHTML = `
                <img src="/images/items/${item.FileName || 'default.png'}" alt="${item.EN_Description}">
                <div class="item-id">${item.ItemID}</div>
            `;

			slot.addEventListener('mouseenter', (e) => {
				showCustomTooltip(e, {
					id: item.ItemID,
					name: item.EN_Description,
					image: `/images/items/${item.FileName || 'default.png'}`
				});
			});

			slot.addEventListener('click', () => {
				document.getElementById('itemid').value = item.ItemID;
				document.getElementById('itemIcon').src = `/images/items/${item.FileName || 'default.png'}`;
				itemModal.hide();
			});
		} else {
			// Пустые слоты
			slot.style.visibility = 'hidden';
		}

		slot.addEventListener('mouseleave', hideCustomTooltip);
		itemList.appendChild(slot);
	}

	// Пагинация
	const totalPages = Math.ceil(allItems.length / itemsPerPage);
	if (totalPages > 1) {
		const paginationContainer = document.createElement('div');
		paginationContainer.className = 'pagination-container';

		if (currentPage > 1) {
			const firstBtn = document.createElement('button');
			firstBtn.className = 'pagination-btn';
			firstBtn.innerHTML = '<i class="bi bi-chevron-double-left"></i>';
			firstBtn.onclick = () => goToPage(1);
			paginationContainer.appendChild(firstBtn);

			const prevBtn = document.createElement('button');
			prevBtn.className = 'pagination-btn';
			prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
			prevBtn.onclick = () => goToPage(currentPage - 1);
			paginationContainer.appendChild(prevBtn);
		}

		const pageInfo = document.createElement('span');
		pageInfo.className = 'pagination-info';
		pageInfo.textContent = `${currentPage} / ${totalPages}`;
		paginationContainer.appendChild(pageInfo);

		if (currentPage < totalPages) {
			const nextBtn = document.createElement('button');
			nextBtn.className = 'pagination-btn';
			nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
			nextBtn.onclick = () => goToPage(currentPage + 1);
			paginationContainer.appendChild(nextBtn);

			const lastBtn = document.createElement('button');
			lastBtn.className = 'pagination-btn';
			lastBtn.innerHTML = '<i class="bi bi-chevron-double-right"></i>';
			lastBtn.onclick = () => goToPage(totalPages);
			paginationContainer.appendChild(lastBtn);
		}

		pagination.appendChild(paginationContainer);
	}
}

// Переход на страницу
window.goToPage = function(page) {
	currentPage = page;
	fetchItems();
};

// Загрузка элементов
window.fetchItems = function() {
	const categoryKey = document.getElementById('category').value;
	const items = categories[categoryKey] || [];
	allItems = items;

	// Динамически определяем itemsPerPage на основе количества элементов
	itemsPerPage = Math.min(itemsPerRow * 5, Math.max(itemsPerRow * 1, items.length));

	const startIndex = (currentPage - 1) * itemsPerPage;
	renderItemsPage(allItems.slice(startIndex, startIndex + itemsPerPage));
};

// Поиск по ID предмета
document.getElementById('searchItemID').addEventListener('input', function(e) {
	const searchQuery = e.target.value.trim().toLowerCase();
	const searchResults = document.getElementById('searchResults');

	if (!searchQuery) {
		searchResults.style.display = 'none';
		return;
	}

	let foundItem = null;
	let foundCategory = null;

	for (const [categoryKey, items] of Object.entries(categories)) {
		foundItem = items.find(({
			ItemID
		}) => ItemID.toString() === searchQuery);
		if (foundItem) {
			foundCategory = categoryKey;
			break;
		}
	}

	if (foundItem) {
		document.getElementById('resultCategory').textContent = foundCategory || 'Unknown';
		document.getElementById('resultDescription').textContent = foundItem.EN_Description || 'No description';
		document.getElementById('resultCNDescription').textContent = foundItem.CN_Description || 'No CN description';

		const resultIcon = document.getElementById('resultIcon');
		resultIcon.src = `/images/items/${foundItem.FileName || 'default.png'}`;
		resultIcon.alt = foundItem.EN_Description || 'Item';

		searchResults.style.display = 'block';
	} else {
		searchResults.style.display = 'none';
	}
});

// Кастомные подсказки
function showCustomTooltip(event, item) {
	customTooltip.innerHTML = `
        <div class="tooltip-image-container">
            <img src="${item.image}" alt="${item.name}" class="tooltip-image">
        </div>
        <div class="tooltip-content">
            <div class="tooltip-title">${item.name}</div>
            <div class="tooltip-id">ID: ${item.id}</div>
            <div class="tooltip-desc">Click to select this item</div>
        </div>
    `;

	customTooltip.classList.add('visible');
	positionTooltip(event);
}

function hideCustomTooltip() {
	customTooltip.classList.remove('visible');
}

function positionTooltip(event) {
	const padding = 15;
	let x = event.clientX - customTooltip.offsetWidth / 2;
	let y = event.clientY - customTooltip.offsetHeight - padding;

	if (x < padding) x = padding;
	if (x + customTooltip.offsetWidth > window.innerWidth - padding) {
		x = window.innerWidth - customTooltip.offsetWidth - padding;
	}
	if (y < padding) y = event.clientY + padding;

	customTooltip.style.left = `${x}px`;
	customTooltip.style.top = `${y}px`;
}

// Отправка предмета
window.sendItem = async function(event) {
	event.preventDefault();
	const form = document.getElementById('addItemForm');
	const formData = new FormData(form);
	const params = new URLSearchParams(formData);

	try {
		const response = await fetch(`${form.action}?${params.toString()}`, {
			method: 'GET'
		});
		const result = await response.text();
		const labelID = result.match(/LabelID=(\d+)/)?.[1] || 'Unknown';

		const {
			charname,
			itemid,
			quantity
		} = Object.fromEntries(formData.entries());
		const message = `
            <div class="d-flex align-items-center">
                <i class="bi bi-check-circle-fill fs-4 me-2"></i>
                <div>
                    <strong>Success!</strong><br>
                    LabelID: ${labelID}<br>
                    Sent to: ${charname}<br>
                    Item ID: ${itemid} (Qty: ${quantity})
                </div>
            </div>
        `;

		showToast('success', message);
		form.reset();
		document.getElementById('itemIcon').src = '/images/items/default.png';
		fetchItems();
	} catch (error) {
		console.error('Error:', error);
		showToast('error', `
            <div class="d-flex align-items-center">
                <i class="bi bi-exclamation-triangle-fill fs-4 me-2"></i>
                <div>
                    <strong>Error!</strong><br>
                    Failed to send item. Please try again.
                </div>
            </div>
        `);
	}
};

// Уведомление
function showToast(type, message) {
	const toastContainer = document.getElementById('toastContainer');
	const toast = document.createElement('div');
	toast.className = `toast show align-items-center text-white ${type === 'success' ? 'bg-success' : 'bg-danger'} border-0`;
	toast.role = 'alert';
	toast.ariaLive = 'assertive';
	toast.ariaAtomic = 'true';

	toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

	toastContainer.appendChild(toast);
	setTimeout(() => toast.remove(), 5000);
}

// Обработчики событий
document.addEventListener('mousemove', (e) => {
	if (customTooltip.classList.contains('visible')) {
		positionTooltip(e);
	}
});

document.getElementById('category').addEventListener('change', function() {
	currentPage = 1;
	fetchItems();
});

document.getElementById('itemModal').addEventListener('shown.bs.modal', fetchItems);

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
	// Инициализация сетки
	const itemList = document.getElementById('itemList');
	itemList.className = 'inventory-grid';

	// Настройка модального окна
	const modalContent = document.querySelector('#itemModal .modal-content');
	modalContent.style.backgroundColor = '#2d2d35';
	modalContent.style.color = '#e0e0e0';
	modalContent.style.border = '1px solid #444';
});