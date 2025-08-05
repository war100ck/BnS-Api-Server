import express from 'express';
import { isAdmin } from '../middleware/adminMiddleware.js';
import { restartServer } from '../utils/serverManager.js';

const router = express.Router();

router.post('/admin/server/restart', isAdmin, async(req, res) => {
    try {
        const result = await restartServer();

        if (result.success) {
            req.session.success = result.message;
        } else {
            req.session.error = result.message;
        }

        res.redirect('/admin/apiconfig');
    } catch (error) {
        console.error('Error in server restart:', error);
        req.session.error = 'Failed to restart server';
        res.redirect('/admin/apiconfig');
    }
});

export default router;
