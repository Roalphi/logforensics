const jwt = require('jsonwebtoken');
const { users } = require('../data/seed');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'trace-x-dev-secret');
    const user = users.find((entry) => entry.email === payload.email);

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
}

function authorizeRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'This action is not permitted for your role.' });
    }

    next();
  };
}

module.exports = { authenticateToken, authorizeRole };
