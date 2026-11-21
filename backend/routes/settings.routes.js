const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', (req, res, next) => settingsController.getSettings(req, res, next));
router.put('/', (req, res, next) => settingsController.updateSettings(req, res, next));
router.post('/test-telegram', (req, res, next) => settingsController.testTelegramBot(req, res, next));
router.post('/test-meta', (req, res, next) => settingsController.testMetaToken(req, res, next));

module.exports = router;
