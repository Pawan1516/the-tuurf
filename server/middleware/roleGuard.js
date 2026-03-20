const roleGuard = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized - No user found' });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const normalizedAllowedRoles = allowedRoles.map(role => role.toUpperCase());

    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
    }

    next();
  };
};

module.exports = roleGuard;
