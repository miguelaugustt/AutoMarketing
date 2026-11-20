const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { JWT_SECRET } = require('../middleware/auth.middleware');

class AuthController {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Usuário e senha são obrigatórios.'
        });
      }

      const adminUser = process.env.ADMIN_USER || 'admin';
      const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

      // Validação de credenciais do administrador
      const isValidUser = username.trim() === adminUser;
      let isValidPass = password === adminPass;

      // Se existir hash salvo no banco, valida pelo bcrypt
      const savedHash = await db.getSetting('admin_password_hash');
      if (savedHash && !isValidPass) {
        try {
          isValidPass = await bcrypt.compare(password, savedHash);
        } catch (e) {
          // fallback
        }
      }

      if (!isValidUser || !isValidPass) {
        return res.status(401).json({
          success: false,
          error: 'Credenciais inválidas. Verifique o usuário e a senha.'
        });
      }

      const payload = {
        username: adminUser,
        role: 'admin'
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        success: true,
        message: 'Autenticação realizada com sucesso.',
        token,
        user: { username: adminUser, role: 'admin' }
      });
    } catch (error) {
      next(error);
    }
  }

  async verify(req, res) {
    return res.json({
      success: true,
      user: req.user
    });
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'A nova senha deve possuir no mínimo 6 caracteres.'
        });
      }

      const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
      const savedHash = await db.getSetting('admin_password_hash');

      let currentValid = currentPassword === adminPass;
      if (savedHash && !currentValid) {
        currentValid = await bcrypt.compare(currentPassword, savedHash);
      }

      if (!currentValid) {
        return res.status(400).json({
          success: false,
          error: 'Senha atual incorreta.'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);
      await db.setSetting('admin_password_hash', newHash);

      return res.json({
        success: true,
        message: 'Senha alterada com sucesso.'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
