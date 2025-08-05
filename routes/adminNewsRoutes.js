import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isAdmin } from '../middleware/adminMiddleware.js';
import * as cheerio from 'cheerio'; // Измененный импорт для cheerio

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsFilePath = path.join(__dirname, '../views/partials/events.ejs');

// GET - страница редактирования
router.get('/admin/edit-news', isAdmin, (req, res) => {
    fs.readFile(eventsFilePath, 'utf-8', (err, data) => {
        if (err) {
            console.error('Ошибка чтения файла events.ejs:', err);
            return res.status(500).send('Ошибка загрузки новостей.');
        }

        // Парсим HTML для выделения новостей
        const $ = cheerio.load(data);

        const events = [];
        $('.carousel-item').each((i, el) => {
            const title = $(el).find('.card-title').text().trim();
            const text = $(el).find('.card-text').text().trim();
            events.push({
                title,
                text
            });
        });

        // Передаем pathname вместе с events
        res.render('editNews', {
            events,
            pathname: req.originalUrl
        });
    });
});

// POST - сохранение новостей
router.post('/admin/edit-news', isAdmin, (req, res) => {
    const { events } = req.body; // ожидаем массив с событиями

    // Формируем HTML для событий
    let html = `<!-- Вертикальная карусель -->
<div id="eventsCarousel" class="carousel slide" data-bs-ride="carousel" data-bs-interval="3000" style="display:none;">
    <div class="carousel-inner">`;

    if (Array.isArray(events)) {
        events.forEach((event, idx) => {
            const activeClass = idx === 0 ? ' active' : '';
            const safeTitle = event.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeText = event.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            html += `
        <div class="carousel-item${activeClass}">
            <div class="card" style="background: rgba(0, 0, 0, 0.7); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);">
                <div class="card-body">
                    <h5 class="card-title text-light" style="margin-top: -0.5rem; margin-bottom: 1.5rem;">${safeTitle}</h5>
                    <p class="card-text text-light">${safeText}</p>
                </div>
            </div>
        </div>`;
        });
    }

    html += `
    </div>
</div>`;

    fs.writeFile(eventsFilePath, html, 'utf-8', (err) => {
        if (err) {
            console.error('Ошибка сохранения файла events.ejs:', err);
            return res.status(500).send('Ошибка сохранения.');
        }
        res.redirect('/admin/edit-news');
    });
});

export default router;
