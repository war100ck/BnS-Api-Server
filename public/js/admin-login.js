// Функция для переключения видимости пароля
function setupPasswordToggle() {
  const toggleBtn = document.querySelector('.toggle-password');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      const password = document.getElementById('password');
      const icon = document.getElementById('toggleIcon');
      const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
      password.setAttribute('type', type);
      icon.classList.toggle('fa-eye');
      icon.classList.toggle('fa-eye-slash');
    });
  }
}

// Функция для показа модального окна с ошибкой
function showErrorModalIfNeeded() {
  const errorModalElement = document.getElementById('errorModal');
  if (errorModalElement && errorModalElement.dataset.hasError === 'true') {
    const errorModal = new bootstrap.Modal(errorModalElement);
    errorModal.show();
  }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
  setupPasswordToggle();
  showErrorModalIfNeeded();
});