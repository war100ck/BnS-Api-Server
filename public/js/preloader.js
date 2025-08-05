  window.addEventListener('load', function () {
      const preloader = document.getElementById('preloader');
      preloader.style.opacity = '0';  // Убираем прелоадер с плавной анимацией
      setTimeout(() => {
          preloader.style.display = 'none';  // Прячем прелоадер после завершения анимации
      }, 500);  // Даем 0.5 секунды на завершение анимации
  });