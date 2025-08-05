-- Скрипт изменяет значение в колонке FileName для всех предметов в таблице GameItems на одно изображение 'testItem.png'.
-- Это обновит имя файла для всех записей в таблице, заменив существующие значения на 'testItem.png'.

-- This script changes the value in the FileName column for all items in the GameItems table to a single image 'testItem.png'.
-- It will update the file name for all records in the table, replacing existing values with 'testItem.png'.

USE GameItemsDB; -- Переключаемся на базу данных GameItemsDB, чтобы работать с нужной базой
-- Switching to the GameItemsDB database to work with the required database.

UPDATE GameItems -- Обновляем таблицу GameItems
-- Updating the GameItems table.
SET FileName = 'testItem.png'; -- Устанавливаем новое значение 'testItem.png' в колонке FileName для всех строк в таблице
-- Setting the new value 'testItem.png' in the FileName column for all rows in the table.
