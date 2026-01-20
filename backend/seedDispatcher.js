const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Hardcoded dispatcher credentials
const DISPATCHER_CREDENTIALS = {
  email: 'dispatcher@tenamed.com',
  password: 'TenaMed1',
  username: 'dispatcher',
  role: 'dispatcher',
  profile: {
    firstName: 'Main',
    lastName: 'Dispatcher'
  },
  isActive: true,
  isApproved: true
};

async function seedDispatcher() {
  try {
    console.log('🔍 Checking for hardcoded dispatcher...');
    
    // Check if dispatcher already exists
    const existingDispatcher = await User.findOne({ email: DISPATCHER_CREDENTIALS.email });
    
    if (existingDispatcher) {
      console.log('✅ Hardcoded dispatcher already exists:', DISPATCHER_CREDENTIALS.email);
      return;
    }
    
    // Create the hardcoded dispatcher
    const hashedPassword = await bcrypt.hash(DISPATCHER_CREDENTIALS.password, 10);
    
    const dispatcher = new User({
      ...DISPATCHER_CREDENTIALS,
      password: hashedPassword
    });
    
    await dispatcher.save();
    
    console.log('✅ Hardcoded dispatcher created successfully!');
    console.log('📧 Email:', DISPATCHER_CREDENTIALS.email);
    console.log('🔑 Password:', DISPATCHER_CREDENTIALS.password);
    console.log('👤 Role:', DISPATCHER_CREDENTIALS.role);
    
  } catch (error) {
    console.error('❌ Error seeding dispatcher:', error);
  }
}

module.exports = seedDispatcher;
