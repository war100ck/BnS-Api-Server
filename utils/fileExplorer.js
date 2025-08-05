import fs from 'fs';
import path from 'path';

export class FileExplorer {
  listDirectory(dirPath) {
    try {
      const normalizedPath = path.normalize(dirPath);
      
      if (!fs.existsSync(normalizedPath)) {
        return {
          path: dirPath,
          directories: [],
          files: [],
          error: 'Directory does not exist'
        };
      }

      const stats = fs.statSync(normalizedPath);
      if (!stats.isDirectory()) {
        return {
          path: dirPath,
          directories: [],
          files: [],
          error: 'Path is not a directory'
        };
      }

      const items = fs.readdirSync(normalizedPath);
      const result = {
        path: normalizedPath,
        directories: [],
        files: []
      };

      items.forEach(item => {
        try {
          const fullPath = path.join(normalizedPath, item);
          const itemStats = fs.statSync(fullPath);
          
          if (itemStats.isDirectory()) {
            result.directories.push(item);
          } else {
            result.files.push(item);
          }
        } catch (error) {
          console.error(`Error reading ${item}:`, error);
        }
      });

      // Сортировка (директории сверху, файлы снизу)
      result.directories.sort((a, b) => a.localeCompare(b));
      result.files.sort((a, b) => a.localeCompare(b));

      return result;
    } catch (error) {
      console.error('Error listing directory:', error);
      return {
        path: dirPath,
        directories: [],
        files: [],
        error: error.message
      };
    }
  }

  listDrives() {
    try {
      // Для Windows получаем список дисков
      if (process.platform === 'win32') {
        const drives = [];
        for (let i = 65; i <= 90; i++) {
          const drive = String.fromCharCode(i) + ':\\';
          if (fs.existsSync(drive)) {
            drives.push(drive);
          }
        }
        return drives;
      } else {
        // Для Unix-систем возвращаем корень
        return ['/'];
      }
    } catch (error) {
      console.error('Error listing drives:', error);
      return [];
    }
  }
}

// Экспорт экземпляра по умолчанию
export default new FileExplorer();