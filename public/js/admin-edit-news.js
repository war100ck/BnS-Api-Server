// Show save notification
    document.getElementById('newsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const toast = new bootstrap.Toast(document.getElementById('saveToast'));
        toast.show();
        
        setTimeout(() => {
            this.submit();
        }, 1500);
    });

    function createEventItem(title = '', text = '') {
        const count = document.querySelectorAll('.accordion-item').length;
        const accordion = document.getElementById('eventsAccordion');
        
        const emptyState = accordion.querySelector('.text-center');
        if (emptyState && emptyState.innerHTML.includes('No news items')) {
            emptyState.remove();
        }

        const item = document.createElement('div');
        item.className = 'accordion-item border mb-2';
        item.innerHTML = `
            <h2 class="accordion-header" id="headingNew${count}">
                <button class="accordion-button collapsed bg-light shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#collapseNew${count}" aria-expanded="false" aria-controls="collapseNew${count}">
                    <i class="bi bi-newspaper text-primary me-2"></i>
                    <span class="fw-semibold">${title || "New News Item"}</span>
                </button>
            </h2>
            <div id="collapseNew${count}" class="accordion-collapse collapse" aria-labelledby="headingNew${count}" data-bs-parent="#eventsAccordion">
                <div class="accordion-body pt-3">
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Title</label>
                        <input type="text" name="events[${count}][title]" class="form-control event-title" value="${escapeHtml(title)}" required />
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">News Content</label>
                        <textarea name="events[${count}][text]" class="form-control event-text" rows="5" required>${escapeHtml(text)}</textarea>
                    </div>
                    <div class="d-flex justify-content-end">
                        <button type="button" class="btn btn-outline-danger btn-sm remove-event">
                            <i class="bi bi-trash me-1"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;

        const titleInput = item.querySelector('.event-title');
        const textInput = item.querySelector('.event-text');
        const removeBtn = item.querySelector('.remove-event');
        
        titleInput.addEventListener('input', function() {
            item.querySelector('.accordion-button span').textContent = this.value || "New News Item";
            updatePreview();
        });
        
        textInput.addEventListener('input', updatePreview);
        
        removeBtn.addEventListener('click', function() {
            const deleteToast = new bootstrap.Toast(document.getElementById('deleteToast'));
            deleteToast.show();
            
            item.remove();
            updateNames();
            updatePreview();
            
            if (document.querySelectorAll('.accordion-item').length === 0) {
                const accordion = document.getElementById('eventsAccordion');
                const emptyState = document.createElement('div');
                emptyState.className = 'text-center py-4 bg-white rounded border';
                emptyState.innerHTML = `
                    <i class="bi bi-newspaper text-muted" style="font-size: 2.5rem;"></i>
                    <p class="text-muted mt-2 mb-0">No news items to edit</p>
                `;
                accordion.appendChild(emptyState);
                updatePreview();
            }
        });

        return item;
    }

    function updateNames() {
        document.querySelectorAll('.accordion-item').forEach((el, idx) => {
            const headingId = `heading${idx}`;
            const collapseId = `collapse${idx}`;
            
            const header = el.querySelector('.accordion-header');
            header.id = headingId;
            
            const button = el.querySelector('.accordion-button');
            button.setAttribute('data-bs-target', `#${collapseId}`);
            button.setAttribute('aria-controls', collapseId);
            
            const collapse = el.querySelector('.accordion-collapse');
            collapse.id = collapseId;
            collapse.setAttribute('aria-labelledby', headingId);
            
            el.querySelector('input.event-title').setAttribute('name', `events[${idx}][title]`);
            el.querySelector('textarea.event-text').setAttribute('name', `events[${idx}][text]`);
        });
    }

    function updatePreview() {
        const preview = document.getElementById('preview');
        const events = document.querySelectorAll('.accordion-item');
        const carousel = document.getElementById('newsCarousel');
        const indicators = document.getElementById('carouselIndicators');
        const controls = document.querySelectorAll('[data-bs-target="#newsCarousel"]');
        
        if (events.length === 0) {
            preview.innerHTML = `
                <div class="text-center py-4 bg-white rounded border h-100 d-flex flex-column justify-content-center">
                    <i class="bi bi-newspaper text-muted" style="font-size: 2.5rem;"></i>
                    <p class="text-muted mt-2 mb-0">No news to display</p>
                </div>
            `;
            
            if (indicators) indicators.innerHTML = '';
            controls.forEach(control => control.style.display = 'none');
            return;
        }
        
        controls.forEach(control => control.style.display = 'block');
        
        let html = '';
        let indicatorsHtml = '';
        
        events.forEach((event, idx) => {
            const title = event.querySelector('.event-title').value;
            const text = event.querySelector('.event-text').value;
            
            html += `
                <div class="carousel-item h-100 ${idx === 0 ? 'active' : ''}">
                    <div class="card bg-dark text-white h-100">
                        <div class="card-body d-flex flex-column">
                            <h5 class="preview-title">${escapeHtml(title)}</h5>
                            <p class="card-text flex-grow-1 overflow-auto" style="max-height: 120px;">${escapeHtml(text).replace(/\n/g, '<br>')}</p>
                        </div>
                    </div>
                </div>
            `;
            
            indicatorsHtml += `
                <button type="button" data-bs-target="#newsCarousel" data-bs-slide-to="${idx}" class="${idx === 0 ? 'active' : ''} bg-dark" style="width: 10px; height: 10px; border-radius: 50%; border: none;" aria-label="Slide ${idx + 1}"></button>
            `;
        });
        
        preview.innerHTML = html;
        
        if (indicators) {
            indicators.innerHTML = indicatorsHtml;
        }
        
        if (!carousel.querySelector('.carousel-item.active')) {
            const firstItem = carousel.querySelector('.carousel-item');
            if (firstItem) firstItem.classList.add('active');
            
            const firstIndicator = carousel.querySelector('.carousel-indicators button');
            if (firstIndicator) firstIndicator.classList.add('active');
        }
        
        if (events.length <= 1) {
            controls.forEach(control => control.style.display = 'none');
        }
    }

    function escapeHtml(text) {
        return text.replace(/[&<>"']/g, function(m) {
            switch (m) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&#39;';
                default: return m;
            }
        });
    }

    // Add new news item
    document.getElementById('addEvent').addEventListener('click', () => {
        const accordion = document.getElementById('eventsAccordion');
        const newEvent = createEventItem('', '');
        accordion.appendChild(newEvent);
        updateNames();
        
        const collapseId = newEvent.querySelector('.accordion-collapse').id;
        const bsCollapse = new bootstrap.Collapse(`#${collapseId}`, {
            toggle: true
        });
        
        newEvent.querySelector('.event-title').focus();
    });

    document.querySelectorAll('.event-title').forEach(el => {
        el.addEventListener('input', function() {
            const header = this.closest('.accordion-item').querySelector('.accordion-button span');
            header.textContent = this.value || "New News Item";
            updatePreview();
        });
    });

    document.querySelectorAll('.event-text').forEach(el => {
        el.addEventListener('input', updatePreview);
    });

    document.querySelectorAll('.remove-event').forEach(btn => {
        btn.addEventListener('click', function() {
            const deleteToast = new bootstrap.Toast(document.getElementById('deleteToast'));
            deleteToast.show();
            
            const item = this.closest('.accordion-item');
            item.remove();
            updateNames();
            updatePreview();
            
            if (document.querySelectorAll('.accordion-item').length === 0) {
                const accordion = document.getElementById('eventsAccordion');
                const emptyState = document.createElement('div');
                emptyState.className = 'text-center py-4 bg-white rounded border';
                emptyState.innerHTML = `
                    <i class="bi bi-newspaper text-muted" style="font-size: 2.5rem;"></i>
                    <p class="text-muted mt-2 mb-0">No news items to edit</p>
                `;
                accordion.appendChild(emptyState);
            }
        });
    });

    updatePreview();