const roles = {
  ADMIN: 'admin',
  PHARMACY: 'pharmacy',
  USER: 'user'
};

const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    console.log('🔒 [RBAC] Checking role access:', {
      path: req.path,
      user: req.user ? {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email
      } : 'No user',
      allowedRoles
    });

    if (!req.user) {
      console.warn('⚠️ [RBAC] No user in request');
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required',
        code: 'UNAUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn('⛔ [RBAC] Insufficient permissions:', {
        required: allowedRoles,
        userRole: req.user.role,
        userId: req.user.id
      });
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    console.log('✅ [RBAC] Access granted');
    next();
  };
};

module.exports = {
  roles,
  checkRole
};
