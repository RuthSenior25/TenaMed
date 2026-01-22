require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkGovernmentUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find government user
    const user = await User.findOne({ email: 'government@tenamed.com' });
    if (user) {
      console.log('📧 Government user found:');
      console.log(`  - Email: ${user.email}`);
      console.log(`  - Role: ${user.role}`);
      console.log(`  - Username: ${user.username}`);
      console.log(`  - Active: ${user.isActive}`);
      console.log(`  - Approved: ${user.isApproved}`);
      
      // Test password
      const isMatch = await user.comparePassword('TenaMed2024!');
      console.log(`🔍 Password test: ${isMatch ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!isMatch) {
        // Recreate with correct password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('TenaMed2024!', 10);
        user.password = hashedPassword;
        await user.save();
        console.log('✅ Government user password updated');
        
        // Test again
        const isMatch2 = await user.comparePassword('TenaMed2024!');
        console.log(`🔍 Password test after update: ${isMatch2 ? '✅ PASS' : '❌ FAIL'}`);
      }
    } else {
      console.log('❌ Government user not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkGovernmentUser();
