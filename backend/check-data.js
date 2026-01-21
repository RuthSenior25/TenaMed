const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');
require('dotenv').config();

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenamed');
    console.log('Connected to MongoDB');
    
    // Check dispatcher
    const dispatcher = await User.findOne({ email: 'dis@gmail.com' });
    console.log('Dispatcher:', dispatcher ? {
      id: dispatcher._id,
      email: dispatcher.email,
      role: dispatcher.role,
      isApproved: dispatcher.isApproved
    } : 'Not found');
    
    // Check delivery persons
    const deliveryPersons = await User.find({ role: 'delivery_person' });
    console.log('\nDelivery persons found:', deliveryPersons.length);
    deliveryPersons.forEach(dp => {
      console.log('- DP:', {
        email: dp.email,
        role: dp.role,
        isApproved: dp.isApproved,
        isAvailable: dp.isAvailable,
        firstName: dp.profile?.firstName,
        lastName: dp.profile?.lastName
      });
    });
    
    // Check orders
    const orders = await Order.find({ status: 'ready', deliveryStatus: 'pending' });
    console.log('\nReady orders:', orders.length);
    orders.forEach(order => {
      console.log('- Order:', {
        id: order._id,
        status: order.status,
        deliveryStatus: order.deliveryStatus,
        pharmacyId: order.pharmacyId,
        patientId: order.patientId
      });
    });
    
    // Check all orders to see status breakdown
    const allOrders = await Order.find({});
    console.log('\nAll orders status breakdown:');
    const statusCounts = {};
    allOrders.forEach(order => {
      const key = `${order.status}/${order.deliveryStatus || 'none'}`;
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });
    console.log(statusCounts);
    
    await mongoose.disconnect();
    console.log('\nDisconnected');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();
