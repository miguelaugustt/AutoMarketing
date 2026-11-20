const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', (req, res, next) => productsController.list(req, res, next));
router.get('/:id', (req, res, next) => productsController.getById(req, res, next));
router.post('/', (req, res, next) => productsController.create(req, res, next));
router.put('/:id', (req, res, next) => productsController.update(req, res, next));
router.patch('/:id/toggle-active', (req, res, next) => productsController.toggleActive(req, res, next));
router.delete('/:id', (req, res, next) => productsController.delete(req, res, next));

module.exports = router;
