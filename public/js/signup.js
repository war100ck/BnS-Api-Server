// Список популярных доменов почтовых сервисов
const fakeEmailDomains = [
  'mailinator.com',
  'yopmail.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'maildrop.cc',
  'throwawaymail.com',
  'fakeinbox.com',
  'mailcatch.com',
  'spambox.us'
];

// Функция для проверки, содержит ли email только цифры
function isEmailOnlyDigits(email) {
  // Регулярное выражение для проверки, содержит ли email только цифры
  const digitsOnlyRegex = /^\d+$/;
  return digitsOnlyRegex.test(email.split('@')[0]);
}

// Функция для проверки фейковых email
function isFakeEmail(email) {
  const domain = email.split('@')[1];
  return fakeEmailDomains.includes(domain);
}

// Функция для кастомной проверки email
function validateEmailCustom(email) {
  if (!email.includes('@')) {
    showToast("Please include an '@' in the email address. The part before '@' is missing.", 'danger');
    return false;
  }
  
  const parts = email.split('@');
  if (parts.length < 2 || parts[1].trim() === '') {
    showToast("Please enter a part following '@'. The domain part is missing.", 'danger');
    return false;
  }
  
  return true;
}

// Функция для проверки доступности имени и email
async function checkAvailability() {
  const accountName = document.getElementById('account_name').value;
  const email = document.getElementById('email').value;

  // Очистка старого сообщения
  const toastContainer = document.querySelector('.toast-container');
  toastContainer.innerHTML = '';

  if (!accountName || !email) {
    showToast('Please enter both an account name and an email.', 'info');
    return;
  }

  if (!validateEmailCustom(email)) {
    document.getElementById('password').disabled = true;
    return;
  }

  if (isEmailOnlyDigits(email)) {
    showToast('Please enter a valid email, email cannot contain only numbers.', 'danger');
    document.getElementById('password').disabled = true;
    return;
  }

  if (isFakeEmail(email)) {
    showToast('Please enter a valid email, the email domain is not allowed.', 'danger');
    document.getElementById('password').disabled = true;
    return;
  }

  try {
    const response = await fetch(`/check-availability?account_name=${encodeURIComponent(accountName)}&email=${encodeURIComponent(email)}`);
    const result = await response.json();
    
    if (result.accountNameTaken) {
      document.getElementById('password').disabled = true;
      showToast('The account name is already taken, please enter another one!', 'danger');
    } else if (result.emailTaken) {
      document.getElementById('password').disabled = true;
      showToast('Email address is busy, please enter another one!', 'danger');
    } else {
      document.getElementById('password').disabled = false;
      showToast('Account name is available.', 'success');
    }
  } catch (error) {
    console.error('Error checking availability:', error);
    showToast('An error occurred while checking availability.', 'danger');
  }
}

// Event listeners to check availability on input changes
document.getElementById('account_name').addEventListener('blur', async () => {
  const accountName = document.getElementById('account_name').value;

  if (accountName) {
    try {
      const response = await fetch(`/check-availability?account_name=${encodeURIComponent(accountName)}`);
      const result = await response.json();

      if (result.accountNameTaken) {
        showToast('The account name is already taken, please enter another one!', 'danger');
        document.getElementById('email').disabled = true;
        document.getElementById('password').disabled = true;
      } else {
        showToast('Account name is available.', 'success');
        document.getElementById('email').disabled = false;
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      showToast('An error occurred while checking availability.', 'danger');
    }
  }
});

document.getElementById('email').addEventListener('blur', async () => {
  const email = document.getElementById('email').value;

  if (email) {
    if (!validateEmailCustom(email)) {
      document.getElementById('password').disabled = true;
      return;
    }
    
    if (isEmailOnlyDigits(email)) {
      showToast('Please enter a valid email, email cannot contain only numbers.', 'danger');
      document.getElementById('password').disabled = true;
      return;
    }
    
    if (isFakeEmail(email)) {
      showToast('Please enter a valid email, the email domain is not allowed.', 'danger');
      document.getElementById('password').disabled = true;
      return;
    }
    
    try {
      const response = await fetch(`/check-availability?email=${encodeURIComponent(email)}`);
      const result = await response.json();

      if (result.emailTaken) {
        showToast('Email address is busy, please enter another one!', 'danger');
        document.getElementById('password').disabled = true;
      } else {
        showToast('Email address is available!', 'success');
        document.getElementById('password').disabled = false;
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      showToast('An error occurred while checking availability.', 'danger');
    }
  }
});

// Функция для проверки длины пароля
function validatePassword() {
  const password = document.getElementById('password').value;
  if (password.length < 6) {
    showToast('Password must be at least 6 characters long.', 'danger');
    return false;
  }
  return true;
}

// Функция для отображения Toast
function showToast(message, alertType) {
  const toastContainer = document.querySelector('.toast-container');
  
  // Создание нового Toast
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${alertType} border-0 mb-2`; // Добавлен отступ снизу
  toast.role = 'alert';
  toast.ariaLive = 'assertive';
  toast.ariaAtomic = 'true';
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  // Добавление нового Toast в контейнер
  toastContainer.appendChild(toast);
  
  // Показ Toast
  const toastInstance = new bootstrap.Toast(toast, {
    delay: 5000 // Показывать Toast 5 секунд
  });
  toastInstance.show();

  // Автоматическое удаление Toast после его исчезновения
  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}

// Функция для отображения сообщения с никнеймом
// function showCongratulationsMessage(userName) {
  // const messageContainer = document.getElementById('congratulations-message');
  // messageContainer.innerHTML = `Congratulations <strong>${userName}</strong>! You have successfully registered on our server.`;
  
  // Убедитесь, что контейнер видим и отображается
  // messageContainer.classList.remove('d-none');
  
  // Анимация и плавное появление
  // messageContainer.classList.add('d-block');
  
  // Закрыть сообщение через 3 секунды
  // setTimeout(() => {
    // messageContainer.classList.remove('d-block');
    // messageContainer.classList.add('d-none');
  // }, 3000);

  // Обновляем элемент навигации для отображения никнейма
 function showCongratulationsMessage(userName) {
  document.querySelector('.signup-text').style.display = 'none'; // Скрыть 'SignIn/SignUp'
  const usernameContainer = document.getElementById('usernameContainer');
  usernameContainer.style.display = 'block';
  document.getElementById('username').textContent = userName;

  // Сохраняем никнейм в localStorage
  localStorage.setItem('username', userName);

  // Скрыть кнопку "Join Us Now" после успешной регистрации
  const joinUsButton = document.getElementById('join-us-button');
  if (joinUsButton) {
    joinUsButton.style.display = 'none';
  }
}

// Функция для загрузки состояния авторизации
function loadAuthState() {
  const username = localStorage.getItem('username');
  const joinUsButton = document.getElementById('join-us-button');
  const profileLink = document.getElementById('profileLink');
  const isProfilePage = document.body.id === 'profile-page'; // Проверка, на странице профиля или нет

  // Обновляем состояние кнопок и текста в зависимости от авторизации
  if (username) {
    // Пользователь зарегистрирован: скрываем кнопку "Join Us Now"
    document.querySelector('.signup-text').style.display = 'none'; // Скрыть 'SignIn/SignUp'
    const usernameContainer = document.getElementById('usernameContainer');
    usernameContainer.style.display = 'block';
    document.getElementById('username').textContent = username;

    // Скрыть кнопку "Join Us Now"
    if (joinUsButton) {
      joinUsButton.style.display = 'none';
    }
  } else {
    // Пользователь не зарегистрирован: показываем кнопку "Join Us Now"
    document.querySelector('.signup-text').style.display = 'block'; // Показать 'SignIn/SignUp'
    const usernameContainer = document.getElementById('usernameContainer');
    usernameContainer.style.display = 'none';

    // Показать кнопку "Join Us Now"
    if (joinUsButton) {
      joinUsButton.style.display = 'block';
    }
  }

  // Скрыть пункт меню "Profile" на странице профиля
  if (isProfilePage && profileLink) {
    profileLink.style.display = 'none';
  }
}

// Загрузка состояния авторизации при загрузке страницы
window.addEventListener('load', function() {
  loadAuthState(); // Вызов функции при загрузке страницы

  // Обработчик для выхода из системы
  document.getElementById('logoutLink').addEventListener('click', (event) => {
    event.preventDefault();
    localStorage.removeItem('username');
    loadAuthState();  // Обновляем состояние после выхода
  });
});



// Функция для закрытия модального окна
function closeModal(modalId) {
  const modalElement = document.getElementById(modalId);
  const modal = bootstrap.Modal.getInstance(modalElement);
  if (modal) {
    modal.hide();
  }
}

// Функция для очистки состояния авторизации
function clearAuthState() {
  localStorage.removeItem('username');
  document.querySelector('.signup-text').style.display = 'block'; // Показать 'SignIn/SignUp'
  const usernameContainer = document.getElementById('usernameContainer');
  usernameContainer.style.display = 'none';
  location.reload(); // Перезагрузка страницы после выхода из системы
}


// Обработка отправки формы регистрации
document.querySelector('form').addEventListener('submit', async (event) => {
  event.preventDefault(); // Предотвращаем стандартное поведение формы (перенаправление)

  if (!validatePassword()) {
    return; // Прекращаем выполнение, если пароль некорректен
  }

  const formData = new FormData(event.target);
  const accountName = formData.get('account_name');
  const email = formData.get('email');
  const password = formData.get('password');

  try {
    const response = await fetch('/signup', {
      method: 'POST',
      body: new URLSearchParams(formData)
    });

    const resultText = await response.text();

    if (response.ok) {
      showToast(resultText, 'success');
      showCongratulationsMessage(accountName);
      closeModal('signupModal'); // Закрыть модальное окно

      // Добавляем задержку перед перезагрузкой страницы
      setTimeout(() => {
        location.reload(); // Перезагрузка страницы после успешной регистрации
      }, 2000); // Задержка в 2 секунды
    } else {
      showToast(resultText, 'danger');
    }
  } catch (error) {
    console.error('Error during signup:', error);
    showToast('An error occurred during signup.', 'danger');
  }
});

// Обработка отправки формы входа
document.getElementById('signin-form').addEventListener('submit', async (event) => {
  event.preventDefault(); // Предотвращаем стандартное поведение формы (перенаправление)

  const formData = new FormData(event.target);
  const email = formData.get('signin_email');
  const password = formData.get('signin_password');

  try {
    const response = await fetch('/signin', {
      method: 'POST',
      body: new URLSearchParams(formData)
    });

    const resultText = await response.text();

    if (response.ok) {
      // Если вход успешен, resultText содержит никнейм
      showToast('Sign In successful', 'success');

      // Обновляем навигационную панель
      showCongratulationsMessage(resultText);

      closeModal('signinModal');

      // Добавляем задержку перед перезагрузкой страницы
      setTimeout(() => {
        location.reload(); // Перезагрузка страницы после успешного входа
      }, 2000); // Задержка в 2 секунды
    } else {
      showToast(resultText, 'danger');
    }
  } catch (error) {
    console.error('Error during signin:', error);
    showToast('An error occurred during signin.', 'danger');
  }
});

// Загрузка состояния авторизации при загрузке страницы
window.addEventListener('load', () => {
  loadAuthState();
});

// Обработка выхода из системы
document.getElementById('logoutLink').addEventListener('click', (event) => {
  event.preventDefault(); // Предотвращаем стандартное действие ссылки
  clearAuthState();
});
