// Функция для создания и отображения тост уведомления
function showToast(message, type) {
  // Создаём элемент тоста
  const toast = document.createElement('div');
  toast.className = `toast ${type}-message show`;
  toast.textContent = message;

  // Добавляем тост в контейнер
  const toastContainer = document.getElementById('toastContainer');
  toastContainer.appendChild(toast);

  // Удаляем тост после 3 секунд
  setTimeout(() => {
    toast.classList.add('d-none');
    setTimeout(() => {
      toastContainer.removeChild(toast);
    }, 500); // Время для исчезновения
  }, 3000); // Время отображения
}

// Пример вызова функции при успешном обновлении
$(document).ready(function() {
  // Пример вызова функции, замените условия и сообщения на свои
  $('#updateForm').on('submit', function(event) {
    event.preventDefault();
    $.ajax({
      type: 'POST',
      url: $(this).attr('action'),
      data: $(this).serialize(),
      success: function(response) {
        showToast('Update successful!', 'success');
      },
      error: function() {
        showToast('Update failed. Please try again.', 'error');
      }
    });
  });
});
