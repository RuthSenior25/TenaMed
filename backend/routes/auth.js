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
      isApproved: role === 'patient' || role === 'admin' || role === 'supplier', // Auto-approve patients, admins, and suppliers
      status: role === 'pharmacy' || role === 'delivery_person' ? 'pending' : 'approved'
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

    // Hardcoded admin credentials for development
    if (email === 'admin@tenamed.com' && password === 'TenaMed2024!') {
      console.log('✅ Admin login successful (hardcoded credentials)');
      return res.json({
        message: 'Login successful',
        token: 'admin-hardcoded-token-' + Date.now(),
        user: {
          id: 'admin-001',
          username: 'admin',
          email: 'admin@tenamed.com',
          role: 'admin',
          profile: {
            firstName: 'Admin',
            lastName: 'User'
          }
        }
      });
    }

    // Hardcoded government credentials for development
    if (email === 'government@tenamed.com' && password === 'TenaMed2024!') {
      console.log('✅ Government login successful (hardcoded credentials)');
      return res.json({
        message: 'Login successful',
        token: 'government-hardcoded-token-' + Date.now(),
        user: {
          id: 'government-001',
          username: 'government',
          email: 'government@tenamed.com',
          role: 'government',
          profile: {
            firstName: 'Government',
            lastName: 'Official'
          }
        }
      });
    }

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
    
    // Handle hardcoded tokens for development
    if (token.startsWith('government-hardcoded-token-')) {
      return res.json({
        user: {
          id: 'government-001',
          username: 'government',
          email: 'government@tenamed.com',
          role: 'government',
          profile: {
            firstName: 'Government',
            lastName: 'Official'
          },
          isActive: true,
          isApproved: true
        },
        pharmacy: null
      });
    }
    
    if (token.startsWith('admin-hardcoded-token-')) {
      return res.json({
        user: {
          id: 'admin-001',
          username: 'admin',
          email: 'admin@tenamed.com',
          role: 'admin',
          profile: {
            firstName: 'Admin',
            lastName: 'User'
          },
          isActive: true,
          isApproved: true
        },
        pharmacy: null
      });
    }
    
    // Normal JWT verification for other users
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
    
    // First, let's see ALL pharmacies to debug
    const allPharmacies = await User.find({ role: 'pharmacy' })
      .select('email pharmacyName status isApproved isActive')
      .sort({ pharmacyName: 1 });
    
    console.log('ALL pharmacies in database:', allPharmacies.map(p => ({
      name: p.pharmacyName,
      email: p.email,
      status: p.status,
      isApproved: p.isApproved,
      isActive: p.isActive
    })));
    
    // Now get only approved ones
    const approvedPharmacies = allPharmacies.filter(p => 
      p.status === 'approved' && p.isActive === true
    );
    
    console.log('Approved pharmacies:', approvedPharmacies.length); // Debug log

    // Get full data for approved pharmacies
    const fullApprovedPharmacies = await User.find({ 
      role: 'pharmacy', 
      status: 'approved',
      isActive: true 
    })
      .select('email profile pharmacyName pharmacyLocation')
      .sort({ pharmacyName: 1 });

    const { 
      lat, 
      lng, 
      radius = 10, // Default 10km radius
      city 
    } = req.query;

    // Calculate distances if coordinates provided
    const pharmaciesWithDistance = fullApprovedPharmacies.map(pharmacy => {
      const pharmacyData = pharmacy.toObject();
      
      if (lat && lng && pharmacy.pharmacyLocation?.coordinates && Array.isArray(pharmacy.pharmacyLocation.coordinates)) {
        // Calculate distance using Haversine formula
        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        const pharmLng = pharmacy.pharmacyLocation.coordinates[0]; // lng at index 0
        const pharmLat = pharmacy.pharmacyLocation.coordinates[1]; // lat at index 1
        
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
      data: pharmaciesWithDistance,
      pharmacies: pharmaciesWithDistance, // Keep for backward compatibility
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

// Update driver availability
router.put('/update-availability', authenticate, checkRole(['delivery_person']), async (req, res) => {
  try {
    const { isAvailable } = req.body;
    
    console.log(`Driver ${req.user._id} updating availability to: ${isAvailable}`);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isAvailable },
      { new: true }
    );

    console.log(`✅ Driver availability updated: ${isAvailable}`);

    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: { isAvailable: user.isAvailable }
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update availability', 
      error: error.message 
    });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;
    
    console.log('Profile update request for user:', userId);
    console.log('Update data:', updateData);

    // Validate update data
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'address', 'bio',
      'pharmacyName', 'licenseNumber', 'company', 'vehicleType', 'licensePlate'
    ];
    
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        filteredData[key] = updateData[key];
      }
    });

    // Update user profile
    const updateQuery = {};
    
    // Handle profile nested fields
    if (filteredData.firstName || filteredData.lastName || filteredData.phone || filteredData.address || filteredData.bio) {
      updateQuery['profile.firstName'] = filteredData.firstName;
      updateQuery['profile.lastName'] = filteredData.lastName;
      updateQuery['profile.phone'] = filteredData.phone;
      updateQuery['profile.address'] = filteredData.address;
      updateQuery['profile.bio'] = filteredData.bio;
    }
    
    // Handle role-specific fields
    if (filteredData.pharmacyName) updateQuery.pharmacyName = filteredData.pharmacyName;
    if (filteredData.licenseNumber) updateQuery.licenseNumber = filteredData.licenseNumber;
    if (filteredData.company) updateQuery['profile.company'] = filteredData.company;
    if (filteredData.vehicleType) updateQuery['profile.vehicleType'] = filteredData.vehicleType;
    if (filteredData.licensePlate) updateQuery['profile.licensePlate'] = filteredData.licensePlate;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateQuery },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('Profile updated successfully for user:', userId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Profile update error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => ({
        field: val.path,
        message: val.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

module.exports = router;
