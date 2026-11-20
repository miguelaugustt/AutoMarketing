const express = require('express');
const router = express.Router();
const prospectorController = require('../controllers/prospector.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/search', (req, res, next) => prospectorController.search(req, res, next));
router.get('/export-csv', (req, res, next) => prospectorController.exportCsv(req, res, next));
router.post('/import', (req, res, next) => prospectorController.import(req, res, next));

module.exports = router;
