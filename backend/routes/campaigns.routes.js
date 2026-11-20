const express = require('express');
const router = express.Router();
const campaignsController = require('../controllers/campaigns.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', (req, res, next) => campaignsController.list(req, res, next));
router.get('/:id', (req, res, next) => campaignsController.getById(req, res, next));
router.post('/', (req, res, next) => campaignsController.create(req, res, next));
router.put('/:id', (req, res, next) => campaignsController.update(req, res, next));
router.patch('/:id/toggle-status', (req, res, next) => campaignsController.toggleStatus(req, res, next));
router.post('/:id/trigger', (req, res, next) => campaignsController.triggerRun(req, res, next));
router.post('/preview', (req, res, next) => campaignsController.previewTemplate(req, res, next));
router.delete('/:id', (req, res, next) => campaignsController.delete(req, res, next));

module.exports = router;
