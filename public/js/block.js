// public/js/block.js

document.addEventListener('DOMContentLoaded', function() {
    // Block functionality
    document.querySelectorAll('.block-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const pcid = this.getAttribute('data-pcid');
            const userId = this.getAttribute('data-user-id');
            const characterName = this.getAttribute('data-character-name');
            const userName = this.getAttribute('data-user-name');
            
            document.getElementById('blockPcid').value = pcid;
            document.querySelector('#blockForm input[name="userId"]')?.remove();
            document.querySelector('#blockForm input[name="characterName"]')?.remove();
            
            const hiddenUserId = document.createElement('input');
            hiddenUserId.type = 'hidden';
            hiddenUserId.name = 'userId';
            hiddenUserId.value = userId;
            document.getElementById('blockForm').appendChild(hiddenUserId);
            
            const hiddenCharName = document.createElement('input');
            hiddenCharName.type = 'hidden';
            hiddenCharName.name = 'characterName';
            hiddenCharName.value = characterName;
            document.getElementById('blockForm').appendChild(hiddenCharName);
            
            const hiddenUserName = document.createElement('input');
            hiddenUserName.type = 'hidden';
            hiddenUserName.name = 'userName';
            hiddenUserName.value = userName;
            document.getElementById('blockForm').appendChild(hiddenUserName);
            
            const modal = new bootstrap.Modal(document.getElementById('blockModal'));
            modal.show();
        });
    });

    document.getElementById('confirmBlock').addEventListener('click', async function() {
        const form = document.getElementById('blockForm');
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/admin/block/character', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData)),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            if (result.success) {
                showToast('Character blocked successfully', 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                showToast('Error: ' + result.message, 'danger');
            }
        } catch (error) {
            showToast('Error blocking character: ' + error.message, 'danger');
        }
    });

    // Unblock functionality
    document.querySelectorAll('.unblock-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const pcid = this.getAttribute('data-pcid');
            const userId = this.getAttribute('data-user-id');
            const characterName = this.getAttribute('data-character-name');
            const userName = this.getAttribute('data-user-name');
            
            document.getElementById('unblockPcid').value = pcid;
            document.querySelector('#unblockForm input[name="userId"]')?.remove();
            document.querySelector('#unblockForm input[name="characterName"]')?.remove();
            
            const hiddenUserId = document.createElement('input');
            hiddenUserId.type = 'hidden';
            hiddenUserId.name = 'userId';
            hiddenUserId.value = userId;
            document.getElementById('unblockForm').appendChild(hiddenUserId);
            
            const hiddenCharName = document.createElement('input');
            hiddenCharName.type = 'hidden';
            hiddenCharName.name = 'characterName';
            hiddenCharName.value = characterName;
            document.getElementById('unblockForm').appendChild(hiddenCharName);
            
            const hiddenUserName = document.createElement('input');
            hiddenUserName.type = 'hidden';
            hiddenUserName.name = 'userName';
            hiddenUserName.value = userName;
            document.getElementById('unblockForm').appendChild(hiddenUserName);
            
            const modal = new bootstrap.Modal(document.getElementById('unblockModal'));
            modal.show();
        });
    });

    document.getElementById('confirmUnblock').addEventListener('click', async function() {
        const form = document.getElementById('unblockForm');
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/admin/unblock/character', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData)),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            if (result.success) {
                showToast('Character unblocked successfully', 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                showToast('Error: ' + result.message, 'danger');
            }
        } catch (error) {
            showToast('Error unblocking character: ' + error.message, 'danger');
        }
    });

    // Kick functionality
    document.querySelectorAll('.kick-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            document.getElementById('kickUserId').value = userId;
            const modal = new bootstrap.Modal(document.getElementById('kickModal'));
            modal.show();
        });
    });

    document.getElementById('confirmKick').addEventListener('click', async function() {
        const form = document.getElementById('kickForm');
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/admin/kick/user', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData)),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            if (result.success) {
                showToast('User kicked successfully', 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                showToast('Error: ' + result.message, 'danger');
            }
        } catch (error) {
            showToast('Error kicking user: ' + error.message, 'danger');
        }
    });

    // Toast notification function
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toastEl = document.createElement('div');
        toastEl.className = `toast show align-items-center text-white bg-${type} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toastEl);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toastEl.classList.remove('show');
            setTimeout(() => toastEl.remove(), 300);
        }, 5000);
    }
});