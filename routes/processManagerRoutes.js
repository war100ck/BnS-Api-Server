import { Router } from 'express';
import { isAdmin } from '../middleware/adminMiddleware.js';
import ProcessManager from '../utils/processManager.js';
import pathStorage from '../utils/pathStorage.js';
import fileExplorer from '../utils/fileExplorer.js';
import fs from 'fs';
import path from 'path';

const router = Router();
const processManager = new ProcessManager();

const CONFIG_DIR = path.join(process.cwd(), 'config');
const SELECTED_PROCESSES_FILE = path.join(CONFIG_DIR, 'selectedProcesses.json');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR);
}

// Initialize selected processes file if not exists
if (!fs.existsSync(SELECTED_PROCESSES_FILE)) {
    fs.writeFileSync(SELECTED_PROCESSES_FILE, JSON.stringify({ 
        batFile: null, 
        selectedProcesses: [],
        hasSelected: false 
    }), 'utf8');
}

router.get('/admin/processes', isAdmin, (req, res) => {
    let selectedProcesses = [];

    if (fs.existsSync(SELECTED_PROCESSES_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(SELECTED_PROCESSES_FILE, 'utf8'));
            selectedProcesses = data.selectedProcesses || [];
        } catch (error) {
            console.error('Ошибка при чтении selectedProcesses:', error);
        }
    }

    res.render('processes', {
        pathname: req.originalUrl,
        selectedProcesses
    });
});

router.get('/admin/processes/list', isAdmin, async (req, res) => {
    if (!req.query.batFilePath) {
        return res.status(400).json({
            error: 'BAT file path not specified'
        });
    }

    try {
        const processes = await processManager.checkAllProcessesStatus(req.query.batFilePath);
        
        // Load selected processes from config
        let selectedProcesses = [];
        if (fs.existsSync(SELECTED_PROCESSES_FILE)) {
            const data = JSON.parse(fs.readFileSync(SELECTED_PROCESSES_FILE, 'utf8'));
            if (data.batFile === req.query.batFilePath) {
                selectedProcesses = data.selectedProcesses || [];
            }
        }
        
        // Add selected flag to processes
        const processesWithSelection = processes.map(p => ({
            ...p,
            selected: selectedProcesses.includes(p.name)
        }));
        
        res.json(processesWithSelection);
    } catch (error) {
        res.status(500).json({
            error: 'Error reading processes',
            details: error.message
        });
    }
});

router.post('/admin/processes/:action(start|stop|start-all|stop-all)/:name?', isAdmin, async (req, res) => {
    try {
        let result;
        const { batFilePath } = req.body;

        if (!batFilePath) {
            return res.status(400).json({
                error: 'BAT file path not specified'
            });
        }

        switch (req.params.action) {
            case 'start':
                result = await processManager.startProcess(batFilePath, req.params.name);
                break;
            case 'stop':
                result = await processManager.stopProcess(batFilePath, req.params.name);
                break;
            case 'start-all':
                result = await processManager.startAllProcesses(batFilePath);
                break;
            case 'stop-all':
                result = await processManager.stopAllProcesses(batFilePath);
                break;
            default:
                return res.status(400).json({
                    error: 'Invalid action'
                });
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: `Error during ${req.params.action}`,
            details: error.message
        });
    }
});

// Save selected processes
router.post('/api/files/save-selected', isAdmin, (req, res) => {
    try {
        const { batFile, selectedProcesses, hasSelected } = req.body;
        fs.writeFileSync(SELECTED_PROCESSES_FILE, JSON.stringify({ 
            batFile, 
            selectedProcesses,
            hasSelected 
        }, null, 2), 'utf8');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            error: 'Error saving selected processes',
            details: error.message
        });
    }
});

router.get('/api/files/get-selected', isAdmin, (req, res) => {
    try {
        if (fs.existsSync(SELECTED_PROCESSES_FILE)) {
            const data = JSON.parse(fs.readFileSync(SELECTED_PROCESSES_FILE, 'utf8'));
            res.json(data);
        } else {
            res.json({ 
                batFile: null, 
                selectedProcesses: [],
                hasSelected: false 
            });
        }
    } catch (error) {
        res.status(500).json({
            error: 'Error loading selected processes',
            details: error.message
        });
    }
});

// File operations
router.get('/api/files/list', isAdmin, (req, res) => {
    const dirPath = req.query.path || pathStorage.getLastPath();
    const batFile = req.query.batFile || null;
    const result = fileExplorer.listDirectory(dirPath);

    if (result.error) {
        return res.status(400).json({
            error: result.error,
            path: result.path
        });
    }

    pathStorage.save(dirPath, batFile);
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

// New endpoint to get selected processes
router.get('/api/files/get-selected', isAdmin, (req, res) => {
    try {
        if (fs.existsSync(SELECTED_PROCESSES_FILE)) {
            const data = JSON.parse(fs.readFileSync(SELECTED_PROCESSES_FILE, 'utf8'));
            res.json(data);
        } else {
            res.json({ batFile: null, selectedProcesses: [] });
        }
    } catch (error) {
        res.status(500).json({
            error: 'Error loading selected processes',
            details: error.message
        });
    }
});

export default router;