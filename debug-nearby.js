// Debug nearby pharmacies endpoint
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function debugNearbyEndpoint() {
  console.log('🔍 Debugging Nearby Pharmacies Endpoint...');
  
  try {
    const lat = 9.026651378231728;
    const lng = 38.78261512256623;
    
    console.log('\n1️⃣ Testing nearby pharmacies endpoint...');
    const response = await fetch(`https://tenamed-backend.onrender.com/api/pharmacies/nearby?lat=${lat}&lng=${lng}&radius=10&limit=20`);
    
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success:', data);
    } else {
      const errorData = await response.json();
      console.log('❌ Error:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugNearbyEndpoint();
