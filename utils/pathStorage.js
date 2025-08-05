import fs from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const STORAGE_FILE = path.join(CONFIG_DIR, 'lastSession.json');

class PathStorage {
  constructor() {
    this.lastData = {
      path: 'D:\\StartServer',
      batFile: null
    };
    this.ensureConfigDirExists();
    this.load();
  }

  ensureConfigDirExists() {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR);
      }
    } catch (error) {
      console.error('Error creating config directory:', error);
    }
  }

  load() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const data = fs.readFileSync(STORAGE_FILE, 'utf8');
        this.lastData = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading last session data:', error);
    }
  }

  save(newPath, batFile = null) {
    try {
      this.lastData.path = newPath;
      if (batFile) {
        this.lastData.batFile = batFile;
      }
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(this.lastData, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving last session data:', error);
    }
  }

  getLastPath() {
    return this.lastData.path;
  }

  getLastBatFile() {
    return this.lastData.batFile;
  }
}

export default new PathStorage();