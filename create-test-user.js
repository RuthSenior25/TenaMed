// Create test patient user
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function createTestUser() {
  console.log('👤 Creating Test Patient User...');
  
  try {
    const userData = {
      username: 'testpatient',
      email: 'patient@test.com',
      password: 'Test123456',
      role: 'patient',
      profile: {
        firstName: 'Test',
        lastName: 'Patient',
        phone: '+251911234567'
      }
    };

    const response = await fetch('https://tenamed-backend.onrender.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    console.log('Registration Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Test user created successfully:', data);
      await testLogin();
    } else {
      const errorData = await response.json();
      console.log('❌ User creation failed:', errorData);
      
      // If user already exists, try to login
      if (response.status === 400 && errorData.message?.includes('already exists')) {
        console.log('🔄 User already exists, testing login...');
        await testLogin();
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  }
}

async function testLogin() {
  try {
    const loginResponse = await fetch('https://tenamed-backend.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'patient@test.com',
        password: 'Test123456'
      })
    });
    
    console.log('Login Status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful:', loginData);
      console.log('📋 You can now login with:');
      console.log('   Email: patient@test.com');
      console.log('   Password: Test123456');
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ Login failed:', errorData);
    }
  } catch (error) {
    console.error('❌ Login test error:', error.message);
  }
}

createTestUser();
