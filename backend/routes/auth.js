const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { authenticate, authorize, generateToken } = require('../middleware/auth');
const Pharmacy = require('../models/Pharmacy');
const { checkRole, roles } = require('../middleware/roles');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

// Health check endpoint
router.get('/health', (req, res) => {
  console.log('✅ Health check passed');
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get current user info
router.get('/me', authenticate, (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    // Don't send sensitive data
    const { password, ...userData } = req.user;
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data',
      code: 'SERVER_ERROR'
    });
  }
});

// Register new user
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { username, email, password, role, profile, pharmacyName, location } = req.body;

    // Log the incoming request for debugging
    console.log('Registration attempt:', { 
      username, 
      email, 
      role,
      hasProfile: !!profile,
      pharmacyName,
      hasLocation: !!location
    });

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Additional validation for pharmacy registration
    if (role === 'pharmacy' && !pharmacyName) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacy name is required'
      });
    }

    // Create user data object
    const userData = {
      username,
      email,
      password,
      role,
      profile,
      isApproved: role !== 'pharmacy', // Only auto-approve non-pharmacy users
      status: role === 'pharmacy' ? 'pending' : 'approved'
    };

    // Add pharmacy name if role is pharmacy
    if (role === 'pharmacy') {
      userData.pharmacyName = pharmacyName;
      
      // Add pharmacy location if provided
      if (location && location.type === 'Point' && location.coordinates) {
        userData.pharmacyLocation = {
          type: 'Point',
          coordinates: location.coordinates, // Keep as [lng, lat] for MongoDB
          address: profile?.address || '',
          city: profile?.city || '',
          postalCode: profile?.zipCode || ''
        };
        console.log('Saving pharmacy location:', userData.pharmacyLocation);
      }
    }

    // Create new user
    const user = new User(userData);

    // Save user to database
    await user.save();

    // Generate token
    const token = generateToken({ id: user._id, role: user.role });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Prepare response data
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profile: user.profile,
      isApproved: user.isApproved,
      status: user.status,
      isActive: user.isActive
    };

    // Add pharmacy name to response if available
    if (user.pharmacyName) {
      userResponse.pharmacyName = user.pharmacyName;
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. ' + 
        (role === 'pharmacy' ? 'Your account is pending admin approval.' : ''),
      token,
      user: userResponse
    });

  } catch (error) {
    // Enhanced error logging
    console.error('Registration error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyValue: error.keyValue,
      errors: error.errors ? Object.entries(error.errors).map(([key, value]) => ({
        field: key,
        message: value.message,
        type: value.kind
      })) : null,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => ({
        field: val.path,
        message: val.message,
        type: val.kind
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `A user with this ${field} already exists`,
        field,
        value: error.keyValue[field]
      });
    }

    // Handle other errors
    const errorResponse = {
      success: false,
      message: 'An error occurred during registration',
      error: error.message
    };

    // Add more details in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = {
        name: error.name,
        code: error.code,
        stack: error.stack
      };
    }

    res.status(500).json(errorResponse);
  }
});

// Login user
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account has been deactivated' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Log user details for debugging
    console.log('User login details:', {
      id: user._id,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      status: user.status,
      createdAt: user.createdAt
    });

    // Generate token
    const token = generateToken({ id: user._id, role: user.role });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        isApproved: user.isApproved,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require('../middleware/auth');
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token or user not found.' });
    }

    // If user is a pharmacy, also fetch pharmacy details
    let pharmacy = null;
    if (user.role === 'pharmacy') {
      pharmacy = await Pharmacy.findOne({ owner: user._id });
    }

    res.json({
      user,
      pharmacy
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require('../middleware/auth');
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token or user not found.' });
    }

    // Generate new token
    const newToken = generateToken({ id: user._id, role: user.role });

    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Logout (client-side token removal, but we can update last activity)
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { verifyToken } = require('../middleware/auth');
      const decoded = verifyToken(token);

      // Update user's last activity
      await User.findByIdAndUpdate(decoded.id, { lastLogin: new Date() });
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ message: 'Logout successful' }); // Still return success for client-side cleanup
  }
});

// Get pending pharmacy registrations (Admin only)
router.get(
  '/pending-pharmacies',
  authenticate,
  checkRole(roles.ADMIN),
  async (req, res) => {
    console.log('🔵 [API] /pending-pharmacies - Request received');
    
    try {
      console.log('🔍 [API] Querying pending pharmacies...');
      const startTime = Date.now();
      
      const query = { 
        role: roles.PHARMACY,
        $or: [
          { isApproved: false },
          { isApproved: { $exists: false } },
          { status: 'pending' }
        ]
      };

      const pharmacies = await User.find(query)
        .select('-password')
        .lean()
        .maxTimeMS(5000) // 5 second timeout
        .limit(100); // Limit results

      console.log(`✅ [API] Found ${pharmacies.length} pharmacies in ${Date.now() - startTime}ms`);

      return res.json({
        success: true,
        data: pharmacies,
        meta: {
          count: pharmacies.length,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ [API] Error in /pending-pharmacies:', {
        error: error.message,
        code: error.code,
        name: error.name
      });

      // Handle database errors
      if (error.name === 'MongoError' && error.code === 50) {
        return res.status(504).json({
          success: false,
          message: 'Database operation timed out',
          code: 'DB_TIMEOUT'
        });
      }

      // For other errors
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch pending pharmacies',
        code: 'SERVER_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
          error: error.message,
          stack: error.stack
        })
      });
    }
  }
);

// Approve/Reject pharmacy
router.patch('/pharmacy/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be approved or rejected.' });
    }

    // Find and update pharmacy
    const pharmacy = await User.findById(id).populate('profile');
    if (!pharmacy || pharmacy.role !== 'pharmacy') {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    // Update approval status
    pharmacy.isApproved = status === 'approved';
    pharmacy.status = status;
    
    if (status === 'rejected' && rejectionReason) {
      pharmacy.rejectionReason = rejectionReason;
    } else if (status === 'approved') {
      pharmacy.rejectionReason = undefined; // Clear rejection reason if approved
    }

    await pharmacy.save();
    
    res.json({ 
      message: `Pharmacy ${status} successfully`,
      pharmacy: {
        id: pharmacy._id,
        name: pharmacy.pharmacyName || `${pharmacy.profile?.firstName}'s Pharmacy`,
        status: pharmacy.isApproved ? 'approved' : 'rejected'
      }
    });
  } catch (error) {
    console.error('Error updating pharmacy status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get approved pharmacies with location filtering
router.get('/approved-pharmacies', async (req, res) => {
  try {
    console.log('Fetching approved pharmacies...'); // Debug log
    
    const { 
      lat, 
      lng, 
      radius = 10, // Default 10km radius
      city 
    } = req.query;
    
    let query = { 
      role: 'pharmacy', 
      status: 'approved',
      isActive: true 
    };
    
    // If location coordinates are provided, add geospatial filtering
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const searchRadius = parseFloat(radius) || 10;
      
      // Find pharmacies within radius (simplified distance calculation)
      query['pharmacyLocation.coordinates.lat'] = {
        $gte: userLat - (searchRadius / 111), // Approximate degrees
        $lte: userLat + (searchRadius / 111)
      };
      query['pharmacyLocation.coordinates.lng'] = {
        $gte: userLng - (searchRadius / (111 * Math.cos(userLat * Math.PI / 180))),
        $lte: userLng + (searchRadius / (111 * Math.cos(userLat * Math.PI / 180)))
      };
    } else if (city) {
      // Filter by city if no coordinates provided
      query['pharmacyLocation.city'] = { 
        $regex: city, 
        $options: 'i' 
      };
    }
    
    const approvedPharmacies = await User.find(query)
      .select('email profile pharmacyName pharmacyLocation')
      .sort({ 'pharmacyLocation.city': 1 });

    console.log('Found approved pharmacies:', approvedPharmacies.length); // Debug log

    // Calculate distances if coordinates provided
    const pharmaciesWithDistance = approvedPharmacies.map(pharmacy => {
      const pharmacyData = pharmacy.toObject();
      
      if (lat && lng && pharmacy.pharmacyLocation?.coordinates?.lat && pharmacy.pharmacyLocation?.coordinates?.lng) {
        // Calculate distance using Haversine formula
        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        const pharmLat = pharmacy.pharmacyLocation.coordinates.lat;
        const pharmLng = pharmacy.pharmacyLocation.coordinates.lng;
        
        const R = 6371; // Earth's radius in km
        const dLat = (pharmLat - userLat) * Math.PI / 180;
        const dLon = (pharmLng - userLng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(userLat * Math.PI / 180) * Math.cos(pharmLat * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        pharmacyData.distance = Math.round(distance * 10) / 10; // Round to 1 decimal
        pharmacyData.distanceUnit = 'km';
      }
      
      return pharmacyData;
    });

    res.json({
      success: true,
      pharmacies: pharmaciesWithDistance,
      searchCriteria: {
        location: lat && lng ? { lat, lng, radius: `${radius}km` } : null,
        city: city || null
      }
    });
  } catch (error) {
    console.error('Error fetching approved pharmacies:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
