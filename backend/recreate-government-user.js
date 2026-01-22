require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function recreateGovernmentUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Delete existing government user
    await User.deleteOne({ email: 'government@tenamed.com' });
    console.log('🗑️ Deleted existing government user');
    
    // Create new government user (without manual hashing - let pre-save middleware handle it)
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
    
    if (isMatch) {
      console.log('🎉 Government user is ready for login!');
      console.log('📧 Email: government@tenamed.com');
      console.log('🔑 Password: TenaMed2024!');
      console.log('👤 Role: government');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

recreateGovernmentUser();
