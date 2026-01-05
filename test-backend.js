// Test backend connectivity
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testBackend() {
  console.log('🔍 Testing Backend Connectivity...');
  
  try {
    // Test health endpoint
    console.log('\n1️⃣ Testing Health Endpoint...');
    const healthResponse = await fetch('https://tenamed-backend.onrender.com/api/auth/health');
    console.log('Health Status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Backend is healthy:', healthData);
    } else {
      console.log('❌ Backend health check failed');
    }
    
    // Test login endpoint
    console.log('\n2️⃣ Testing Login Endpoint...');
    const loginResponse = await fetch('https://tenamed-backend.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'yonatahn.demo@example.com',
        password: 'test123'
      })
    });
    
    console.log('Login Status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login endpoint working:', loginData);
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ Login failed:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Backend connection failed:', error.message);
  }
}

testBackend();
