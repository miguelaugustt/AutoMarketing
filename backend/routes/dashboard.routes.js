const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/stats', (req, res, next) => dashboardController.getStats(req, res, next));
router.post('/toggle-emergency', (req, res, next) => dashboardController.toggleEmergencyPause(req, res, next));
router.post('/trigger-run', (req, res, next) => dashboardController.triggerManualRun(req, res, next));

module.exports = router;
