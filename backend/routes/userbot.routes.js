const express = require('express');
const router = express.Router();
const userbotController = require('../controllers/userbot.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/status', (req, res, next) => userbotController.getStatus(req, res, next));
router.post('/send-code', (req, res, next) => userbotController.sendCode(req, res, next));
router.post('/sign-in', (req, res, next) => userbotController.signIn(req, res, next));
router.post('/disconnect', (req, res, next) => userbotController.disconnect(req, res, next));
router.post('/join', (req, res, next) => userbotController.joinGroup(req, res, next));
router.post('/test-login', (req, res, next) => userbotController.testLogin(req, res, next));

module.exports = router;
