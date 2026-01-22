require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check for admin user
    const admin = await User.findOne({ email: 'admin@tenamed.com' });
    console.log(`🔍 Admin user found: ${!!admin}`);
    
    if (admin) {
      console.log(`📧 Admin email: ${admin.email}`);
      console.log(`🔑 Admin role: ${admin.role}`);
      console.log(`🔐 Admin password hash: ${admin.password}`);
      
      // Test password
      const isMatch = await admin.comparePassword('TenaMed2024!');
      console.log(`🔍 Password test for admin@tenamed.com: ${isMatch ? '✅ PASS' : '❌ FAIL'}`);
    } else {
      console.log('❌ Admin user not found in database');
      
      // Create admin user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('TenaMed2024!', 10);
      
      const adminUser = new User({
        username: 'admin',
        email: 'admin@tenamed.com',
        password: hashedPassword,
        role: 'admin',
        profile: {
          firstName: 'Admin',
          lastName: 'User'
        },
        isActive: true,
        isApproved: true
      });
      
      await adminUser.save();
      console.log('✅ Admin user created successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAdmin();
