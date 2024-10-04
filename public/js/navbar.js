document.addEventListener('DOMContentLoaded', function() {
    // Получаем данные из localStorage
    const username = localStorage.getItem('username');
    const profileLink = document.getElementById('profileLink');
    const usernameElement = document.getElementById('username');
    const usernameContainer = document.getElementById('usernameContainer');
    const signupContainer = document.getElementById('signupContainer');
    const homeItem = document.getElementById('homeItem');
    const aboutItem = document.getElementById('aboutItem');
    const profsItem = document.getElementById('profsItem');
    const buyItItem = document.getElementById('buyItItem');
    const classesItem = document.getElementById('classesItem'); // Добавляем classesItem
    const joinUsButton = document.getElementById('join-us-button');
    const currentPath = window.location.pathname;

    const baseUrl = window.location.origin;

    // Функция обновления навигационного меню
    function updateNavbar() {
        console.log('Updating Navbar...');
        console.log('Username:', username);

        if (username) {
            // Показать никнейм
            usernameElement.textContent = username;
            profileLink.href = `${baseUrl}/profile?userName=${encodeURIComponent(username)}`;
            console.log('Profile Link Href:', profileLink.href);

            usernameContainer.classList.remove('d-none');
            signupContainer.classList.add('d-none');

            // Показать или скрыть элементы в зависимости от текущего пути
            if (currentPath === '/profile') {
                // На странице профиля показываем кнопку "Home" и скрываем остальные
                if (homeItem) homeItem.classList.remove('d-none');
                if (aboutItem) aboutItem.classList.add('d-none');
                if (profsItem) profsItem.classList.add('d-none');
                if (buyItItem) buyItItem.classList.add('d-none');
                if (classesItem) classesItem.classList.add('d-none'); // Скрыть элемент Classes
            } else {
                // На остальных страницах показываем стандартные ссылки
                if (homeItem) homeItem.classList.add('d-none');
                if (aboutItem) aboutItem.classList.remove('d-none');
                if (profsItem) profsItem.classList.remove('d-none');
                if (buyItItem) buyItItem.classList.remove('d-none');
                if (classesItem) classesItem.classList.remove('d-none'); // Показать элемент Classes
            }
        } else {
            // Пользователь не зарегистрирован: показываем кнопку "Join Us Now"
            usernameContainer.classList.add('d-none');
            signupContainer.classList.remove('d-none');

            // Показать элементы навигации
            if (homeItem) homeItem.classList.add('d-none');
            if (aboutItem) aboutItem.classList.remove('d-none');
            if (profsItem) profsItem.classList.remove('d-none');
            if (buyItItem) buyItItem.classList.remove('d-none');
            if (classesItem) classesItem.classList.remove('d-none'); // Показать элемент Classes

            // Показать кнопку "Join Us Now"
            if (joinUsButton) joinUsButton.style.display = 'block';
        }
    }

    // Инициализация состояния навигационной панели
    updateNavbar();

    // Обработчик выхода из системы
    document.getElementById('logoutLink').addEventListener('click', (event) => {
        event.preventDefault();
        localStorage.removeItem('username');
        updateNavbar(); // Обновляем навигационное меню после выхода
        window.location.href = '/'; // Перенаправление на главную страницу
    });
});