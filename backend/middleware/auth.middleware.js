const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'automarketing_super_secret_jwt_key_2026';

function authMiddleware(req, res, next) {
  // Permite requisições OPTIONS pré-voo
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Acesso negado. Token de autenticação não fornecido ou inválido.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Sessão expirada ou token inválido. Por favor, faça login novamente.'
    });
  }
}

module.exports = {
  authMiddleware,
  JWT_SECRET
};
