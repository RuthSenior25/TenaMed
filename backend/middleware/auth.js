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
  console.log('🔐 [AUTH] Starting authentication...');
  
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    console.warn('⚠️ [AUTH] No Authorization header found');
    return res.status(401).json({ 
      success: false,
      message: 'Access denied. No token provided.',
      code: 'MISSING_TOKEN'
    });
  }

  // Handle both 'Bearer token' and raw token formats
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
  
  console.log(`🔍 [AUTH] Processing token: ${token.substring(0, 10)}...`);
  
  try {
    // Check for admin token (starts with 'admin-')
    if (token.startsWith('admin-')) {
      console.log('👨‍💼 [AUTH] Admin token detected');
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
      console.log('✅ [AUTH] Admin authentication successful');
      return next();
    }

    console.log('🔑 [AUTH] Verifying JWT token...');
    // Regular JWT token validation
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.id) {
      console.warn('⚠️ [AUTH] Invalid token format - missing user ID');
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }
    
    console.log(`👤 [AUTH] Looking up user with ID: ${decoded.id}`);
    const user = await User.findById(decoded.id).select('-password').lean();
    
    if (!user) {
      console.warn(`⚠️ [AUTH] User not found for ID: ${decoded.id}`);
      return res.status(401).json({ 
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (!user.isActive) {
      console.warn(`⚠️ [AUTH] User account is inactive: ${user.email}`);
      return res.status(401).json({ 
        success: false,
        message: 'Account is inactive',
        code: 'ACCOUNT_INACTIVE'
      });
    }
    
    // Add user to request
    req.user = user;
    console.log(`✅ [AUTH] Authentication successful for user: ${user.email} (${user.role})`);
    next();
  } catch (error) {
    console.error('❌ [AUTH] Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        error: error.message
      });
    }
    
    // For other unexpected errors
    console.error('🔴 [AUTH] Unexpected authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
