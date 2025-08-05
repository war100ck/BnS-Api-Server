// Toast function
function showToast(message, type = 'success') {
    const icon = type === 'success' ? 'check-circle-fill' : 
                 type === 'danger' ? 'exclamation-triangle-fill' : 'info-fill';
    
    const toastElement = document.createElement('div');
    toastElement.className = `toast show align-items-center text-bg-${type} border-0`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    
    toastElement.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center">
                <i class="bi bi-${icon} me-2 fs-5"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    const toastContainer = document.getElementById('toast-container');
    toastContainer.appendChild(toastElement);
    
    // Auto-remove toast after 3 seconds
    setTimeout(() => {
        const bsToast = new bootstrap.Toast(toastElement);
        bsToast.hide();
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }, 3000);
}

// Function to load content
async function loadContent() {
    try {
        const response = await fetch(window.location.pathname, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newContent = doc.getElementById('content-container').innerHTML;
        
        document.getElementById('content-container').innerHTML = newContent;
        initEventListeners(); // Reinitialize event listeners after content update
        
    } catch (error) {
        console.error('Error loading content:', error);
        showToast('Error updating content', 'danger');
    }
}

// Initialize event listeners
function initEventListeners() {
    // Handle game world form submissions
    document.querySelectorAll('.update-game-world-form').forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new URLSearchParams(new FormData(this));
            const worldId = this.dataset.worldId;
            
            try {
                const response = await fetch('/update-game-world', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData
                });
                
                const data = await response.json();
                showToast(data.message);
                
                // Update content after successful save
                await loadContent();
                
            } catch (error) {
                console.error('Error:', error);
                showToast('An error occurred while updating.', 'danger');
            }
        });
    });
    
    // Handle cluster form submissions
    document.querySelectorAll('.update-cluster-form').forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new URLSearchParams(new FormData(this));
            const clusterId = this.dataset.clusterId;
            
            try {
                const response = await fetch('/update-game-world-cluster', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData
                });
                
                const data = await response.json();
                showToast(data.message);
                
                // Update content after successful save
                await loadContent();
                
            } catch (error) {
                console.error('Error:', error);
                showToast('An error occurred while updating.', 'danger');
            }
        });
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initEventListeners();
    
    // Check for message in URL
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
        showToast(message);
        // Remove message from URL
        const url = new URL(window.location);
        url.searchParams.delete('message');
        window.history.replaceState({}, document.title, url);
    }
});