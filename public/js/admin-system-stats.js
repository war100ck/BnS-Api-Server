 const ctxCombinedCpu = document.getElementById('combinedCpuChart').getContext('2d');
 const ctxCombinedMemory = document.getElementById('combinedMemoryChart').getContext('2d');

 const combinedCpuChart = new Chart(ctxCombinedCpu, {
 	type: 'doughnut',
 	data: {
 		labels: ['Used', 'Free'],
 		datasets: [{
 			label: 'CPU Usage (%)',
 			data: [0, 100],
 			backgroundColor: [
 				'rgba(220, 53, 69, 0.8)',
 				'rgba(25, 135, 84, 0.8)'
 			],
 			borderColor: [
 				'rgba(220, 53, 69, 1)',
 				'rgba(25, 135, 84, 1)'
 			],
 			borderWidth: 1
 		}]
 	},
 	options: {
 		plugins: {
 			legend: {
 				position: 'bottom',
 				labels: {
 					boxWidth: 12,
 					padding: 20
 				}
 			}
 		},
 		cutout: '70%'
 	}
 });

 const combinedMemoryChart = new Chart(ctxCombinedMemory, {
 	type: 'doughnut',
 	data: {
 		labels: ['Used', 'Free'],
 		datasets: [{
 			label: 'Memory Usage (%)',
 			data: [0, 100],
 			backgroundColor: [
 				'rgba(111, 66, 193, 0.8)',
 				'rgba(25, 135, 84, 0.8)'
 			],
 			borderColor: [
 				'rgba(111, 66, 193, 1)',
 				'rgba(25, 135, 84, 1)'
 			],
 			borderWidth: 1
 		}]
 	},
 	options: {
 		plugins: {
 			legend: {
 				position: 'bottom',
 				labels: {
 					boxWidth: 12,
 					padding: 20
 				}
 			}
 		},
 		cutout: '70%'
 	}
 });

 let serverStartTime; // Переменная для хранения времени запуска сервера

 // Обновление информации о системе
 function updateSystemInfo(systemInfo) {
 	document.getElementById('cpuModel').textContent = systemInfo.cpuModel;
 	document.getElementById('cpuSpeed').textContent = systemInfo.cpuSpeed;
 	document.getElementById('cpuCores').textContent = systemInfo.cpuCores;
 	document.getElementById('systemTotalMemory').textContent = systemInfo.totalMemory;
 	document.getElementById('systemFreeMemory').textContent = systemInfo.freeMemory;
 	document.getElementById('osType').textContent = systemInfo.osType;
 	document.getElementById('osRelease').textContent = systemInfo.osRelease;
 	document.getElementById('platform').textContent = systemInfo.platform;
 }

 // Обновление информации о процессе
 function updateProcessInfo(processInfo) {
 	document.getElementById('processPid').textContent = processInfo.pid;
 	document.getElementById('processName').textContent = processInfo.name;
 	document.getElementById('processMemory').textContent = processInfo.memory;
 	document.getElementById('processCpu').textContent = processInfo.cpu;
 }

 // Обновление статистики
 function updateStats() {
 	fetch('/api/system-stats')
 		.then(response => response.json())
 		.then(data => {
 			// Сохраняем время запуска сервера
 			serverStartTime = new Date(data.serverStartTime);

 			// Обновляем системную информацию и информацию о процессе
 			updateSystemInfo(data.systemInfo);
 			updateProcessInfo(data.processInfo);

 			// Обновляем данные в графиках
 			combinedCpuChart.data.datasets[0].data = [data.usedCpu, data.freeCpu];
 			combinedMemoryChart.data.datasets[0].data = [data.usedMemory, 100 - data.usedMemory];

 			// Обновляем текстовые данные
 			document.getElementById('usedCpu').textContent = data.usedCpu;
 			document.getElementById('freeCpu').textContent = data.freeCpu;
 			document.getElementById('totalMemory').textContent = data.totalMemory;
 			document.getElementById('freeMemory').textContent = data.freeMemory;

 			// Обновляем графики
 			combinedCpuChart.update();
 			combinedMemoryChart.update();
 		})
 		.catch(error => console.error('Error:', error));
 }

 // Форматирование времени с учетом месяцев и недель
 function formatTime(seconds) {
 	const months = Math.floor(seconds / (30 * 24 * 3600));
 	const weeks = Math.floor((seconds % (30 * 24 * 3600)) / (7 * 24 * 3600));
 	const days = Math.floor((seconds % (7 * 24 * 3600)) / (24 * 3600));
 	const hours = Math.floor((seconds % (24 * 3600)) / 3600);
 	const minutes = Math.floor((seconds % 3600) / 60);
 	const secs = seconds % 60;

 	return `${months}m ${weeks}w ${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
 }

 // Функция для отображения времени с момента старта сервера
 function updateTimeDisplay() {
 	if (!serverStartTime) return;

 	const currentTime = new Date();
 	const elapsedTime = Math.floor((currentTime - serverStartTime) / 1000);
 	const elapsedTimeFormatted = formatTime(elapsedTime);

 	document.getElementById('serverStartTime').textContent = elapsedTimeFormatted;
 	document.getElementById('currentTime').textContent = currentTime.toLocaleTimeString();
 }

 // Обновление времени каждую секунду
 setInterval(updateTimeDisplay, 1000);

 // Первоначальный вызов для загрузки данных
 updateStats();
 setInterval(updateStats, 5000); // Обновляем статистику каждые 5 секунд