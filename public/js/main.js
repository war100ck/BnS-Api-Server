// Добавляем обработчик события клика для кнопки воспроизведения видео
document.getElementById('playButton').addEventListener('click', function() {
    var videoPlayer = document.getElementById('videoPlayer');
    var playButton = document.getElementById('playButton');
    var thumbnail = document.getElementById('videoThumbnail');

    // Скрываем кнопку и превью после начала воспроизведения
    playButton.style.display = 'none';
    thumbnail.style.display = 'none';

    // Показываем видео и начинаем воспроизведение
    videoPlayer.classList.remove('d-none');
    videoPlayer.style.display = 'block'; // Убедитесь, что видео отображается
    videoPlayer.play();
});

function togglePlayPause() {
    var videoPlayer = document.getElementById('videoPlayer');
    var playButton = document.getElementById('playButton');

    if (videoPlayer.paused) {
        // Воспроизведение видео
        videoPlayer.play();
        playButton.style.display = 'none'; // Скрыть кнопку воспроизведения
    } else {
        // Пауза видео
        videoPlayer.pause();
        playButton.style.display = 'block'; // Показать кнопку воспроизведения
    }
}

// Файл: public/js/navbar.js
document.addEventListener('DOMContentLoaded', function() {
    const username = localStorage.getItem('username');
    const profileLink = document.getElementById('profileLink');
    const usernameElement = document.getElementById('username');
    const usernameContainer = document.getElementById('usernameContainer');
    const signupContainer = document.querySelector('.signup-container');
    const signupText = document.querySelector('.signup-text');

    // Обновляем базовый URL
    const baseUrl = window.location.origin;

    if (username) {
        // Обновляем ссылку на профиль и отображаем никнейм
        profileLink.href = `${baseUrl}/profile?userName=${encodeURIComponent(username)}`;
        usernameElement.textContent = username;
        usernameContainer.classList.remove('d-none');
        signupContainer.classList.add('d-none'); // Скрываем контейнер SignIn/SignUp
        signupText.classList.add('d-none'); // Скрываем текст SignIn/SignUp
    } else {
        usernameContainer.classList.add('d-none');
        signupContainer.classList.remove('d-none'); // Показываем контейнер SignIn/SignUp
        signupText.classList.remove('d-none'); // Показываем текст SignIn/SignUp
    }
});

// Функция для выхода из системы
document.getElementById('logoutLink').addEventListener('click', function(event) {
    event.preventDefault();
    localStorage.removeItem('username');
    window.location.reload(); // Перезагрузить страницу для обновления состояния навигационной панели
});

// Обработчик кликов для иконок классов
document.querySelectorAll('.game-classes-icon').forEach(item => {
    item.addEventListener('click', function(event) {
        event.preventDefault(); // Отменяем стандартное действие ссылки

        const className = this.getAttribute('data-class');
        const classImage = this.getAttribute('data-image');
        const classDescription = this.getAttribute('data-description');
        const racesData = JSON.parse(this.getAttribute('data-races')); // Извлечение массива из атрибута
        const racesTextData = JSON.parse(this.getAttribute('data-races-text')); // Извлечение текста для рас

        // Установка данных в модальное окно
        document.getElementById('modal-class-title').innerText = className;
        document.getElementById('modal-class-image').src = classImage;
        document.getElementById('modal-class-description').innerText = classDescription;

        // Установка изображений и текста доступных рас
        const racesImagesContainer = document.getElementById('modal-races-images');
        racesImagesContainer.innerHTML = ''; // Очистка предыдущих изображений
        racesData.forEach((image, index) => {
            const img = document.createElement('img');
            img.src = image;

            const text = document.createElement('p');
            text.innerText = racesTextData[index]; // Добавляем текст под изображением

            const raceContainer = document.createElement('div'); // Создаем контейнер для изображения и текста
            raceContainer.classList.add('race-container'); // Добавляем класс для стилизации
            raceContainer.appendChild(img);
            raceContainer.appendChild(text);

            racesImagesContainer.appendChild(raceContainer); // Добавляем контейнер в основной
        });

        // Установка сложности класса
        setClassDifficulty(className); // Вызов функции для установки сложности по имени класса

        // Показать модальное окно
        const modal = document.getElementById('customModal');
        modal.style.display = 'block'; // Устанавливаем display в 'block'
        setTimeout(() => {
            modal.classList.add('show'); // Активируем плавное появление
        }, 10); // Небольшая задержка для корректного срабатывания transition

        const modalContent = modal.querySelector('.custom-modal-content');
        setTimeout(() => {
            modalContent.classList.add('show'); // Плавное появление контента
        }, 100); // Задержка для эффекта плавного появления

        const modalImage = document.querySelector('.modal-image');
        const modalText = document.querySelector('.modal-text');

        // Анимация появления при открытии
        modalImage.classList.add('show'); // Плавное появление изображения
        modalText.classList.add('show'); // Плавное появление текста
    });
});


// Закрытие окна при клике на крестик
document.querySelector('.close-button').addEventListener('click', function() {
    const modal = document.getElementById('customModal');
    modal.classList.remove('show');

    const modalContent = modal.querySelector('.custom-modal-content');
    modalContent.classList.remove('show');

    const modalImage = document.querySelector('.modal-image');
    const modalText = document.querySelector('.modal-text');
    modalImage.classList.remove('show');
    modalText.classList.remove('show');

    // Задержка для плавного исчезновения
    setTimeout(() => {
        modal.style.display = "none";
    }, 500);
});

// Закрытие окна при клике вне контента
window.addEventListener('click', function(event) {
    const modal = document.getElementById('customModal');
    if (event.target === modal) {
        modal.classList.remove('show');

        const modalContent = modal.querySelector('.custom-modal-content');
        modalContent.classList.remove('show');

        const modalImage = document.querySelector('.modal-image');
        const modalText = document.querySelector('.modal-text');
        modalImage.classList.remove('show');
        modalText.classList.remove('show');

        setTimeout(() => {
            modal.style.display = "none";
        }, 500);
    }
});

// Функция для установки сложности (от 1 до 5) для разных классов
function setClassDifficulty(className) {
    const difficulties = {
        Assassin: 5, // Сложность 5
        "Blade Master": 4, // Сложность 4
        Destroyer: 3, //  Сложность 3
        "Force Master": 3, // Сложность 3
        "Kung Fu Master": 4.5, // Сложность 4.5
        Summoner: 1, // Сложность 1
        "Blade Dancer": 4, // Сложность 4
        Warlock: 2.5, // Сложность 2.5
        "Soul Fighter": 5, // Сложность 5
        Gunslinger: 2, // Сложность 2
        Warden: 3.5, // Сложность 3.5
        "Zen Archer": 4, // Сложность 4
        // Astromancer: 4,  // Сложность 4
        "Dual Blade": 3 // Сложность 3
    };

    const difficulty = difficulties[className] || 1; // По умолчанию 1, если класс не найден
    const difficultyStarsContainer = document.getElementById('modal-difficulty-stars');
    difficultyStarsContainer.innerHTML = ''; // Очистить предыдущие звезды

    // Создаем звезды
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('div');
        star.classList.add('star');

        // Если текущий индекс <= сложности, заполняем звезду, иначе делаем пустую
        if (i <= difficulty) {
            star.classList.add('star-filled');
        } else {
            star.classList.add('star-empty');
        }

        difficultyStarsContainer.appendChild(star);
    }
}

// Пример использования функции
setClassDifficulty('Assassin'); // Устанавливаем сложность для класса Assassin
setClassDifficulty('Blade Master'); // Устанавливаем сложность для класса Blade Master
setClassDifficulty('Destroyer'); // Устанавливаем сложность для класса Destroyer
setClassDifficulty('Force Master'); // Устанавливаем сложность для класса Force Master
setClassDifficulty('Kung Fu Master'); // Устанавливаем сложность для класса Kung Fu Master
setClassDifficulty('Summoner'); // Устанавливаем сложность для класса Summoner
setClassDifficulty('Blade Dancer'); // Устанавливаем сложность для класса Blade Dancer
setClassDifficulty('Warlock'); // Устанавливаем сложность для класса Warlock
setClassDifficulty('Soul Fighter'); // Устанавливаем сложность для класса Soul Fighter
setClassDifficulty('Gunslinger'); // Устанавливаем сложность для класса Gunslinger
setClassDifficulty('Warden'); // Устанавливаем сложность для класса Warden
setClassDifficulty('Zen Archer'); // Устанавливаем сложность для класса Zen Archer
setClassDifficulty('Dual Blade'); // Устанавливаем сложность для класса Dual Blade

document.addEventListener("DOMContentLoaded", function() {
    const lazySections = document.querySelectorAll('.lazy-section');

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Прекращаем наблюдение после загрузки
            }
        });
    }, {
        threshold: 0.1
    }); // Секция загружается, когда 10% её видимы

    lazySections.forEach(section => {
        observer.observe(section); // Начинаем наблюдение за каждой секцией
    });
});

// Ждем, пока весь контент страницы будет загружен и готов к взаимодействию
document.addEventListener('DOMContentLoaded', function() {
    // Показать карусель
    const carousel = document.getElementById('eventsCarousel');
    carousel.style.display = 'block'; // Отображаем карусель
    const carouselInstance = new bootstrap.Carousel(carousel);
    carouselInstance.cycle(); // Запускаем автоматическую прокрутку
});