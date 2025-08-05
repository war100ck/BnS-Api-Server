 const adminDataElement = document.getElementById('admin-data');
 const allUsers = JSON.parse(adminDataElement.dataset.users);
 const totalUsers = adminDataElement.dataset.totalUsers;
 const creatureCount = adminDataElement.dataset.creatureCount;
 const deletedCreatureCount = adminDataElement.dataset.deletedCreatureCount;
 let usersPerPage = 10;
 let currentPage = 1;
 let displayedUsers = [...allUsers];
 let isAscending = true;

 let currentRoleChange = {
 	userId: null,
 	newRole: null,
 	button: null
 };

 const roleConfirmationModal = new bootstrap.Modal(document.getElementById('roleConfirmationModal'), {
 	backdrop: 'static',
 	keyboard: false,
 	focus: true
 });

 function filterUsers(query) {
 	return allUsers.filter(user => user.UserName.toLowerCase().includes(query.toLowerCase()));
 }

 function sortUsers(users, ascending) {
 	return users.sort((a, b) => {
 		const nameA = a.UserName.toLowerCase();
 		const nameB = b.UserName.toLowerCase();
 		return ascending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
 	});
 }

 function showToast(toastId, message) {
 	const toastElement = document.getElementById(toastId);
 	const messageElement = toastId === 'success-toast' ?
 		document.getElementById('success-message') :
 		document.getElementById('error-message');

 	messageElement.textContent = message;
 	toastElement.classList.remove('d-none');

 	const toast = new bootstrap.Toast(toastElement);
 	toast.show();

 	setTimeout(() => {
 		toastElement.classList.add('d-none');
 	}, 5000);
 }

 async function updateUserRole(userId, newRole) {
 	try {
 		const response = await fetch('/admin/update-admin-status', {
 			method: 'POST',
 			headers: {
 				'Content-Type': 'application/json',
 			},
 			body: JSON.stringify({
 				userId,
 				admin: newRole === 'admin' ? '1' : '0'
 			}),
 		});

 		const data = await response.json();
 		if (response.ok) {
 			showToast('success-toast', data.message);
 			return true;
 		} else {
 			throw new Error(data.message || 'Failed to update role');
 		}
 	} catch (error) {
 		console.error('Error updating role:', error);
 		showToast('error-toast', 'Something went wrong. Please try again.');
 		return false;
 	}
 }

 function showRoleConfirmation(userId, newRole, button) {
 	currentRoleChange = {
 		userId,
 		newRole,
 		button
 	};

 	const modalBody = document.getElementById('roleConfirmationModalBody');
 	const userName = button.closest('tr').querySelector('.username-cell').textContent.trim();

 	if (newRole === 'admin') {
 		modalBody.innerHTML = `
                    <p>You are about to grant administrator privileges to user <strong>${userName}</strong>.</p>
                    <p class="text-danger">Administrators have full access to the system. Are you sure you want to proceed?</p>
                `;
 	} else {
 		modalBody.innerHTML = `
                    <p>You are about to revoke administrator privileges from user <strong>${userName}</strong>.</p>
                    <p>This will downgrade their role to a regular user. Are you sure you want to proceed?</p>
                `;
 	}

 	roleConfirmationModal.show();
 }

 document.getElementById('confirmRoleChange').addEventListener('click', async () => {
 	const {
 		userId,
 		newRole,
 		button
 	} = currentRoleChange;

 	const success = await updateUserRole(userId, newRole);
 	if (success) {
 		button.dataset.currentRole = newRole;
 		if (newRole === 'admin') {
 			button.classList.remove('btn-outline-success');
 			button.classList.add('btn-outline-danger');
 			button.innerHTML = '<i class="fas fa-user-shield me-1"></i> Admin';
 		} else {
 			button.classList.remove('btn-outline-danger');
 			button.classList.add('btn-outline-success');
 			button.innerHTML = '<i class="fas fa-user me-1"></i> User';
 		}
 	}

 	roleConfirmationModal.hide();
 });

 function bindRoleChangeHandlers() {
 	document.querySelectorAll('.role-toggle').forEach(button => {
 		button.addEventListener('click', (event) => {
 			const userId = button.dataset.userId;
 			const currentRole = button.dataset.currentRole;
 			const newRole = currentRole === 'admin' ? 'user' : 'admin';

 			showRoleConfirmation(userId, newRole, button);
 		});
 	});
 }

 function displayUsersForPage(page) {
 	const start = (page - 1) * usersPerPage;
 	const end = start + usersPerPage;
 	const usersToDisplay = displayedUsers.slice(start, end);
 	updateUserTable(usersToDisplay);
 }

 function updateUserTable(users) {
 	const tableBody = document.getElementById('user-table-body');
 	tableBody.innerHTML = '';

 	users.forEach((user, index) => {
 		const row = document.createElement('tr');
 		row.dataset.userId = user.UserId;
 		row.innerHTML = `
                    <td>${index + 1}</td>
                    <td class="username-cell">
                        <i class="fas fa-user-circle me-2 text-muted"></i>
                        ${user.UserName}
                    </td>
                    <td>
                        <div class="d-flex">
                            <button class="btn btn-sm ${user.admin ? 'btn-outline-danger' : 'btn-outline-success'} role-toggle" 
                                    data-user-id="${user.UserId}" 
                                    data-current-role="${user.admin ? 'admin' : 'user'}">
                                ${user.admin 
                                    ? '<i class="fas fa-user-shield me-1"></i> Admin' 
                                    : '<i class="fas fa-user me-1"></i> User'}
                            </button>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex gap-1">
                            <a href="admin/edit-character?userId=${user.UserId}" class="btn btn-action btn-outline-primary" title="Edit Characters">
                                <i class="fas fa-user-edit"></i>
                            </a>
                            <a href="admin/add-deposit?userId=${user.UserId}" class="btn btn-action btn-outline-success" title="Add Deposit">
                                <i class="fas fa-coins"></i>
                            </a>
                            <a href="admin/add-item?userId=${user.UserId}" class="btn btn-action btn-outline-info" title="Sending Items">
                                <i class="fas fa-paper-plane"></i>
                            </a>
                            <a href="admin/add-vip?userId=${user.UserId}" class="btn btn-action btn-outline-warning" title="VIP Management">
                                <i class="fas fa-crown"></i>
                            </a>
                            <a href="admin/add-ban?userId=${user.UserId}" class="btn btn-action btn-outline-danger" title="Ban Management">
                                <i class="fas fa-gavel"></i>
                            </a>
                        </div>
                    </td>
                `;
 		tableBody.appendChild(row);
 	});

 	bindRoleChangeHandlers();
 }

 function updatePagination() {
 	const totalPages = Math.ceil(displayedUsers.length / usersPerPage);
 	const pagination = document.getElementById('pagination');
 	pagination.innerHTML = '';

 	const prevItem = document.createElement('li');
 	prevItem.classList.add('page-item');
 	if (currentPage === 1) prevItem.classList.add('disabled');
 	prevItem.innerHTML = `<a class="page-link" href="#" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a>`;
 	prevItem.addEventListener('click', (event) => {
 		event.preventDefault();
 		if (currentPage > 1) {
 			currentPage--;
 			displayUsersForPage(currentPage);
 			updatePagination();
 		}
 	});
 	pagination.appendChild(prevItem);

 	const maxVisiblePages = 5;
 	let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
 	let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

 	if (endPage - startPage + 1 < maxVisiblePages) {
 		startPage = Math.max(1, endPage - maxVisiblePages + 1);
 	}

 	if (startPage > 1) {
 		const firstItem = document.createElement('li');
 		firstItem.classList.add('page-item');
 		firstItem.innerHTML = `<a class="page-link" href="#">1</a>`;
 		firstItem.addEventListener('click', (event) => {
 			event.preventDefault();
 			currentPage = 1;
 			displayUsersForPage(currentPage);
 			updatePagination();
 		});
 		pagination.appendChild(firstItem);

 		if (startPage > 2) {
 			const ellipsisItem = document.createElement('li');
 			ellipsisItem.classList.add('page-item', 'disabled');
 			ellipsisItem.innerHTML = `<span class="page-link">...</span>`;
 			pagination.appendChild(ellipsisItem);
 		}
 	}

 	for (let i = startPage; i <= endPage; i++) {
 		const pageItem = document.createElement('li');
 		pageItem.classList.add('page-item');
 		if (i === currentPage) pageItem.classList.add('active');
 		pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
 		pageItem.addEventListener('click', (event) => {
 			event.preventDefault();
 			currentPage = i;
 			displayUsersForPage(i);
 			updatePagination();
 		});
 		pagination.appendChild(pageItem);
 	}

 	if (endPage < totalPages) {
 		if (endPage < totalPages - 1) {
 			const ellipsisItem = document.createElement('li');
 			ellipsisItem.classList.add('page-item', 'disabled');
 			ellipsisItem.innerHTML = `<span class="page-link">...</span>`;
 			pagination.appendChild(ellipsisItem);
 		}

 		const lastItem = document.createElement('li');
 		lastItem.classList.add('page-item');
 		lastItem.innerHTML = `<a class="page-link" href="#">${totalPages}</a>`;
 		lastItem.addEventListener('click', (event) => {
 			event.preventDefault();
 			currentPage = totalPages;
 			displayUsersForPage(currentPage);
 			updatePagination();
 		});
 		pagination.appendChild(lastItem);
 	}

 	const nextItem = document.createElement('li');
 	nextItem.classList.add('page-item');
 	if (currentPage === totalPages) nextItem.classList.add('disabled');
 	nextItem.innerHTML = `<a class="page-link" href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a>`;
 	nextItem.addEventListener('click', (event) => {
 		event.preventDefault();
 		if (currentPage < totalPages) {
 			currentPage++;
 			displayUsersForPage(currentPage);
 			updatePagination();
 		}
 	});
 	pagination.appendChild(nextItem);
 }

 function handleSearch() {
 	const query = document.getElementById('search-input').value;
 	displayedUsers = filterUsers(query);
 	currentPage = 1;
 	displayUsersForPage(currentPage);
 	updatePagination();
 }

 document.getElementById('search-input').addEventListener('input', handleSearch);

 function handleSortToggle() {
 	const sortIconAsc = document.getElementById('sort-asc');
 	const sortIconDesc = document.getElementById('sort-desc');
 	sortIconAsc.style.display = isAscending ? 'none' : 'inline';
 	sortIconDesc.style.display = isAscending ? 'inline' : 'none';

 	displayedUsers = sortUsers(displayedUsers, isAscending);
 	displayUsersForPage(1);
 	updatePagination();

 	isAscending = !isAscending;
 }

 document.getElementById('sort-username').addEventListener('click', handleSortToggle);

 document.getElementById('users-per-page').addEventListener('change', (event) => {
 	usersPerPage = parseInt(event.target.value, 10);
 	currentPage = 1;
 	displayedUsers = allUsers;
 	displayUsersForPage(currentPage);
 	updatePagination();
 });

 displayedUsers = sortUsers(allUsers, isAscending);
 displayUsersForPage(currentPage);
 updatePagination();
 bindRoleChangeHandlers();