 $(document).ready(function() {
 	// Общая функция для отправки формы с помощью AJAX
 	function handleFormSubmission(form, url, successMessage) {
 		event.preventDefault(); // Предотвратить стандартное поведение формы

 		var formData = form.serialize(); // Сериализовать данные формы

 		$.ajax({
 			type: 'POST',
 			url: url, // URL для отправки запроса
 			data: formData,
 			success: function(response) {
 				showToast(successMessage);
 				// Здесь можно добавить обработку ответа для обновления содержимого страницы, если необходимо
 			},
 			error: function(xhr, status, error) {
 				showToast('An error occurred: ' + error, 'danger');
 			}
 		});
 	}

 	// AJAX form submission for character details (with inline form)
 	$('.form-inline').submit(function(event) {
 		var form = $(this);
 		event.preventDefault(); // Остановить стандартное поведение формы

 		var formData = form.serialize(); // Сериализовать данные формы

 		$.ajax({
 			type: 'POST',
 			url: '/update-character', // URL для отправки запроса
 			data: formData,
 			success: function(response) {
 				// Обновить данные на странице с полученными значениями
 				var updatedField = response.updatedField; // поле, которое обновилось
 				var updatedValue = response.updatedValue; // новое значение

 				// Обновить соответствующее поле в интерфейсе
 				$('#' + updatedField + '-' + response.pcid).val(updatedValue);
 				showToast('Character updated successfully!');
 			},
 			error: function(xhr) {
 				var errorMsg = xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Error updating character';
 				showToast(errorMsg, 'danger');
 			}
 		});
 	});
 });

 function showToast(message, type = 'success') {
 	const toastHtml = `
                 <div class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                     <div class="d-flex">
                         <div class="toast-body">
                             <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
                             ${message}
                         </div>
                         <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                     </div>
                 </div>
             `;
 	$('#toast-container').append(toastHtml);

 	// Показать уведомление
 	const toastElement = $('#toast-container .toast').last()[0];
 	const bsToast = new bootstrap.Toast(toastElement);
 	bsToast.show();

 	// Удаление уведомления через 3 секунды
 	setTimeout(() => {
 		$(toastElement).remove();
 	}, 3000);
 }