require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Users to recreate with proper password hashing
const users = [
  {
    username: 'patient1',
    email: 'patient@gmail.com',
    password: 'TenaMed1',
    role: 'patient',
    profile: {
      firstName: 'Patient',
      lastName: 'User'
    },
    isActive: true,
    isApproved: true
  },
  {
    username: 'pharmacy1',
    email: 'pharmacy@gmail.com',
    password: 'TenaMed1',
    role: 'pharmacy',
    pharmacyName: 'Test Pharmacy',
    profile: {
      firstName: 'Pharmacy',
      lastName: 'Manager'
    },
    isActive: true,
    isApproved: true
  },
  {
    username: 'supplier1',
    email: 'supplier@gmail.com',
    password: 'TenaMed1',
    role: 'supplier',
    profile: {
      firstName: 'Supplier',
      lastName: 'Manager'
    },
    isActive: true,
    isApproved: true
  },
  {
    username: 'delivery1',
    email: 'delivery@gmail.com',
    password: 'TenaMed1',
    role: 'delivery_person',
    profile: {
      firstName: 'Delivery',
      lastName: 'Person'
    },
    isActive: true,
    isApproved: true
  },
  {
    username: 'dispatcher1',
    email: 'dis@gmail.com',
    password: 'TenaMed1',
    role: 'dispatcher',
    profile: {
      firstName: 'Dispatcher',
      lastName: 'User'
    },
    isActive: true,
    isApproved: true
  }
];

async function fixPasswords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Update existing users with correct password hash
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      await User.findOneAndUpdate(
        { email: userData.email },
        { password: hashedPassword },
        { new: true }
      );
      
      console.log(`✅ Updated password for: ${userData.email} (${userData.role})`);
      
      // Test password comparison
      const user = await User.findOne({ email: userData.email });
      const isMatch = await user.comparePassword(userData.password);
      console.log(`🔍 Password test for ${userData.email}: ${isMatch ? '✅ PASS' : '❌ FAIL'}`);
    }
    
    console.log('\n🎉 All passwords fixed and tested!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixPasswords();
