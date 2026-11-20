const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.post('/login', (req, res, next) => authController.login(req, res, next));
router.get('/verify', authMiddleware, (req, res, next) => authController.verify(req, res, next));
router.post('/change-password', authMiddleware, (req, res, next) => authController.changePassword(req, res, next));

module.exports = router;
