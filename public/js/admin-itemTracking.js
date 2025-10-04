// Item Tracking Application
const ItemTrackingApp = (function() {
    // Current item to delete
    let currentDeleteItem = null;
    
    // Current user ID
    let currentUserId = '';

    // Toast notification function
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toastId = 'toast-' + Date.now();
        
        const bgClass = {
            'success': 'bg-success',
            'error': 'bg-danger',
            'warning': 'bg-warning',
            'info': 'bg-info'
        }[type] || 'bg-info';
        
        const iconClass = {
            'success': 'bi-check-circle',
            'error': 'bi-exclamation-circle',
            'warning': 'bi-exclamation-triangle',
            'info': 'bi-info-circle'
        }[type] || 'bi-info-circle';
        
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0 mb-2" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi ${iconClass} me-2"></i>${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
        toast.show();
        
        // Remove element after hide
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    // Number validation
    function isNumberKey(evt) {
        const charCode = (evt.which) ? evt.which : evt.keyCode;
        if (charCode > 31 && (charCode < 48 || charCode > 57) && charCode !== 44 && charCode !== 59) {
            evt.preventDefault();
            return false;
        }
        return true;
    }

    // Load items count on page load
    async function loadItemsCount() {
        try {
            const response = await fetch('/admin/item-tracking/items-count');
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('itemsCount').textContent = result.count.toLocaleString();
                document.getElementById('itemsCountText').textContent = result.count.toLocaleString();
            } else {
                document.getElementById('itemsCount').textContent = 'load error';
                document.getElementById('itemsCountText').textContent = 'load error';
                showToast('Error loading items count', 'error');
            }
        } catch (error) {
            console.error('Error loading items count:', error);
            document.getElementById('itemsCount').textContent = 'error';
            document.getElementById('itemsCountText').textContent = 'error';
            showToast('Error loading items count', 'error');
        }
    }

    // Reload items cache
    async function reloadItemsCache() {
        const btn = document.getElementById('reloadItemsBtn');
        const originalText = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Updating...';
        
        try {
            const response = await fetch('/admin/item-tracking/reload-items', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast(result.message, 'success');
                loadItemsCount(); // Refresh count display
            } else {
                showToast('Error: ' + result.error, 'error');
            }
        } catch (error) {
            showToast('Update error: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    // Search mail function
    async function searchMail() {
        const btn = document.getElementById('searchMailBtn');
        const originalText = btn.innerHTML;
        const form = document.getElementById('searchForm');
        
        btn.disabled = true;
        form.classList.add('loading');
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Searching...';
        
        const account = document.getElementById('account').value.trim();
        const character = document.getElementById('character').value.trim();
        const itemIds = document.getElementById('itemIds').value.trim();
        
        try {
            const params = new URLSearchParams();
            if (account) params.append('account', account);
            if (character) params.append('character', character);
            if (itemIds) params.append('itemIds', itemIds);
            // Если не указаны account и character, используем текущего пользователя
            if (!account && !character) {
                params.append('userId', currentUserId);
            }
            
            const response = await fetch(`/admin/item-tracking/mail?${params}`);
            const result = await response.json();
            
            const tableBody = document.querySelector('#mailTable tbody');
            const countSpan = document.getElementById('mailCount');
            
            if (result.success && result.data && result.data.length > 0) {
                tableBody.innerHTML = result.data.map((item, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.Data || ''}</td>
                        <td>${item.jb || '0'}</td>
                        <td>${item.SendAcction || ''}</td>
                        <td>${item.RecipientAcction || ''}</td>
                        <td>${item.SendName || ''}</td>
                        <td>${item.RecipientName || ''}</td>
                        <td>${new Date(item.Timer).toLocaleString('en-US')}</td>
                    </tr>
                `).join('');
                countSpan.textContent = `${result.data.length} records`;
                showToast(`Found ${result.data.length} mail records`, 'success');
            } else {
                tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No data found</td></tr>';
                countSpan.textContent = '0 records';
                showToast('No mail data found', 'info');
            }
        } catch (error) {
            console.error('Error searching mail:', error);
            showToast('Search error: ' + error.message, 'error');
            document.querySelector('#mailTable tbody').innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error loading data</td></tr>';
        } finally {
            btn.disabled = false;
            form.classList.remove('loading');
            btn.innerHTML = originalText;
        }
    }

    // Search giftbox function
    async function searchGiftbox() {
        const btn = document.getElementById('searchGiftboxBtn');
        const originalText = btn.innerHTML;
        const form = document.getElementById('searchForm');
        
        btn.disabled = true;
        form.classList.add('loading');
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Searching...';
        
        const account = document.getElementById('account').value.trim();
        const itemIds = document.getElementById('itemIds').value.trim();
        
        try {
            const params = new URLSearchParams();
            if (account) params.append('account', account);
            if (itemIds) params.append('itemIds', itemIds);
            // Если не указан account, используем текущего пользователя
            if (!account) {
                params.append('userId', currentUserId);
            }
            
            const response = await fetch(`/admin/item-tracking/giftbox/data?${params}`);
            const result = await response.json();
            
            const tableBody = document.querySelector('#giftboxTable tbody');
            const countSpan = document.getElementById('giftboxCount');
            
            if (result.success && result.data && result.data.length > 0) {
                tableBody.innerHTML = result.data.map((item, index) => {
                    const characterClass = item['CharacterName'] === 'Account' ? 'account-item' : '';
                    const rowClass = item['UserServiceType'] == 2 ? 'service-item' : '';
                    const statusIcon = getStatusIcon(item['Status']);
                    const typeIcon = getTypeIcon(item['ItemType']);
                    
                    // Check if item can be deleted (only items with status "In Mail")
                    const canDelete = item['Status'] === 'In Mail';
                    const deleteButton = canDelete 
                        ? `<button class="btn btn-danger btn-sm btn-danger-sm" 
                                  onclick="ItemTrackingApp.deleteItem(${JSON.stringify(item).replace(/"/g, '&quot;')})"
                                  title="Delete item">
                             <i class="bi bi-trash"></i>
                           </button>`
                        : `<button class="btn btn-outline-secondary btn-sm btn-disabled" disabled title="Cannot delete ${item['Status']} items">
                             <i class="bi bi-slash-circle"></i>
                           </button>`;
                    
                    return `
                    <tr class="${rowClass}">
                        <td>${index + 1}</td>
                        <td>${item['ItemID'] || ''}</td>
                        <td>${item['ItemName'] || ''}</td>
                        <td>${item['Quantity'] || ''}</td>
                        <td>${item['Account'] || ''}</td>
                        <td class="character-name ${characterClass}" title="${item['CharacterName']}">
                            ${item['CharacterName']}
                        </td>
                        <td class="icon-cell">
                            <span title="${item['Status']}">
                                ${statusIcon}
                            </span>
                        </td>
                        <td class="icon-cell">
                            <span title="${item['ItemType']}">
                                ${typeIcon}
                            </span>
                        </td>
                        <td>${new Date(item['Time']).toLocaleString('en-US')}</td>
                        <td class="action-cell">
                            ${deleteButton}
                        </td>
                    </tr>
                `}).join('');
                countSpan.textContent = `${result.data.length} records`;
                showToast(`Found ${result.data.length} giftbox records`, 'success');
            } else {
                tableBody.innerHTML = '<tr><td colspan="10" class="text-center">No data found</td></tr>';
                countSpan.textContent = '0 records';
                showToast('No giftbox data found', 'info');
            }
        } catch (error) {
            console.error('Error searching giftbox:', error);
            showToast('Search error: ' + error.message, 'error');
            document.querySelector('#giftboxTable tbody').innerHTML = '<tr><td colspan="10" class="text-center text-danger">Error loading data</td></tr>';
        } finally {
            btn.disabled = false;
            form.classList.remove('loading');
            btn.innerHTML = originalText;
        }
    }

    // Get icon for status
    function getStatusIcon(status) {
        switch(status) {
            case 'In Mail':
                return '<i class="bi bi-envelope-check text-success" title="In Mail"></i>';
            case 'Received':
                return '<i class="bi bi-check-circle text-secondary" title="Received"></i>';
            case 'Used':
                return '<i class="bi bi-archive text-danger" title="Used"></i>';
            default:
                return '<i class="bi bi-question-circle" title="Unknown"></i>';
        }
    }

    // Get icon for item type
    function getTypeIcon(type) {
        switch(type) {
            case 'Service':
                return '<i class="bi bi-star-fill text-warning" title="Service Item"></i>';
            case 'Regular':
                return '<i class="bi bi-circle text-primary" title="Regular Item"></i>';
            default:
                return '<i class="bi bi-question-circle" title="Unknown"></i>';
        }
    }

    // Delete item from giftbox
    function deleteItem(item) {
        currentDeleteItem = item;
        
        // Show item info in modal
        const deleteItemInfo = document.getElementById('deleteItemInfo');
        deleteItemInfo.innerHTML = `
            <div class="border p-2 rounded">
                <strong>Item:</strong> ${item['ItemName']}<br>
                <strong>ID:</strong> ${item['ItemID']}<br>
                <strong>Quantity:</strong> ${item['Quantity']}<br>
                <strong>User:</strong> ${item['Account']}<br>
                <strong>Owner:</strong> ${item['CharacterName']}<br>
                <strong>Status:</strong> ${item['Status']}<br>
                <strong>Type:</strong> ${item['ItemType']}<br>
                <strong>Receive Time:</strong> ${new Date(item['Time']).toLocaleString('en-US')}
            </div>
        `;
        
        // Show modal
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        deleteModal.show();
    }

    // Confirm delete
    async function confirmDelete() {
        if (!currentDeleteItem) return;
        
        const btn = document.getElementById('confirmDeleteBtn');
        const originalText = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Deleting...';
        
        try {
            const response = await fetch('/admin/item-tracking/giftbox/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    itemInstanceID: currentDeleteItem['ItemInstanceID'],
                    sourceTable: currentDeleteItem['SourceTable'],
                    userID: currentDeleteItem['UserID'],
                    itemDataID: currentDeleteItem['ItemID'],
                    itemName: currentDeleteItem['ItemName']
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast(result.message, 'success');
                // Close modal
                const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
                deleteModal.hide();
                // Refresh giftbox data
                await searchGiftbox();
            } else {
                showToast('Error: ' + result.message, 'error');
            }
        } catch (error) {
            showToast('Delete error: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            currentDeleteItem = null;
        }
    }

    // Auto-switch tabs based on button click
    function setupTabSwitching() {
        document.getElementById('searchMailBtn').addEventListener('click', function() {
            const mailTab = new bootstrap.Tab(document.getElementById('mail-tab'));
            mailTab.show();
        });

        document.getElementById('searchGiftboxBtn').addEventListener('click', function() {
            const giftboxTab = new bootstrap.Tab(document.getElementById('giftbox-tab'));
            giftboxTab.show();
        });
    }

    // Auto-load data when tabs are shown
    function setupTabAutoLoading() {
        document.getElementById('mail-tab').addEventListener('shown.bs.tab', function() {
            // Load mail data automatically when tab is shown
            if (document.querySelector('#mailTable tbody tr').textContent.includes('No data loaded yet')) {
                searchMail();
            }
        });

        document.getElementById('giftbox-tab').addEventListener('shown.bs.tab', function() {
            // Load giftbox data automatically when tab is shown
            if (document.querySelector('#giftboxTable tbody tr').textContent.includes('No data loaded yet')) {
                searchGiftbox();
            }
        });
    }

    // Enter key support for search
    function setupEnterKeySupport() {
        document.getElementById('searchForm').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('searchMailBtn').click();
            }
        });
    }

    // Initialize event listeners
    function initEventListeners() {
        // Reload items cache
        document.getElementById('reloadItemsBtn').addEventListener('click', reloadItemsCache);
        
        // Search buttons
        document.getElementById('searchMailBtn').addEventListener('click', searchMail);
        document.getElementById('searchGiftboxBtn').addEventListener('click', searchGiftbox);
        
        // Confirm delete button
        document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
        
        // Tab switching and auto-loading
        setupTabSwitching();
        setupTabAutoLoading();
        setupEnterKeySupport();
    }

    // Load items count and initial data on page load
    function loadInitialData() {
        loadItemsCount();
        // Auto-load mail data on page load since it's the active tab
        setTimeout(() => {
            searchMail();
        }, 500);
    }

    // Public API
    return {
        init: function(userId) {
            currentUserId = userId;
            initEventListeners();
            loadInitialData();
        },
        
        deleteItem: function(item) {
            deleteItem(item);
        },
        
        // Expose utility functions for inline event handlers
        isNumberKey: isNumberKey
    };
})();

// Make isNumberKey available globally for inline event handlers
function isNumberKey(evt) {
    return ItemTrackingApp.isNumberKey(evt);
}