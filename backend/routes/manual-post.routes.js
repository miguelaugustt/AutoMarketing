const express = require('express');
const multer = require('multer');
const path = require('path');
const { authMiddleware } = require('../middleware/auth.middleware');
const manualPostController = require('../controllers/manual-post.controller');

const router = express.Router();

// Configuração do Multer para upload de mídia
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB máximo
  fileFilter: (req, file, cb) => {
    const allowedImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideo = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (allowedImage.includes(file.mimetype) || allowedVideo.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use apenas imagens (JPG, PNG, WEBP) ou vídeos (MP4, MOV, WEBM).'), false);
    }
  }
});

router.use(authMiddleware);

router.get('/groups', (req, res, next) => manualPostController.listGroupsForManualPost(req, res, next));
router.post('/send', upload.fields([{ name: 'image_file', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), (req, res, next) => manualPostController.sendManualPost(req, res, next));

module.exports = router;
