import os
import hashlib
import json
import logging

# Настройка логирования для консоли и лог файла
console_handler = logging.StreamHandler()
file_handler = logging.FileHandler("manifest_generator.log", mode="w", encoding="utf-8")

# Устанавливаем формат для логирования
formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
console_handler.setFormatter(formatter)
file_handler.setFormatter(formatter)

# Подключаем обработчики
logging.basicConfig(
    level=logging.INFO,
    handlers=[console_handler, file_handler]
)

# Исключенные файлы и папки
EXCLUDED_PATHS = {
    ".gitattributes",
    ".gitignore",
    "Manifest.py",
    "manifest — копия.json",
    "Manifest — копия.py",
    "manifest_generator.log",
    "Start_Api.bat",
    ".git/",
    "screen/"
}

def is_excluded(path, root):
    """
    Проверяет, находится ли путь в списке исключений.
    """
    for excluded in EXCLUDED_PATHS:
        if excluded.endswith("/") and excluded in path:  # Проверка на директорию
            return True
        if os.path.basename(path) == excluded:  # Проверка на файл
            return True
    return False

def calculate_file_hash(file_path):
    """
    Вычисляет SHA-1 хэш для файла.
    """
    sha1 = hashlib.sha1()
    with open(file_path, "rb") as file:
        while chunk := file.read(8192):
            sha1.update(chunk)
    return sha1.hexdigest()

def generate_manifest(directory):
    """
    Генерирует манифест для всех файлов в указанной директории.
    """
    manifest = {}
    for root, _, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            relative_path = os.path.relpath(file_path, directory).replace("\\", "/")
            if is_excluded(relative_path, root):
                continue
            # Логируем обработку каждого файла в консоль
            logging.info(f"Обрабатывается файл: {relative_path}")
            manifest[relative_path] = calculate_file_hash(file_path)
    return manifest

def save_manifest(manifest, output_file="manifest.json"):
    """
    Сохраняет манифест в файл.
    """
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

def load_manifest(input_file="manifest.json"):
    """
    Загружает ранее сохраненный манифест, если он существует.
    """
    if os.path.exists(input_file):
        with open(input_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def compare_manifests(old_manifest, new_manifest):
    """
    Сравнивает два манифеста и логирует добавленные и измененные файлы.
    Логирует хеши для каждого файла.
    """
    added_files = []
    modified_files = []

    # Проверяем добавленные и измененные файлы
    for file, new_hash in new_manifest.items():
        if file not in old_manifest:
            added_files.append((file, new_hash))  # Добавляем новые файлы с их хешем
        elif old_manifest[file] != new_hash:
            modified_files.append((file, old_manifest[file], new_hash))  # Файлы с изменённым хешем

    # Логируем добавленные файлы в консоль
    if added_files:
        logging.info("Добавлены следующие файлы:")
        for file, new_hash in added_files:
            logging.info(f"  {file}: Новый хеш: {new_hash}")

    # Логируем измененные файлы в консоль
    if modified_files:
        logging.info("Изменены следующие файлы:")
        for file, old_hash, new_hash in modified_files:
            logging.info(f"  {file}: Старый хеш: {old_hash} -> Новый хеш: {new_hash}")

    # Записываем только добавленные и измененные файлы в лог файл
    if added_files or modified_files:
        with open("manifest_generator.log", "a", encoding="utf-8") as log_file:
            if added_files:
                log_file.write(f"\nДобавлены следующие файлы:\n")
                for file, new_hash in added_files:
                    log_file.write(f"  {file}: Новый хеш: {new_hash}\n")

            if modified_files:
                log_file.write(f"\nИзменены следующие файлы:\n")
                for file, old_hash, new_hash in modified_files:
                    log_file.write(f"  {file}: Старый хеш: {old_hash} -> Новый хеш: {new_hash}\n")

if __name__ == "__main__":
    # Укажите каталог, для которого нужно создать манифест
    directory_to_scan = "./"  # По умолчанию текущая директория

    # Загружаем старый манифест (если он есть)
    old_manifest = load_manifest()

    # Генерируем новый манифест
    new_manifest = generate_manifest(directory_to_scan)

    # Сравниваем старый и новый манифесты
    compare_manifests(old_manifest, new_manifest)

    # Сохранение нового манифеста
    save_manifest(new_manifest)
    logging.info("Манифест успешно создан.")

    # Ждем ввода, чтобы консоль не закрылась
    input("Нажмите Enter, чтобы выйти...")
