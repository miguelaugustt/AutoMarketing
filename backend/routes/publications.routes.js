const express = require('express');
const router = express.Router();
const publicationsController = require('../controllers/publications.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', (req, res, next) => publicationsController.list(req, res, next));
router.get('/:id', (req, res, next) => publicationsController.getById(req, res, next));
router.post('/:id/retry', (req, res, next) => publicationsController.retry(req, res, next));
router.post('/:id/cancel', (req, res, next) => publicationsController.cancel(req, res, next));
router.delete('/:id', (req, res, next) => publicationsController.delete(req, res, next));

module.exports = router;
