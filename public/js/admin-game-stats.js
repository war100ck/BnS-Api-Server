// Общие настройки для отключения легенды
const commonOptions = {
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: function(context) {
                    return `${context.label}: ${context.raw} (${context.parsed}%)`;
                }
            }
        }
    }
};

// Функция для инициализации всех графиков
function initCharts() {
    // График рас
    const raceChart = new Chart(document.getElementById('raceChart'), {
        type: 'doughnut',
        data: {
            labels: JSON.parse(document.getElementById('raceChart').getAttribute('data-labels')),
            datasets: [{
                data: JSON.parse(document.getElementById('raceChart').getAttribute('data-values')),
                backgroundColor: ['#4CAF50', '#FF9800', '#2196F3', '#9C27B0'],
                borderWidth: 1
            }]
        },
        options: commonOptions
    });

    // График пола
    const sexChart = new Chart(document.getElementById('sexChart'), {
        type: 'doughnut',
        data: {
            labels: ['Male', 'Female'],
            datasets: [{
                data: [
                    parseInt(document.getElementById('sexChart').getAttribute('data-male')),
                    parseInt(document.getElementById('sexChart').getAttribute('data-female'))
                ],
                backgroundColor: ['#2196F3', '#FF4081'],
                borderWidth: 1
            }]
        },
        options: commonOptions
    });

    // График классов
    const jobChart = new Chart(document.getElementById('jobChart'), {
        type: 'doughnut',
        data: {
            labels: JSON.parse(document.getElementById('jobChart').getAttribute('data-labels')),
            datasets: [{
                data: JSON.parse(document.getElementById('jobChart').getAttribute('data-values')),
                backgroundColor: [
                    '#FF5722', '#FFC107', '#009688', '#795548', '#3F51B5', 
                    '#673AB7', '#3F9E5F', '#E91E63', '#FF9800', '#8BC34A', 
                    '#2196F3', '#CDDC39', '#9C27B0', '#607D8B', '#FFEB3B', 
                    '#4CAF50', '#00BCD4', '#F44336', '#03A9F4', '#795548'
                ],
                borderWidth: 1
            }]
        },
        options: commonOptions
    });

    // График фракций
    const factionChart = new Chart(document.getElementById('factionChart'), {
        type: 'doughnut',
        data: {
            labels: ['Cerulean Order', 'Crimson Legion'],
            datasets: [{
                data: [
                    parseInt(document.getElementById('factionChart').getAttribute('data-cerulean')),
                    parseInt(document.getElementById('factionChart').getAttribute('data-crimson'))
                ],
                backgroundColor: ['#009688', '#FF5722'],
                borderWidth: 1
            }]
        },
        options: commonOptions
    });

    // График уровней
    const levelChart = new Chart(document.getElementById('levelChart'), {
        type: 'pie',
        data: {
            labels: JSON.parse(document.getElementById('levelChart').getAttribute('data-labels')),
            datasets: [{
                data: JSON.parse(document.getElementById('levelChart').getAttribute('data-values')),
                backgroundColor: [
                    '#FF5722', '#FFC107', '#009688', '#795548', '#3F51B5', 
                    '#FF4081', '#E91E63', '#8BC34A', '#FF9800', '#9C27B0', 
                    '#00BCD4', '#CDDC39'
                ],
                borderWidth: 1
            }]
        },
        options: commonOptions
    });
}

// Инициализация графиков после загрузки DOM
document.addEventListener('DOMContentLoaded', initCharts);