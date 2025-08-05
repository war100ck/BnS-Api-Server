import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const restartServer = async () => {
    try {
        const batPath = path.join(__dirname, '..', 'Restart_Api.bat');
        exec(`"${batPath}"`, { windowsHide: true });
        return { success: true, message: 'Server restart initiated' };
    } catch (error) {
        console.error('Restart error:', error);
        return { success: false, message: error.message };
    }
};

export { restartServer };