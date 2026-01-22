require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function addGovernmentUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check if government user already exists
    const existingUser = await User.findOne({ email: 'government@tenamed.com' });
    if (existingUser) {
      console.log('🔍 Government user already exists');
      console.log(`📧 Email: ${existingUser.email}`);
      console.log(`🔑 Role: ${existingUser.role}`);
      
      // Test password
      const isMatch = await existingUser.comparePassword('TenaMed2024!');
      console.log(`🔍 Password test: ${isMatch ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!isMatch) {
        // Update password
        const hashedPassword = await bcrypt.hash('TenaMed2024!', 10);
        existingUser.password = hashedPassword;
        await existingUser.save();
        console.log('✅ Government user password updated');
      }
      
      return;
    }
    
    // Create government user (without manual hashing - let pre-save middleware handle it)
    const governmentUser = new User({
      username: 'government',
      email: 'government@tenamed.com',
      password: 'TenaMed2024!', // Plain text - pre-save middleware will hash it
      role: 'government',
      profile: {
        firstName: 'Government',
        lastName: 'Official'
      },
      isActive: true,
      isApproved: true
    });
    
    await governmentUser.save();
    console.log('✅ Government user created successfully!');
    
    // Test login
    const testUser = await User.findOne({ email: 'government@tenamed.com' });
    const isMatch = await testUser.comparePassword('TenaMed2024!');
    console.log(`🔍 Password test: ${isMatch ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

addGovernmentUser();
