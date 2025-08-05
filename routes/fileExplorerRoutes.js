import { Router } from 'express';
import { isAdmin } from '../middleware/adminMiddleware.js';
import fileExplorer from '../utils/fileExplorer.js';
import pathStorage from '../utils/pathStorage.js';

const router = Router();

router.get('/api/files/list', isAdmin, (req, res) => {
    const dirPath = req.query.path || pathStorage.getLastPath();
    const result = fileExplorer.listDirectory(dirPath);

    if (result.error) {
        return res.status(400).json({
            error: result.error,
            path: result.path
        });
    }

    pathStorage.save(dirPath);
    res.json(result);
});

router.get('/api/files/last-session', isAdmin, (req, res) => {
    res.json({
        path: pathStorage.getLastPath(),
        batFile: pathStorage.getLastBatFile()
    });
});

router.get('/api/files/drives', isAdmin, (req, res) => {
    const drives = fileExplorer.listDrives();
    res.json({ drives });
});

export default router;