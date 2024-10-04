// utils/dataTransformations.js

// Функция для преобразования пола в текст и изображение пола
export function convertSex(sex) {
  switch (sex) {
    case 1: return { name: 'Male', imageUrl: '/images/sex/male.png' };
    case 2: return { name: 'Female', imageUrl: '/images/sex/female.png' };
    default: return { name: 'Unknown', imageUrl: '/images/sex/unknown.png' };
  }
}

// Функция для преобразования пола в текст и изображение фракции
export function convertFaction(faction) {
  switch (faction) {
    case 1: return { name: 'Cerulean Order', imageUrl: '/images/faction/Cerulean_Order_logo.webp' };
    case 2: return { name: 'Crimson Legion', imageUrl: '/images/faction/Crimson_legion_logo.webp' };
    default: return { name: 'Does not consist', imageUrl: '/images/sex/unknown.png' };
  }
}

// Функция для преобразования расы в текст и изображение
export function convertRace(race) {
  switch (race) {
    case 1: return { name: 'Yun', imageUrl: '/images/races/race-feng.png' };
    case 2: return { name: 'Gon', imageUrl: '/images/races/race-wan.png' };
    case 3: return { name: 'Lyn', imageUrl: '/images/races/race-lin.png' };
    case 4: return { name: 'Jin', imageUrl: '/images/races/race-sheng.png' };
    default: return { name: 'Unknown', imageUrl: '/images/sex/unknown.png' };
  }
}

// Функция для конвертации денег в золото, серебро и медь
export function convertMoney(money) {
  const gold = Math.floor(money / 10000); // 10000 единиц = 1 золото
  const silver = Math.floor((money % 10000) / 100); // 100 единиц = 1 серебро
  const copper = money % 100; // 1 единица = 1 медь
  return { gold, silver, copper };
}

// Функция для извлечения подстроки из строки
export function cutStr(begin, end, str) {
  const start = str.indexOf(begin) + begin.length;
  const finish = str.indexOf(end, start);
  return str.substring(start, finish);
}

// Функция для преобразования чисел в классы персонажей и их изображения
export function convertJob(job) {
  switch (job) {
	case 1: return { name: 'Blade Master', imageUrl: '/images/jobs/class-icons-blademaster.png' };
    case 2: return { name: 'Kung Fu Master', imageUrl: '/images/jobs/class-icons-kungfumaster.png' };
	case 3: return { name: 'Force Master', imageUrl: '/images/jobs/class-icons-forcemaster.png' };
	case 4: return { name: 'Gunslinger', imageUrl: '/images/jobs/class-icons-gunslinger.png' };
    case 5: return { name: 'Destroyer', imageUrl: '/images/jobs/class-icons-destroyer.png' };
    case 6: return { name: 'Summoner', imageUrl: '/images/jobs/class-icons-summoner.png' };
	case 7: return { name: 'Assassin', imageUrl: '/images/jobs/class-icons-assassin.png' };
    case 8: return { name: 'Blade Dancer', imageUrl: '/images/jobs/class-icons-bladedancer.png' };	
    case 9: return { name: 'Warlock', imageUrl: '/images/jobs/class-icons-warlock.png' };
	case 10: return { name: 'Soul Fighter', imageUrl: '/images/jobs/class-icons-soulfighter.png' };
    case 11: return { name: 'Wargen', imageUrl: '/images/jobs/class-icons-warden.png' };
    case 12: return { name: 'Zen Archer', imageUrl: '/images/jobs/class-icons-zenarcher.png' };
    case 13: return { name: 'Astromancer', imageUrl: '/images/jobs/class-icons-astromancer.png' };
    case 14: return { name: 'Dual Blade', imageUrl: '/images/jobs/class-icons-dualblade.png' };
    default: return { name: 'Unknown', imageUrl: '/images/jobs/class-icons-unknown.png' };
  }
}
