const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groups.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', (req, res, next) => groupsController.list(req, res, next));
router.post('/sync-all', (req, res, next) => groupsController.syncAllPermissions(req, res, next));
router.get('/:id', (req, res, next) => groupsController.getById(req, res, next));
router.post('/', (req, res, next) => groupsController.create(req, res, next));
router.put('/:id', (req, res, next) => groupsController.update(req, res, next));
router.post('/:id/test-permissions', (req, res, next) => groupsController.testPermissions(req, res, next));
router.delete('/:id', (req, res, next) => groupsController.delete(req, res, next));

module.exports = router;
