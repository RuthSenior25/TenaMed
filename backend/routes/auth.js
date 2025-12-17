const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Pharmacy = require('../models/Pharmacy');
const { generateToken, authenticate } = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

// Register new user
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { username, email, password, role, profile, pharmacyName } = req.body;

    // Log the incoming request for debugging
    console.log('Registration attempt:', { 
      username, 
      email, 
      role,
      hasProfile: !!profile,
      pharmacyName 
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
router.get('/pending-pharmacies', authenticate, async (req, res) => {
  console.log('🔍 [API] /pending-pharmacies - Request received');
  console.log('🔑 Authenticated User:', {
    id: req.user._id,
    email: req.user.email,
    role: req.user.role
  });

  // Check if user is admin
  if (req.user.role !== 'admin') {
    console.warn('⚠️ Unauthorized access attempt - User is not an admin');
    return res.status(403).json({ 
      success: false,
      message: 'Not authorized. Admin access required.' 
    });
  }

  try {
    console.log('🔍 [API] Building query for pending pharmacies...');
    
    // Simplified query to find all pharmacy users first
    const query = { role: 'pharmacy' };
    
    console.log('🔍 [API] Query:', JSON.stringify(query, null, 2));
    
    // First, get all pharmacy users with minimal fields
    console.log('🔍 [API] Fetching pharmacy users...');
    const startTime = Date.now();
    
    const pharmacyUsers = await User.find(query)
      .select('_id email role isApproved status createdAt')
      .lean();
      
    console.log(`✅ [API] Found ${pharmacyUsers.length} pharmacy users in ${Date.now() - startTime}ms`);
    
    // Filter in-memory for better control and debugging
    const pendingPharmacies = pharmacyUsers.filter(user => {
      const isPending = 
        user.isApproved === false || 
        (user.status && user.status.toLowerCase() === 'pending') ||
        (!user.status && !user.isApproved);
      
      console.log(`User ${user._id} - isApproved: ${user.isApproved}, status: ${user.status} => ${isPending ? 'PENDING' : 'APPROVED/REJECTED'}`);
      return isPending;
    });
    
    console.log(`✅ [API] Found ${pendingPharmacies.length} pending pharmacies after filtering`);
    
    // If no pending pharmacies, return early
    if (pendingPharmacies.length === 0) {
      console.log('ℹ️  No pending pharmacies found');
      return res.json([]);
    }
    
    // Get full details for pending pharmacies
    console.log('🔍 [API] Fetching full details for pending pharmacies...');
    const pendingIds = pendingPharmacies.map(p => p._id);
    
    const detailedPharmacies = await User.find({ _id: { $in: pendingIds } })
      .select('-password')
      .populate('profile')
      .lean();
    
    console.log(`✅ [API] Fetched details for ${detailedPharmacies.length} pharmacies`);
    
    res.json(detailedPharmacies);
    
  } catch (error) {
    console.error('❌ [API] Error in /pending-pharmacies:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      success: false,
      message: 'Error fetching pending pharmacies',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Approve/Reject pharmacy
router.patch('/pharmacy/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    // Verify admin
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminUser = await User.findById(decoded.id);
    
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Find and update pharmacy
    const pharmacy = await User.findById(id).populate('profile');
    if (!pharmacy || pharmacy.role !== 'pharmacy') {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    pharmacy.isApproved = status === 'approved';
    if (status === 'rejected' && rejectionReason) {
      pharmacy.rejectionReason = rejectionReason;
    } else if (status === 'approved') {
      // Create pharmacy profile if approved
      const newPharmacy = new Pharmacy({
        name: pharmacy.pharmacyName || `${pharmacy.profile?.firstName}'s Pharmacy`,
        owner: pharmacy._id,
        contact: {
          email: pharmacy.email,
          phone: pharmacy.profile?.phone || ''
        },
        address: pharmacy.profile?.address || {}
      });
      await newPharmacy.save();
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

// Update pharmacy status (Approve/Reject)
router.patch('/pharmacy/:id/status', async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    
    // Verify admin role
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require('../middleware/auth');
    const decoded = verifyToken(token);

    const adminUser = await User.findById(decoded.id);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Validate status
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Find and update the pharmacy
    const updateData = { 
      isApproved: status === 'approved',
      status,
      ...(status === 'rejected' && { rejectionReason })
    };

    const updatedPharmacy = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!updatedPharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    res.json(updatedPharmacy);
  } catch (error) {
    console.error('Error updating pharmacy status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
