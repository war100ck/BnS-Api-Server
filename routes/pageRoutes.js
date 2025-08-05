import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Статическая папка для HTML файлов (которые не требуют обработки сервером)
router.use('/in-game-web', express.static(path.join(__dirname, '../views/in-game-web')));

// Динамичные страницы с использованием EJS
// Страница с анонсом
router.get('/announcement', (req, res) => {
    res.render('announcement', {
        title: 'Announcement',
        message: 'New game update incoming!'
    });
});

// Страница запросов и петиций
router.get('/requests-and-petitions', (req, res) => {
    res.render('requests-and-petitions', {
        title: 'Requests and Petitions',
        message: 'Submit your requests here!'
    });
});

// Страница магазина
router.get('/store', (req, res) => {
    res.render('store', {
        title: 'Game Store',
        message: 'Shop for the latest items!'
    });
});

// Пример других страниц с динамическими данными
router.get('/game-news', (req, res) => {
    res.render('game-news', {
        title: 'Game News',
        message: 'Latest news and updates about the game!'
    });
});

router.get('/game-update-1', (req, res) => {
    res.render('game-update-1', {
        title: 'Game Update 1',
        message: 'New features in this update!'
    });
});

router.get('/game-update-2', (req, res) => {
    res.render('game-update-2', {
        title: 'Game Update 2',
        message: 'More exciting updates!'
    });
});

export default router;
