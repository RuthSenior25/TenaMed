const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Pharmacy = require('../models/Pharmacy');
const { generateToken } = require('../middleware/auth');
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
    console.error('Registration error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email or username already exists'
      });
    }

    // Handle other errors
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
router.get('/pending-pharmacies', async (req, res) => {
  try {
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

    // Find all pending pharmacy registrations
    // More comprehensive query to catch all possible pending states
    const query = {
      role: 'pharmacy',
      $or: [
        { isApproved: false },
        { isApproved: { $exists: false } }, // In case isApproved is not set
        { status: 'pending' },
        { status: { $exists: false } }, // In case status is not set
        { 
          $and: [
            { isApproved: { $ne: true } }, // Not explicitly approved
            { status: { $ne: 'approved' } } // And status is not approved
          ]
        }
      ]
    };
    
    console.log('Pending pharmacies query:', JSON.stringify(query, null, 2));
    
    // First get all matching users
    let pendingPharmacies = await User.find(query)
      .select('-password')
      .populate('profile')
      .lean();
      
    // Additional filtering to ensure we don't include approved pharmacies
    pendingPharmacies = pendingPharmacies.filter(pharmacy => {
      const isApproved = pharmacy.isApproved === true || pharmacy.status === 'approved';
      const isRejected = pharmacy.status === 'rejected';
      return !isApproved && !isRejected;
    });

    console.log(`Found ${pendingPharmacies.length} pending pharmacies after filtering`);
    res.json(pendingPharmacies);
  } catch (error) {
    console.error('Error fetching pending pharmacies:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
