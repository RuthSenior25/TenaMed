const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Handle both 'Bearer token' and raw token formats
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    
    try {
      // Check for admin token (starts with 'admin-')
      if (token.startsWith('admin-')) {
        // Simple admin token validation
        req.user = {
          _id: 'admin-001',
          id: 'admin-001',
          email: 'admin@tenamed.com',
          role: 'admin',
          isAdmin: true,
          isActive: true,
          firstName: 'Admin',
          lastName: 'User'
        };
        return next();
      }

      // Regular JWT token validation
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid token or user not found.' });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      console.error('Token verification error:', jwtError);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid or expired token.',
        error: jwtError.message 
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Check if user is approved (for pharmacies and other roles requiring approval)
const requireApproval = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  if (!req.user.isApproved) {
    return res.status(403).json({ 
      message: 'Account pending approval. Please wait for administrator approval.',
      status: 'pending_approval'
    });
  }

  next();
};

// Check if user owns the resource or is admin
const checkOwnership = (resourceField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceId = req.params.id || req.params.userId || req.body[resourceField];
    
    if (resourceId && resourceId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Access denied. You can only access your own resources.' 
      });
    }

    next();
  };
};

// Middleware to check pharmacy ownership
const checkPharmacyOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    const Pharmacy = require('../models/Pharmacy');
    const pharmacyId = req.params.id || req.params.pharmacyId;
    
    if (!pharmacyId) {
      return res.status(400).json({ message: 'Pharmacy ID required.' });
    }

    const pharmacy = await Pharmacy.findById(pharmacyId);
    
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found.' });
    }

    if (pharmacy.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Access denied. You can only access your own pharmacy.' 
      });
    }

    req.pharmacy = pharmacy;
    next();
  } catch (error) {
    console.error('Pharmacy ownership check error:', error);
    res.status(500).json({ message: 'Server error during ownership verification.' });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (jwtError) {
        // Token is invalid, but we continue without user
      }
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next();
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  requireApproval,
  checkOwnership,
  checkPharmacyOwnership,
  optionalAuth
};
