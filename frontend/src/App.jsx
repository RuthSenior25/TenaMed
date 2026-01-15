import React, { useState, useMemo, useContext, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/AdminDashboard';
import GovernmentDashboard from './pages/government/GovernmentDashboard';
import PharmacyLocator from './components/PharmacyLocator.jsx';
import { AuthProvider, useAuth } from './context/AuthContext';

const baseMedicineCatalog = [
{
id: 'MED-001',
name: 'Amoxicillin 500mg',
description: 'Broad-spectrum antibiotic capsules',
stock: 'In stock',
availability: 'in_stock',
averagePrice: 120,
averageRating: 4.7,
instructions: {
timing: 'After meals',
interval: '12 hours',
precautions: 'Complete the full course even if you feel better.'
},
pharmacies: [
{ name: 'Addis Lifeline Pharmacy', location: 'Bole, Addis Ababa', price: 115, rating: 4.8 },
{ name: 'Unity Health Pharmacy', location: 'Sarbet, Addis Ababa', price: 125, rating: 4.5 },
],
},
{
id: 'MED-002',
name: 'Ibuprofen 200mg',
description: 'Pain reliever and anti-inflammatory tablets',
stock: 'Low stock',
availability: 'low_stock',
averagePrice: 45,
averageRating: 4.3,
instructions: { timing: 'After meals', interval: '6–8 hours', precautions: 'Avoid on empty stomach and with other NSAIDs.' },
pharmacies: [
{ name: 'Bole City Pharmacy', location: 'Bole, Addis Ababa', price: 40, rating: 4.1 },
{ name: 'CMC Community Pharmacy', location: 'CMC, Addis Ababa', price: 48, rating: 4.4 },
],
},
{
id: 'MED-003',
name: 'Metformin 850mg',
description: 'Type 2 diabetes control tablets',
stock: 'In stock',
availability: 'in_stock',
averagePrice: 95,
averageRating: 4.6,
instructions: { timing: 'With meals', interval: 'Two times daily', precautions: 'Monitor blood glucose and kidney function regularly.' },
pharmacies: [
{ name: 'Gerji Health Hub', location: 'Gerji, Addis Ababa', price: 90, rating: 4.5 },
{ name: 'Lafto Prime Pharmacy', location: 'Lafto, Addis Ababa', price: 100, rating: 4.6 },
],
},
{
id: 'MED-004',
name: 'Insulin Pen (Rapid)',
description: 'Fast-acting insulin cartridges',
stock: 'Pre-order',
availability: 'pre_order',
averagePrice: 450,
averageRating: 4.2,
instructions: {
timing: '15 minutes before meals',
interval: 'Per endocrinologist direction',
precautions: 'Store in refrigerator before opening.'
},
pharmacies: [
{ name: 'Unity Health Pharmacy', location: 'Sarbet, Addis Ababa', price: 440, rating: 4.1 },
{ name: 'CMC Community Pharmacy', location: 'CMC, Addis Ababa', price: 455, rating: 4.2 },
],
},
{
id: 'MED-005',
name: 'Vitamin D3 1000IU',
description: 'Supplement softgels for daily immunity',
stock: 'In stock',
availability: 'in_stock',
averagePrice: 60,
averageRating: 4.9,
instructions: { timing: 'With fatty meals', interval: 'Daily', precautions: 'Do not exceed recommended dose without physician advice.' },
pharmacies: [
{ name: 'Addis Lifeline Pharmacy', location: 'Bole, Addis Ababa', price: 58, rating: 4.9 },
{ name: 'Gerji Health Hub', location: 'Gerji, Addis Ababa', price: 62, rating: 4.8 },
],
},
{
id: 'MED-006',
name: 'Omeprazole 20mg',
description: 'Acid reflux and heartburn control capsules',
stock: 'In stock',
availability: 'in_stock',
averagePrice: 80,
averageRating: 4.4,
instructions: { timing: '30 minutes before meals', interval: 'Daily or as prescribed', precautions: 'Short-term use unless physician directed.' },
pharmacies: [
{ name: 'Lafto Prime Pharmacy', location: 'Lafto, Addis Ababa', price: 78, rating: 4.3 },
{ name: 'Bole City Pharmacy', location: 'Bole, Addis Ababa', price: 82, rating: 4.5 },
],
},
];

const pharmacyDirectory = [
{ id: 'PH-001', name: 'Addis Lifeline Pharmacy', license: 'LIC-2145', city: 'Addis Ababa', kebele: 'Bole 14', status: 'approved' },
{ id: 'PH-002', name: 'Unity Health Pharmacy', license: 'LIC-3578', city: 'Addis Ababa', kebele: 'Sarbet 03', status: 'approved' },
{ id: 'PH-003', name: 'CMC Community Pharmacy', license: 'LIC-4410', city: 'Addis Ababa', kebele: 'CMC 09', status: 'approved' },
{ id: 'PH-004', name: 'Lafto Prime Pharmacy', license: 'LIC-5012', city: 'Addis Ababa', kebele: 'Lafto 04', status: 'approved' },
];

const SupplyChainContext = React.createContext({
supplyLedger: [],
priceBoard: {},
addShipment: () => {},
updateShipmentStatus: () => {},
});

const buildBasePriceBoard = () => {
const board = {};
baseMedicineCatalog.forEach((med) => {
board[med.id] = med.pharmacies.map((listing) => ({ ...listing }));
});
return board;
};

const updateBoardWithShipment = (board, shipment) => {
const nextBoard = { ...board };
const listings = nextBoard[shipment.medicineId] ? [...nextBoard[shipment.medicineId]] : [];
const pharmacyMeta = pharmacyDirectory.find((item) => item.id === shipment.pharmacyId) || {
name: shipment.pharmacyName || 'Unlisted pharmacy',
city: shipment.pharmacyCity || 'Addis Ababa',
kebele: shipment.pharmacyKebele || '',
};
const patientPrice = Math.max(
10,
Math.round(Number(shipment.wholesalePrice || 0) * (1 + Number(shipment.markupPercent || 0) / 100))
) || Number(shipment.wholesalePrice) || 10;
const updatedListing = {
name: pharmacyMeta.name,
location: pharmacyMeta.city ? `${pharmacyMeta.city}${pharmacyMeta.kebele ? `, ${pharmacyMeta.kebele}` : ''}` : 'Addis Ababa',
price: patientPrice,
rating: 4.5,
};
const existingIndex = listings.findIndex((entry) => entry.name === updatedListing.name);
if (existingIndex >= 0) {
listings[existingIndex] = { ...listings[existingIndex], ...updatedListing };
} else {
listings.push(updatedListing);
}
nextBoard[shipment.medicineId] = listings;
return nextBoard;
};

const initialSupplyLedger = [
{
id: 'SUP-1001',
supplier: 'MedSupply Global',
pharmacyId: 'PH-001',
pharmacyName: 'Addis Lifeline Pharmacy',
medicineId: 'MED-001',
medicineName: 'Amoxicillin 500mg',
quantity: 200,
wholesalePrice: 80,
markupPercent: 25,
status: 'Delivered',
eta: 'Delivered yesterday',
createdAt: '2025-01-01T08:00:00Z',
},
{
id: 'SUP-0998',
supplier: 'BlueNile Pharma Supply',
pharmacyId: 'PH-003',
pharmacyName: 'CMC Community Pharmacy',
medicineId: 'MED-004',
medicineName: 'Insulin Pen (Rapid)',
quantity: 60,
wholesalePrice: 320,
markupPercent: 35,
status: 'In transit',
eta: 'Arrives tomorrow',
createdAt: '2025-01-04T09:30:00Z',
},
{
id: 'SUP-0995',
supplier: 'Sunrise Generics',
pharmacyId: 'PH-004',
pharmacyName: 'Lafto Prime Pharmacy',
medicineId: 'MED-002',
medicineName: 'Ibuprofen 200mg',
quantity: 500,
wholesalePrice: 18,
markupPercent: 60,
status: 'Delivered',
eta: 'Delivered today',
createdAt: '2025-01-05T11:00:00Z',
},
];

const deriveInitialPriceBoard = () =>
initialSupplyLedger.reduce((board, shipment) => updateBoardWithShipment(board, shipment), buildBasePriceBoard());

const SupplyChainProvider = ({ children }) => {
const [supplyLedger, setSupplyLedger] = useState(initialSupplyLedger);
const [priceBoard, setPriceBoard] = useState(() => deriveInitialPriceBoard());

const addShipment = (payload) => {
if (!payload?.medicineId || !payload?.pharmacyId) return;
const medicineMeta = baseMedicineCatalog.find((med) => med.id === payload.medicineId);
const pharmacyMeta = pharmacyDirectory.find((pharm) => pharm.id === payload.pharmacyId);
const shipment = {
id: `SUP-${Math.floor(Math.random() * 9000 + 1000)}`,
supplier: payload.supplier || 'Supplier',
pharmacyId: payload.pharmacyId,
pharmacyName: pharmacyMeta?.name || payload.pharmacyName || 'Unlisted pharmacy',
medicineId: payload.medicineId,
medicineName: medicineMeta?.name || payload.medicineName || 'Unlisted medicine',
quantity: Number(payload.quantity) || 0,
wholesalePrice: Number(payload.wholesalePrice) || 0,
markupPercent: Number(payload.markupPercent) || 0,
status: 'In transit',
eta: payload.eta || 'ETA soon',
createdAt: new Date().toISOString(),
};

setSupplyLedger((prev) => [shipment, ...prev]);
setPriceBoard((prevBoard) => updateBoardWithShipment(prevBoard, shipment));
};

const updateShipmentStatus = (shipmentId, nextStatus) => {
setSupplyLedger((prev) =>
prev.map((entry) => (entry.id === shipmentId ? { ...entry, status: nextStatus } : entry))
);
};

const contextValue = useMemo(
() => ({ supplyLedger, priceBoard, addShipment, updateShipmentStatus }),
[supplyLedger, priceBoard]
);

return <SupplyChainContext.Provider value={contextValue}>{children}</SupplyChainContext.Provider>;
};

const useSupplyChain = () => useContext(SupplyChainContext);

// Landing page component
const Landing = () => {
return (
<div style={{
minHeight: '100vh',
background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
padding: '20px',
fontFamily: 'system-ui, sans-serif',
position: 'relative',
overflow: 'hidden'
}}>
{/* Animated background elements */}
<div style={{
position: 'absolute',
width: '200px',
height: '200px',
background: 'rgba(255, 255, 255, 0.1)',
borderRadius: '50%',
top: '10%',
left: '10%',
animation: 'float 6s ease-in-out infinite'
}} />
<div style={{
position: 'absolute',
width: '150px',
height: '150px',
background: 'rgba(255, 255, 255, 0.05)',
borderRadius: '50%',
bottom: '10%',
right: '10%',
animation: 'float 8s ease-in-out infinite reverse'
}} />

<div style={{
background: 'rgba(255, 255, 255, 0.95)',
backdropFilter: 'blur(10px)',
borderRadius: '24px',
padding: '48px',
textAlign: 'center',
maxWidth: '480px',
width: '100%',
boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
border: '1px solid rgba(255, 255, 255, 0.2)',
position: 'relative',
zIndex: 1
}}>
{/* Logo/Icon */}
<div style={{
width: '80px',
height: '80px',
background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
borderRadius: '20px',
margin: '0 auto 24px',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
fontSize: '36px',
color: 'white',
fontWeight: 'bold'
}}>T</div>

<h1 style={{
fontSize: '40px',
fontWeight: '800',
background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
WebkitBackgroundClip: 'text',
WebkitTextFillColor: 'transparent',
marginBottom: '16px',
letterSpacing: '-0.5px'
}}>TenaMed</h1>

<p style={{
fontSize: '18px',
color: '#4a5568',
marginBottom: '12px',
fontWeight: '500'
}}>Healthcare Drug Tracking Platform</p>

<p style={{
fontSize: '14px',
color: '#718096',
marginBottom: '40px',
lineHeight: '1.6'
}}>Secure, reliable, and efficient medication management for healthcare providers</p>

<div style={{
display: 'flex',
flexDirection: 'column',
gap: '16px'
}}>
<Link
to="/login"
style={{
display: 'block',
padding: '16px 32px',
background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
color: 'white',
textDecoration: 'none',
borderRadius: '16px',
fontWeight: '600',
fontSize: '16px',
textAlign: 'center',
transition: 'all 0.3s ease',
boxShadow: '0 10px 25px -5px rgba(102, 126, 234, 0.4)',
border: 'none',
cursor: 'pointer'
}}
>Sign In</Link>

<Link
to="/register"
style={{
display: 'block',
padding: '16px 32px',
background: 'white',
color: '#667eea',
textDecoration: 'none',
borderRadius: '16px',
fontWeight: '600',
fontSize: '16px',
textAlign: 'center',
transition: 'all 0.3s ease',
boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
border: '2px solid #e2e8f0',
cursor: 'pointer'
}}
>Create Account</Link>
</div>

<div style={{
marginTop: '32px',
paddingTop: '24px',
borderTop: '1px solid #e2e8f0'
}}>
<p style={{
fontSize: '12px',
color: '#a0aec0',
marginBottom: '8px'
}}>&copy; 2025 TenaMed. All rights reserved.</p>
<p style={{
fontSize: '11px',
color: '#cbd5e0'
}}>Built with ❤️ for healthcare professionals</p>
</div>
</div>

{/* Add CSS animation */}
<style dangerouslySetInnerHTML={{
__html: `
@keyframes float {
0%, 100% { transform: translateY(0px); }
50% { transform: translateY(-20px); }
}
`
}} />
</div>
);
};

const dashboardShellStyle = { minHeight: '100vh', background: '#f7fafc', padding: '20px' };
const dashboardContentStyle = { maxWidth: '1200px', margin: '0 auto' };
const cardBaseStyle = {
background: 'white',
padding: '24px',
borderRadius: '16px',
boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};
const cardTitleStyle = { fontSize: '18px', fontWeight: 600, color: '#2d3748', marginBottom: '12px' };
const cardBodyStyle = { color: '#718096', marginBottom: '16px', lineHeight: 1.4 };
const workspaceCardStyle = {
background: 'white',
borderRadius: '20px',
padding: '24px',
boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};
const buttonBaseStyle = {
border: 'none',
color: 'white',
padding: '8px 16px',
borderRadius: '8px',
fontWeight: 600,
cursor: 'pointer',
transition: 'all 0.2s ease',
};
const actionButtonStyle = (isActive, color) => ({
width: '100%',
padding: '12px 0',
borderRadius: '10px',
border: 'none',
fontWeight: 600,
color: 'white',
background: isActive ? color : '#1f2937',
opacity: isActive ? 1 : 0.75,
cursor: 'pointer',
transition: 'all 0.2s ease',
});

const PatientDashboard = () => {
const navigate = useNavigate();
const { logout } = useAuth();
const { priceBoard } = useSupplyChain();
const [activePanel, setActivePanel] = useState('pharmacies');
const [approvedPharmacies, setApprovedPharmacies] = useState([]);
const [isLoadingPharmacies, setIsLoadingPharmacies] = useState(true);
const [showOrderModal, setShowOrderModal] = useState(false);
const [selectedPharmacy, setSelectedPharmacy] = useState(null);
const [orderForm, setOrderForm] = useState({
  medications: [{ name: '', quantity: 1, instructions: '' }],
  deliveryAddress: { street: '', city: '', kebele: '', postalCode: '' },
  notes: ''
});
const [showPaymentModal, setShowPaymentModal] = useState(false);
const [pendingOrder, setPendingOrder] = useState(null);
const [paymentMethod, setPaymentMethod] = useState('cash');
const [isProcessingPayment, setIsProcessingPayment] = useState(false);
const [medicineSearchQuery, setMedicineSearchQuery] = useState('');
const [medicineSearchResults, setMedicineSearchResults] = useState([]);
const [showPriceComparison, setShowPriceComparison] = useState(false);
const [selectedMedicineForComparison, setSelectedMedicineForComparison] = useState(null);
const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
const [checkingAvailability, setCheckingAvailability] = useState({});
const [availabilityResults, setAvailabilityResults] = useState({});
const [userLocation, setUserLocation] = useState(null);
const [locationPermissionAsked, setLocationPermissionAsked] = useState(false);
const [showOrderTrackModal, setShowOrderTrackModal] = useState(false);
const [orderTrackAction, setOrderTrackAction] = useState(''); // 'order' or 'track'
const [globalMedicineSearch, setGlobalMedicineSearch] = useState('');
const [globalMedicineResults, setGlobalMedicineResults] = useState([]);
const [locationFilter, setLocationFilter] = useState({
  enabled: false,
  city: '',
  radius: 10
});
const [prescriptions, setPrescriptions] = useState([]);
const [orders, setOrders] = useState([]);
const [deliveries, setDeliveries] = useState([]);
const [alerts, setAlerts] = useState([]);
const [patientProfile, setPatientProfile] = useState(null);
const [prescriptionForm, setPrescriptionForm] = useState({ drug: '', dosage: '', frequency: '', notes: '' });
const [catalogQuery, setCatalogQuery] = useState('');
const [catalogFilter, setCatalogFilter] = useState('');
const createFilterShape = () => ({
minPrice: '',
maxPrice: '',
availability: 'any',
minRating: '',
});
const [filterInputs, setFilterInputs] = useState(() => createFilterShape());
const [appliedFilters, setAppliedFilters] = useState(() => createFilterShape());
const [selectedMedicine, setSelectedMedicine] = useState(null);
const [reviews, setReviews] = useState([
{ id: 'REV-1001', pharmacy: 'Addis Lifeline Pharmacy', rating: 5, comment: 'Fast pickup and fair price for antibiotics.', date: 'Today' },
{ id: 'REV-0992', pharmacy: 'Bole City Pharmacy', rating: 4, comment: 'Helpful staff, but delivery was a bit late.', date: 'Yesterday' },
]);
const [reviewForm, setReviewForm] = useState({ pharmacy: '', rating: '5', comment: '' });
const medicineCatalog = useMemo(
() =>
baseMedicineCatalog.map((med) => ({
...med,
pharmacies: priceBoard[med.id] && priceBoard[med.id].length > 0 ? priceBoard[med.id] : med.pharmacies,
})),
[priceBoard]
);

const statCards = [
{ label: 'Active Prescriptions', value: prescriptions.length },
{ label: 'Open Orders', value: orders.filter((o) => o.status !== 'Delivered').length },
{ label: 'Deliveries Today', value: deliveries.filter((d) => d.status !== 'Delivered').length },
{ label: 'Nearby Pharmacies', value: 'Find Now', isAction: true, action: () => setActivePanel('pharmacies') },
];

// Get user's current location
const getUserLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        // Fallback to city-based filtering
        setLocationFilter(prev => ({ ...prev, enabled: true }));
      }
    );
  } else {
    console.log('Geolocation not supported');
    // Fallback to city-based filtering
    setLocationFilter(prev => ({ ...prev, enabled: true }));
  }
};

// Request location permission once and get user location
const requestLocationPermissionOnce = () => {
  const hasAsked = localStorage.getItem('locationPermissionAsked');
  if (hasAsked || locationPermissionAsked) {
    return; // Already asked, don't ask again
  }

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(location);
        localStorage.setItem('userLocation', JSON.stringify(location));
        localStorage.setItem('locationPermissionAsked', 'true');
        setLocationPermissionAsked(true);
        
        // Show success message
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #d1fae5;
          border: 1px solid #10b981;
          border-radius: 8px;
          padding: 12px 16px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          z-index: 10000;
          display: flex;
          align-items: center;
          gap: 8px;
        `;
        successDiv.innerHTML = `
          <div style="font-size: 16px;">✅</div>
          <div>
            <div style="color: #065f46; font-size: 12px; font-weight: 600;">Location Found!</div>
            <div style="color: #047857; font-size: 11px;">Showing nearby pharmacies with distances</div>
          </div>
        `;
        
        document.body.appendChild(successDiv);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          if (document.body.contains(successDiv)) {
            document.body.removeChild(successDiv);
          }
        }, 3000);
      },
      (error) => {
        console.error('Error getting location:', error);
        localStorage.setItem('locationPermissionAsked', 'true');
        setLocationPermissionAsked(true);
        
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #fef2f2;
          border: 1px solid #ef4444;
          border-radius: 8px;
          padding: 12px 16px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          z-index: 10000;
          display: flex;
          align-items: center;
          gap: 8px;
        `;
        errorDiv.innerHTML = `
          <div style="font-size: 16px;">❌</div>
          <div>
            <div style="color: #991b1b; font-size: 12px; font-weight: 600;">Location Access Denied</div>
            <div style="color: #b91c1c; font-size: 11px;">Enable location in browser settings to see nearby pharmacies</div>
          </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          if (document.body.contains(errorDiv)) {
            document.body.removeChild(errorDiv);
          }
        }, 5000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  } else {
    console.log('Geolocation is not supported by your browser.');
  }
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Fetch patient profile from backend
const fetchPatientProfile = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/patient/profile`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (data.success) {
      setPatientProfile(data.data);
    }
  } catch (error) {
    console.error('Error fetching patient profile:', error);
  }
};

// Fetch prescriptions from backend
const fetchPrescriptions = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/prescriptions`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (data.success) {
      setPrescriptions(data.prescriptions || []);
    }
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
  }
};

// Fetch orders from backend
const fetchOrders = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/orders/my-orders`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (data.success) {
      setOrders(data.data || []);
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
  }
};

// Fetch deliveries from backend
const fetchDeliveries = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/orders/my-orders`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (data.success) {
      // Convert orders to delivery format for display
      const deliveryData = (data.data || []).map(order => ({
        id: order._id,
        medication: order.medications ? order.medications.map(med => med.name).join(', ') : 'Order',
        quantity: order.medications ? order.medications.reduce((sum, med) => sum + med.quantity, 0) : 1,
        courier: order.assignedDriver ? order.assignedDriver.name : 'Pending Assignment',
        eta: order.deliveryStatus === 'delivered' ? 'Delivered' : 
               order.deliveryStatus === 'out_for_delivery' ? 'Out for delivery' : 
               order.deliveryStatus === 'assigned' ? 'Preparing' : 'Pending',
        status: order.deliveryStatus === 'delivered' ? 'Delivered' : 
               order.deliveryStatus === 'out_for_delivery' ? 'Out for delivery' : 
               order.deliveryStatus === 'assigned' ? 'Preparing' : 'Pending',
        createdAt: order.createdAt,
        pharmacy: order.pharmacyId?.pharmacyName || 'Unknown Pharmacy'
      }));
      setDeliveries(deliveryData);
    }
  } catch (error) {
    console.error('Error fetching deliveries:', error);
  }
};

// Fetch approved pharmacies from backend
const fetchApprovedPharmacies = async () => {
  try {
    setIsLoadingPharmacies(true);
    const token = localStorage.getItem('token');
    console.log('Token found:', token ? 'Yes' : 'No'); // Debug log
    
    // Build query parameters for location-based filtering (only if location filter is enabled)
    let queryParams = new URLSearchParams();
    if (locationFilter.enabled && userLocation) {
      queryParams.append('lat', userLocation.lat);
      queryParams.append('lng', userLocation.lng);
      queryParams.append('radius', locationFilter.radius);
    } else if (locationFilter.enabled && locationFilter.city) {
      queryParams.append('city', locationFilter.city);
    }
    
    const url = `${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/auth/approved-pharmacies${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status); // Debug log
    const data = await response.json();
    console.log('Approved pharmacies response:', data); // Debug log
    
    if (data.success) {
      setApprovedPharmacies(data.pharmacies || []);
    } else {
      console.error('API returned error:', data.message);
    }
  } catch (error) {
    console.error('Error fetching approved pharmacies:', error);
  } finally {
    setIsLoadingPharmacies(false);
  }
};

useEffect(() => {
  // Request location permission once on component mount
  requestLocationPermissionOnce();

  fetchApprovedPharmacies();
  fetchPatientProfile();
  fetchPrescriptions();
  fetchOrders();
  fetchDeliveries();
}, [userLocation, locationFilter, approvedPharmacies]); // Re-fetch when location or pharmacies change

// Global medicine search function
const searchGlobalMedicines = async (medicineName) => {
  console.log('Searching for medicine:', medicineName);
  console.log('Approved pharmacies available:', approvedPharmacies.length);
  
  if (!medicineName.trim()) {
    setGlobalMedicineResults([]);
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const results = [];
    
    // Fallback: Use base medicine catalog if API fails
    const fallbackResults = [];
    const searchTerm = medicineName.trim().toLowerCase();
    
    // Simulate pharmacy inventory data (in real app, this would come from backend)
    const pharmacyInventoryData = {
      'Amoxicillin 500mg': {
        'Pharmacy A': { price: 110, quantity: 50 },
        'Pharmacy B': { price: 125, quantity: 30 },
        'Pharmacy C': { price: 115, quantity: 75 }
      },
      'Metformin 850mg': {
        'Pharmacy A': { price: 85, quantity: 40 },
        'Pharmacy B': { price: 95, quantity: 60 },
        'Pharmacy C': { price: 90, quantity: 25 }
      },
      'Insulin Pen (Rapid)': {
        'Pharmacy A': { price: 420, quantity: 15 },
        'Pharmacy B': { price: 460, quantity: 20 },
        'Pharmacy C': { price: 440, quantity: 10 }
      }
    };
    
    // Search in base catalog first
    for (const medicine of baseMedicineCatalog) {
      if (medicine.name.toLowerCase().includes(searchTerm)) {
        // Add this medicine from each pharmacy that has it
        for (const pharmacy of approvedPharmacies) {
          let distance = null;
          if (userLocation && pharmacy.pharmacyLocation) {
            const R = 6371; // Earth's radius in km
            const dLat = (pharmacy.pharmacyLocation.lat - userLocation.lat) * Math.PI / 180;
            const dLon = (pharmacy.pharmacyLocation.lng - userLocation.lng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(pharmacy.pharmacyLocation.lat * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            distance = R * c;
          }

          // Use pharmacy-specific price if available, otherwise use catalog price
          const pharmacyName = pharmacy.pharmacyName || `${pharmacy.profile?.firstName}'s Pharmacy`;
          const pharmacyData = pharmacyInventoryData[medicine.name]?.[pharmacyName];
          const price = pharmacyData?.price || medicine.averagePrice || 0;
          const quantity = pharmacyData?.quantity || 10;

          fallbackResults.push({
            pharmacyId: pharmacy._id,
            pharmacyName: pharmacyName,
            pharmacyAddress: pharmacy.pharmacyLocation?.address || 'Address not available',
            pharmacyCity: pharmacy.pharmacyLocation?.city || '',
            distance: distance,
            medicineName: medicine.name,
            price: price,
            quantity: quantity,
            availability: quantity > 0 ? 'in_stock' : 'out_of_stock',
            source: pharmacyData ? 'pharmacy_inventory' : 'catalog' // Mark data source
          });
        }
      }
    }
    
    console.log('Fallback results from catalog:', fallbackResults);
    
    // Try API search, but use fallback if it fails
    let apiResults = [];
    try {
      // Search in each approved pharmacy via API
      for (const pharmacy of approvedPharmacies) {
        try {
          console.log('Searching in pharmacy:', pharmacy.pharmacyName);
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/inventory/check-availability`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
              pharmacyId: pharmacy._id,
              medicineName: medicineName.trim()
            })
          });

          console.log('Response status for', pharmacy.pharmacyName, ':', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('Response data for', pharmacy.pharmacyName, ':', data);
            
            if (data.success) {
              // Calculate distance if user location is available
              let distance = null;
              if (userLocation && pharmacy.pharmacyLocation) {
                const R = 6371; // Earth's radius in km
                const dLat = (pharmacy.pharmacyLocation.lat - userLocation.lat) * Math.PI / 180;
                const dLon = (pharmacy.pharmacyLocation.lng - userLocation.lng) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(pharmacy.pharmacyLocation.lat * Math.PI / 180) *
                          Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                distance = R * c;
              }

              apiResults.push({
                pharmacyId: pharmacy._id,
                pharmacyName: pharmacy.pharmacyName || `${pharmacy.profile?.firstName}'s Pharmacy`,
                pharmacyAddress: pharmacy.pharmacyLocation?.address || 'Address not available',
                pharmacyCity: pharmacy.pharmacyLocation?.city || '',
                distance: distance,
                medicineName: data.medicine || medicineName,
                price: data.price || 0,
                quantity: data.quantity || 0,
                availability: data.quantity > 0 ? 'in_stock' : 'out_of_stock',
                source: 'api' // Mark as API data
              });
              
              console.log('Added result for', pharmacy.pharmacyName, ':', apiResults[apiResults.length - 1]);
            }
          } else {
            console.error('Failed response from', pharmacy.pharmacyName, ':', response.status, response.statusText);
          }
        } catch (error) {
          console.error(`Error searching in ${pharmacy.pharmacyName}:`, error);
        }
      }
    } catch (apiError) {
      console.error('API search failed completely:', apiError);
      // Use fallback results if API fails
      apiResults = [];
    }

    // Use API results if available, otherwise use fallback
    const finalResults = apiResults.length > 0 ? apiResults : fallbackResults;
    
    console.log('Final results before sorting:', finalResults);

    // Sort by price, then by distance
    finalResults.sort((a, b) => {
      if (a.price !== b.price) return a.price - b.price;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return 0;
    });

    console.log('Final results after sorting:', finalResults);
    setGlobalMedicineResults(finalResults);
  } catch (error) {
    console.error('Error in searchGlobalMedicines:', error);
    setGlobalMedicineResults([]);
  }
};

const recordAlert = (message) => setAlerts((prev) => [message, ...prev].slice(0, 4));

const filteredMedicines = medicineCatalog.filter((med) => {
const matchesName = med.name.toLowerCase().includes(catalogFilter.toLowerCase());
const minPricePass = appliedFilters.minPrice ? med.averagePrice >= Number(appliedFilters.minPrice) : true;
const maxPricePass = appliedFilters.maxPrice ? med.averagePrice <= Number(appliedFilters.maxPrice) : true;
const availabilityPass =
appliedFilters.availability === 'any' || med.availability === appliedFilters.availability;
const ratingPass = appliedFilters.minRating ? med.averageRating >= Number(appliedFilters.minRating) : true;
return matchesName && minPricePass && maxPricePass && availabilityPass && ratingPass;
});

const handleLogout = () => {
logout();
navigate('/login', { replace: true });
};

const handleCatalogSearch = (event) => {
event.preventDefault();
setCatalogFilter(catalogQuery.trim());
setAppliedFilters(filterInputs);
};

const handleResetCatalog = () => {
const nextFilters = createFilterShape();
setCatalogQuery('');
setCatalogFilter('');
setFilterInputs(nextFilters);
setAppliedFilters(nextFilters);
setSelectedMedicine(null);
};

const handlePrescriptionSubmit = async (event) => {
  event.preventDefault();
  if (!prescriptionForm.drug.trim() || !prescriptionForm.dosage.trim()) return;
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/prescriptions`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        drug: prescriptionForm.drug.trim(),
        dosage: prescriptionForm.dosage.trim(),
        frequency: prescriptionForm.frequency.trim(),
        notes: prescriptionForm.notes || ''
      })
    });

    const data = await response.json();
    if (data.success) {
      // Refresh prescriptions list
      await fetchPrescriptions();
      setPrescriptionForm({ drug: '', dosage: '', frequency: '', notes: '' });
      setActivePanel('prescriptions');
      recordAlert(`${prescriptionForm.drug} prescription added successfully.`);
    } else {
      recordAlert('Failed to add prescription: ' + (data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error submitting prescription:', error);
    recordAlert('Failed to add prescription. Please try again.');
  }
};

const handleOrderSubmit = async (event) => {
  event.preventDefault();
  
  // Validate all medications have availability checked
  const invalidMeds = orderForm.medications.filter((med, index) => 
    med.name.trim() && (!availabilityResults[index] || !availabilityResults[index].success)
  );
  
  if (invalidMeds.length > 0) {
    alert('Please check availability for all medications before placing the order.');
    return;
  }
  
  if (!orderForm.medications.some(med => med.name.trim())) {
    alert('Please add at least one medication.');
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Calculate total amount based on availability results
    const totalAmount = orderForm.medications.reduce((sum, med, index) => {
      if (!med.name.trim() || !availabilityResults[index]?.success) return sum;
      const price = availabilityResults[index].price || 0;
      return sum + (med.quantity * price);
    }, 0);
    
    const orderData = {
      pharmacyId: selectedPharmacy?._id,
      pharmacyName: selectedPharmacy?.pharmacyName || `${selectedPharmacy?.profile?.firstName}'s Pharmacy`,
      medications: orderForm.medications
        .filter(med => med.name.trim())
        .map((med, index) => ({
          name: med.name,
          quantity: med.quantity,
          instructions: med.instructions,
          price: availabilityResults[index]?.price || 0,
          subtotal: med.quantity * (availabilityResults[index]?.price || 0)
        })),
      deliveryAddress: orderForm.deliveryAddress,
      notes: orderForm.notes,
      totalAmount: totalAmount,
      orderDate: new Date().toISOString()
    };

    console.log('Submitting order:', orderData);

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();
    console.log('Order submission response:', data);
    
    if (data.success) {
      // Instead of directly submitting, show payment modal first
      setPendingOrder(orderData);
      setShowOrderModal(false);
      setShowPaymentModal(true);
    } else {
      alert(`Failed to prepare order: ${data.message || data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error submitting order:', error);
    alert('Failed to submit order. Please try again.');
  }
};

// Process payment
const handlePayment = async () => {
  if (!pendingOrder) return;
  
  try {
    setIsProcessingPayment(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay for realism
    
    // Add payment info to order
    const orderWithPayment = {
      ...pendingOrder,
      paymentMethod: paymentMethod,
      paymentStatus: 'paid',
      paidAt: new Date().toISOString(),
      transactionId: `TXN-${Date.now()}`
    };
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderWithPayment)
    });

    const data = await response.json();
    console.log('Order with payment response:', data);
    
    if (data.success) {
      alert(`Payment successful! Order #${data.data._id?.slice(-8) || 'placed'} has been submitted to ${pendingOrder.pharmacyName}.`);
      setShowPaymentModal(false);
      setPendingOrder(null);
      setOrderForm({
        medications: [{ name: '', quantity: 1, instructions: '' }],
        deliveryAddress: { street: '', city: '', kebele: '', postalCode: '' },
        notes: ''
      });
      setAvailabilityResults({});
      setPaymentMethod('cash');
      
      // Refresh orders
      fetchOrders();
    } else {
      alert(`Payment failed: ${data.message || data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    alert('Payment processing failed. Please try again.');
  } finally {
    setIsProcessingPayment(false);
  }
};

const handleRequestRefill = (rxId) => {
setPrescriptions((prev) =>
prev.map((rx) => (rx.id === rxId ? { ...rx, refills: rx.refills + 1 } : rx))
);
recordAlert(`Refill request sent for ${rxId}.`);
};

const handleSelectMedicine = (med) => {
setOrderForm((prev) => ({ 
  ...prev, 
  medications: [{ ...prev.medications[0], name: med.name }]
}));
recordAlert(`${med.name} added to the order form.`);
setActivePanel('orders');
};

// Submit order to pharmacy
const submitOrderToPharmacy = async (pharmacyId) => {
  try {
    setIsSubmittingOrder(true);
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    const orderData = {
      pharmacyId,
      medications: orderForm.medications.filter(med => med.name.trim()),
      deliveryAddress: orderForm.deliveryAddress,
      notes: orderForm.notes,
      totalAmount: orderForm.medications.reduce((sum, med) => sum + (med.quantity * 100), 0) // Simple calculation
    };

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Order submitted successfully! The pharmacy will prepare your order.');
      setShowOrderModal(false);
      setSelectedPharmacy(null);
      setOrderForm({
        medications: [{ name: '', quantity: 1, instructions: '' }],
        deliveryAddress: { street: '', city: '', kebele: '', postalCode: '' },
        notes: ''
      });
      // Refresh orders list
      // fetchOrders(); // You might need to implement this
    } else {
      alert('Failed to submit order: ' + (data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error submitting order:', error);
    alert('Failed to submit order. Please try again.');
  } finally {
    setIsSubmittingOrder(false);
  }
};

// Check medicine availability
const checkMedicineAvailability = async (medicationName, medicationIndex) => {
  if (!medicationName.trim() || !selectedPharmacy) return;
  
  try {
    setCheckingAvailability(prev => ({ ...prev, [medicationIndex]: true }));
    
    console.log('Checking availability for:', {
      pharmacyId: selectedPharmacy._id,
      pharmacyName: selectedPharmacy.pharmacyName,
      medicineName: medicationName.trim()
    });
    
    // First try the backend API
    let response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/inventory/check-availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
      },
      body: JSON.stringify({
        pharmacyId: selectedPharmacy._id,
        medicineName: medicationName.trim()
      })
    });

    console.log('Primary response status:', response.status);
    let data = await response.json();
    console.log('Primary availability response:', data);
    
    // If primary endpoint fails, try alternative approach
    if (!response.ok || !data.success) {
      console.log('Primary endpoint failed, trying alternative...');
      
      // Try to get pharmacy inventory and search locally
      response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/inventory/pharmacy/${selectedPharmacy._id}`, {
        headers: {
          'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
        }
      });
      
      if (response.ok) {
        const inventoryData = await response.json();
        console.log('Pharmacy inventory:', inventoryData);
        
        // Search for medicine in inventory
        const medicine = inventoryData.data?.inventory?.find(item => 
          item.medicineName?.toLowerCase() === medicationName.trim().toLowerCase() ||
          item.name?.toLowerCase() === medicationName.trim().toLowerCase()
        );
        
        if (medicine) {
          data = {
            success: true,
            quantity: medicine.quantity || medicine.stock || 0,
            price: medicine.price || medicine.unitPrice || 0,
            medicine: medicine.medicineName || medicine.name
          };
        } else {
          data = {
            success: false,
            error: `${medicationName} not found in ${selectedPharmacy.pharmacyName}'s inventory`
          };
        }
      }
    }
    
    // If API still fails, use fallback with simulated pharmacy data
    if (!data.success) {
      console.log('API failed completely, using fallback data...');
      
      // Use the same pharmacy inventory data from global search
      const pharmacyInventoryData = {
        'Amoxicillin 500mg': {
          'Pharmacy A': { price: 110, quantity: 50 },
          'Pharmacy B': { price: 125, quantity: 30 },
          'Pharmacy C': { price: 115, quantity: 75 }
        },
        'Metformin 850mg': {
          'Pharmacy A': { price: 85, quantity: 40 },
          'Pharmacy B': { price: 95, quantity: 60 },
          'Pharmacy C': { price: 90, quantity: 25 }
        },
        'Insulin Pen (Rapid)': {
          'Pharmacy A': { price: 420, quantity: 15 },
          'Pharmacy B': { price: 460, quantity: 20 },
          'Pharmacy C': { price: 440, quantity: 10 }
        }
      };
      
      const pharmacyName = selectedPharmacy.pharmacyName || `${selectedPharmacy.profile?.firstName}'s Pharmacy`;
      const medicineData = pharmacyInventoryData[medicationName.trim()]?.[pharmacyName];
      
      if (medicineData) {
        data = {
          success: true,
          quantity: medicineData.quantity,
          price: medicineData.price,
          medicine: medicationName.trim()
        };
        console.log('Using fallback data:', data);
      } else {
        // Check if it's in the base catalog as last resort
        const catalogMedicine = baseMedicineCatalog.find(med => 
          med.name.toLowerCase() === medicationName.trim().toLowerCase()
        );
        
        if (catalogMedicine) {
          data = {
            success: true,
            quantity: 10, // Default quantity
            price: catalogMedicine.averagePrice || 50,
            medicine: catalogMedicine.name
          };
          console.log('Using catalog fallback:', data);
        }
      }
    }
    
    if (data.success) {
      setAvailabilityResults(prev => ({
        ...prev,
        [medicationIndex]: {
          success: true,
          quantity: data.quantity || data.stock || 0,
          price: data.price || data.unitPrice || 0,
          medicine: data.medicine
        }
      }));
    } else {
      setAvailabilityResults(prev => ({
        ...prev,
        [medicationIndex]: { 
          success: false, 
          error: data.message || data.error || 'Medicine not found in this pharmacy inventory' 
        }
      }));
    }
  } catch (error) {
    console.error('Error checking availability:', error);
    
    // Final fallback - try to match with known medicines
    const knownMedicines = ['Amoxicillin 500mg', 'Metformin 850mg', 'Insulin Pen (Rapid)', 'Ibuprofen 200mg', 'Vitamin D3 1000IU', 'Omeprazole 20mg'];
    const medicationNameLower = medicationName.trim().toLowerCase();
    
    if (knownMedicines.some(med => med.toLowerCase() === medicationNameLower)) {
      setAvailabilityResults(prev => ({
        ...prev,
        [medicationIndex]: {
          success: true,
          quantity: 10,
          price: 50, // Default price
          medicine: medicationName.trim()
        }
      }));
    } else {
      setAvailabilityResults(prev => ({
        ...prev,
        [medicationIndex]: { 
          success: false, 
          error: 'Failed to check availability. Please try again.' 
        }
      }));
    }
  } finally {
    setCheckingAvailability(prev => ({ ...prev, [medicationIndex]: false }));
  }
};

const handleCompareMedicine = (med) => {
setSelectedMedicine(med);
recordAlert(`Comparing pharmacy prices for ${med.name}.`);
};

const handleFilterInputChange = (field, value) => {
setFilterInputs((prev) => ({ ...prev, [field]: value }));
};

const pharmacyOptions = Array.from(
new Set(medicineCatalog.flatMap((med) => med.pharmacies.map((pharmacy) => pharmacy.name)))
);

const handleReviewSubmit = (event) => {
event.preventDefault();
if (!reviewForm.pharmacy || !reviewForm.rating.trim()) return;
const newReview = {
id: `REV-${Date.now()}`,
pharmacy: reviewForm.pharmacy,
rating: Number(reviewForm.rating),
comment: reviewForm.comment.trim() || 'No additional feedback provided.',
date: 'Just now',
};
setReviews((prev) => [newReview, ...prev]);
setReviewForm({ pharmacy: '', rating: '5', comment: '' });
recordAlert(`Review submitted for ${newReview.pharmacy}.`);
};

const renderPanelContent = () => {
switch (activePanel) {
case 'pharmacies':
return (
<div>
<div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
  <h3 style={{ margin: '0 0 12px', color: '#1a365d' }}>📍 Find Nearby Pharmacies</h3>
  
  {/* Location Controls */}
  <div style={{ marginBottom: '16px' }}>
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
      <button
        onClick={requestLocationPermissionOnce}
        style={{
          padding: '8px 16px',
          backgroundColor: userLocation ? '#10b981' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        {userLocation ? '📍 Using My Location' : '📍 Use My Location'}
      </button>
      
      <span style={{ color: '#718096' }}>OR</span>
      
      <button
        onClick={() => setLocationFilter(prev => ({ ...prev, enabled: !prev.enabled }))}
        style={{
          padding: '8px 16px',
          backgroundColor: locationFilter.enabled ? '#10b981' : '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        {locationFilter.enabled ? '🏙️ Filter by City' : '🏙️ Filter by City'}
      </button>
    </div>
    
    {locationFilter.enabled && (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Enter city name..."
          value={locationFilter.city}
          onChange={(e) => setLocationFilter(prev => ({ ...prev, city: e.target.value }))}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #cbd5e0',
            fontSize: '14px'
          }}
        />
        
        <select
          value={locationFilter.radius}
          onChange={(e) => setLocationFilter(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #cbd5e0',
            fontSize: '14px'
          }}
        >
          <option value={5}>5 km</option>
          <option value={10}>10 km</option>
          <option value={25}>25 km</option>
          <option value={50}>50 km</option>
        </select>
      </div>
    )}
    
    {userLocation && (
      <div style={{ fontSize: '12px', color: '#059669', marginTop: '8px' }}>
        📍 Using your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
      </div>
    )}
  </div>
</div>

{isLoadingPharmacies ? (
  <div style={{ textAlign: 'center', padding: '40px' }}>
    <div style={{ fontSize: '16px', color: '#718096' }}>Loading approved pharmacies...</div>
  </div>
) : approvedPharmacies.length === 0 ? (
  <div style={{ textAlign: 'center', padding: '40px' }}>
    <div style={{ fontSize: '16px', color: '#718096' }}>No approved pharmacies found</div>
    <div style={{ fontSize: '14px', color: '#a0aec0', marginTop: '8px' }}>
      {locationFilter.enabled 
        ? `Try adjusting your city filter or expanding the search radius`
        : 'Try enabling location-based search or check back later'
      }
    </div>
  </div>
) : (
  <div>
    {!medicineSearchQuery && (
      <h4 style={{ margin: '0 0 16px', color: '#1a365d' }}>
        🏥 Approved Pharmacies Near You
      </h4>
    )}
    <div style={{ display: 'grid', gap: '16px' }}>
      {approvedPharmacies.map((pharmacy) => {
        // Calculate distance if user location is available
        let distance = null;
        
        // Debug logging
        console.log('Pharmacy data:', {
          id: pharmacy._id,
          name: pharmacy.pharmacyName,
          location: pharmacy.pharmacyLocation,
          userLocation: userLocation
        });
        
        if (userLocation && pharmacy.pharmacyLocation) {
          // Try different possible coordinate field names
          const pharmacyLat = pharmacy.pharmacyLocation.lat || pharmacy.pharmacyLocation.latitude;
          const pharmacyLng = pharmacy.pharmacyLocation.lng || pharmacy.pharmacyLocation.longitude;
          
          if (pharmacyLat && pharmacyLng) {
            distance = calculateDistance(userLocation.lat, userLocation.lng, pharmacyLat, pharmacyLng);
            
            console.log('Distance calculated:', {
              pharmacy: pharmacy.pharmacyName,
              distance: distance.toFixed(1)
            });
          }
        }

        return (
          <div key={pharmacy._id} style={{
            padding: '20px',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h4 style={{ margin: '0', color: '#1a365d', fontSize: '18px' }}>
                    {pharmacy.pharmacyName || `${pharmacy.profile?.firstName} ${pharmacy.profile?.lastName}'s Pharmacy`}
                  </h4>
                  {distance !== null && (
                    <div style={{ 
                      padding: '4px 8px',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>
                      🚶 {distance.toFixed(1)} km away
                    </div>
                  )}
                  {!userLocation && (
                    <div style={{ 
                      padding: '4px 8px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>
                      📍 Enable location to see distance
                    </div>
                  )}
                </div>
                <p style={{ margin: '0', color: '#718096', fontSize: '14px' }}>
                  {pharmacy.profile?.firstName} {pharmacy.profile?.lastName}
                </p>
                <p style={{ margin: '4px 0 0', color: '#4a5568', fontSize: '13px' }}>
                  📧 {pharmacy.email}
                </p>
                
                {/* Location Information */}
                {pharmacy.pharmacyLocation && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#2d3748' }}>
                    <div style={{ marginBottom: '4px' }}>
                      📍 {pharmacy.pharmacyLocation.address}
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      🏙️ {pharmacy.pharmacyLocation.city}, {pharmacy.pharmacyLocation.kebele}
                    </div>
                    {pharmacy.pharmacyLocation.postalCode && (
                      <div style={{ marginBottom: '4px' }}>
                        📮 {pharmacy.pharmacyLocation.postalCode}
                      </div>
                    )}
                    {/* Distance already shown next to pharmacy name, so no duplicate here */}
                  </div>
                )}
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: '#d1fae5',
                  color: '#065f46'
                }}>
                  Approved
                </span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => {
                  setSelectedPharmacy(pharmacy);
                  setOrderTrackAction('order');
                  setShowOrderTrackModal(true);
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                📦 Place Order
              </button>
              <button
                onClick={() => {
                  setSelectedPharmacy(pharmacy);
                  setOrderTrackAction('track');
                  setShowOrderTrackModal(true);
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                📍 Track Order
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
</div>
);
case 'prescriptions':
return (
<div style={{ display: 'grid', gap: '18px' }}>
<form onSubmit={handlePrescriptionSubmit} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Add Prescription</h4>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
<input
style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
placeholder="Medication name"
value={prescriptionForm.drug}
onChange={(e) => setPrescriptionForm(prev => ({ ...prev, drug: e.target.value }))}
/>
<input
style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
placeholder="Dosage (e.g., 500mg)"
value={prescriptionForm.dosage}
onChange={(e) => setPrescriptionForm(prev => ({ ...prev, dosage: e.target.value }))}
/>
<input
style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
placeholder="Frequency (e.g., 2x daily)"
value={prescriptionForm.frequency}
onChange={(e) => setPrescriptionForm(prev => ({ ...prev, frequency: e.target.value }))}
/>
</div>
<textarea
style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', minHeight: '80px', marginBottom: '12px' }}
placeholder="Additional notes..."
value={prescriptionForm.notes}
onChange={(e) => setPrescriptionForm(prev => ({ ...prev, notes: e.target.value }))}
/>
<button type="submit" style={{ ...buttonBaseStyle, background: '#38a169' }}>Add Prescription</button>
</form>

<div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Your Prescriptions</h4>
{prescriptions.length === 0 ? (
<p style={{ margin: 0, color: '#a0aec0' }}>No prescriptions yet.</p>
) : (
<div style={{ display: 'grid', gap: '12px' }}>
{prescriptions.map((prescription) => (
<div key={prescription.id} style={{ border: '1px solid #edf2f7', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
<div>
<div style={{ fontWeight: 600, color: '#2d3748' }}>{prescription.drug}</div>
<p style={{ margin: 0, fontSize: '12px', color: '#4a5568' }}>{prescription.dosage} • {prescription.frequency}</p>
{prescription.notes && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#718096' }}>{prescription.notes}</p>}
</div>
<div style={{ display: 'flex', gap: '8px' }}>
<button style={{ ...buttonBaseStyle, background: '#2563eb' }} onClick={() => setActivePanel('medicines')}>
Order Medicine
</button>
<button style={{ ...buttonBaseStyle, background: '#f59e0b' }}>
Request Refill
</button>
</div>
</div>
))}
</div>
)}
</div>
</div>
);
case 'orders':
return (
<div style={{ display: 'grid', gap: '18px' }}>
<div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Your Orders</h4>
{orders.length === 0 ? (
<p style={{ margin: 0, color: '#a0aec0' }}>No orders yet.</p>
) : (
<div style={{ display: 'grid', gap: '12px' }}>
{orders.map((order) => (
<div key={order.id} style={{ border: '1px solid #edf2f7', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
<div>
<div style={{ fontWeight: 600, color: '#2d3748' }}>
{order.medications ? order.medications.map(med => med.name).join(', ') : order.medication || 'Order'}
</div>
<p style={{ margin: 0, fontSize: '12px', color: '#4a5568' }}>
{order.medications ? `${order.medications.length} medication(s)` : `Qty ${order.quantity || 1}`}
</p>
{order.notes && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#718096' }}>{order.notes}</p>}
{order.totalAmount && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#2d3748' }}>Total: {order.totalAmount} ETB</p>}
</div>
<div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
<span
style={{
padding: '6px 12px',
borderRadius: '999px',
background: order.status === 'Delivered' ? '#c6f6d5' : order.status === 'Processing' ? '#fefcbf' : '#e0e7ff',
color: order.status === 'Delivered' ? '#22543d' : order.status === 'Processing' ? '#744210' : '#3730a3',
fontSize: '12px',
fontWeight: 600,
}}
>
{order.status}
</span>
{order.status !== 'Delivered' && (
<button style={{ ...buttonBaseStyle, background: '#ef4444', fontSize: '12px', padding: '4px 8px' }}>
Cancel Order
</button>
)}
{order.status === 'Delivered' && (
<button style={{ ...buttonBaseStyle, background: '#3b82f6', fontSize: '12px', padding: '4px 8px' }}>
Reorder
</button>
)}
</div>
</div>
))}
</div>
)}
</div>
</div>
);
case 'deliveries':
return (
<div>
{deliveries.map((delivery) => (
<div key={delivery.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
<div>
<div style={{ fontWeight: 600 }}>{delivery.id}</div>
<p style={{ margin: 0, color: '#4a5568' }}>Courier: {delivery.courier}</p>
<p style={{ margin: '4px 0 0', color: '#4a5568' }}>{delivery.eta}</p>
</div>
{delivery.status !== 'Delivered' ? (
<button style={{ ...buttonBaseStyle, background: '#dd6b20' }} onClick={() => handleConfirmDelivery(delivery.id)}>
Mark Received
</button>
) : (
<span style={{ color: '#2f855a', fontWeight: 600 }}>Delivered</span>
)}
</div>
</div>
))}
</div>
);
case 'profile':
return (
<div style={{ display: 'grid', gap: '18px' }}>
<div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>My Profile</h4>
{patientProfile ? (
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
<div>
<h5 style={{ margin: '0 0 8px', color: '#374151' }}>Personal Information</h5>
<p><strong>Name:</strong> {patientProfile.profile?.firstName} {patientProfile.profile?.lastName}</p>
<p><strong>Email:</strong> {patientProfile.email}</p>
<p><strong>Phone:</strong> {patientProfile.profile?.phone}</p>
<p><strong>Date of Birth:</strong> {patientProfile.profile?.dateOfBirth || 'Not set'}</p>
<p><strong>Gender:</strong> {patientProfile.profile?.gender || 'Not set'}</p>
</div>
<div>
<h5 style={{ margin: '0 0 8px', color: '#374151' }}>Medical Information</h5>
<p><strong>Blood Type:</strong> {patientProfile.profile?.medicalInfo?.bloodType || 'Not set'}</p>
<p><strong>Allergies:</strong> {patientProfile.profile?.medicalInfo?.allergies?.join(', ') || 'None'}</p>
<p><strong>Chronic Conditions:</strong> {patientProfile.profile?.medicalInfo?.chronicConditions?.join(', ') || 'None'}</p>
</div>
<div>
<h5 style={{ margin: '0 0 8px', color: '#374151' }}>Emergency Contact</h5>
<p><strong>Name:</strong> {patientProfile.profile?.emergencyContact?.name || 'Not set'}</p>
<p><strong>Phone:</strong> {patientProfile.profile?.emergencyContact?.phone || 'Not set'}</p>
<p><strong>Relationship:</strong> {patientProfile.profile?.emergencyContact?.relationship || 'Not set'}</p>
</div>
<div>
<h5 style={{ margin: '0 0 8px', color: '#374151' }}>Addresses</h5>
{patientProfile.profile?.addresses?.map((address, index) => (
<div key={index} style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
<p style={{ margin: 0 }}><strong>{address.type}:</strong></p>
<p style={{ margin: 0 }}>{address.street}, {address.city}</p>
<p style={{ margin: 0 }}>{address.kebele}, {address.postalCode}</p>
</div>
))}
</div>
</div>
) : (
<p style={{ margin: 0, color: '#a0aec0' }}>Loading profile...</p>
)}
</div>
</div>
);
default:
return null;
}
};

return (
<div style={dashboardShellStyle}>
<div style={dashboardContentStyle}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
<div>
<h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#2d3748', marginBottom: '6px' }}>Patient Dashboard</h1>
<p style={{ fontSize: '16px', color: '#718096', margin: 0 }}>Use the cards below to manage your care workflow.</p>
</div>
<button style={{ ...buttonBaseStyle, background: '#1f2937', padding: '10px 18px' }} onClick={handleLogout}>
Logout
</button>
</div>

{/* Global Medicine Search */}
<div style={{ marginBottom: '24px', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
  <h3 style={{ margin: '0 0 16px', color: 'white', fontSize: '20px', fontWeight: '600' }}>🔍 Search for Medicines</h3>
  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
    <input
      type="text"
      placeholder="Search for any medicine (e.g., Amoxicillin, Paracetamol)..."
      value={globalMedicineSearch}
      onChange={(e) => {
        setGlobalMedicineSearch(e.target.value);
        searchGlobalMedicines(e.target.value);
      }}
      style={{
        flex: 1,
        padding: '14px 18px',
        borderRadius: '12px',
        border: 'none',
        fontSize: '16px',
        background: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        outline: 'none'
      }}
    />
    {globalMedicineSearch && (
      <button
        onClick={() => {
          setGlobalMedicineSearch('');
          setGlobalMedicineResults([]);
        }}
        style={{
          padding: '14px 18px',
          background: 'rgba(255, 255, 255, 0.2)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          transition: 'all 0.2s ease'
        }}
      >
        Clear
      </button>
    )}
  </div>
  
  {/* Global Medicine Search Results */}
  {globalMedicineResults.length > 0 && (
    <div style={{ marginTop: '20px' }}>
      <h4 style={{ margin: '0 0 12px', color: 'white', fontSize: '16px' }}>
        💊 Found at {globalMedicineResults.length} Pharmacies
      </h4>
      <div style={{ display: 'grid', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
        {globalMedicineResults.map((result, index) => (
          <div key={index} style={{
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <div>
                <h5 style={{ margin: '0 0 4px', color: '#2d3748', fontSize: '16px', fontWeight: '600' }}>
                  {result.pharmacyName}
                </h5>
                <p style={{ margin: '0', color: '#718096', fontSize: '14px' }}>
                  📍 {result.pharmacyAddress}, {result.pharmacyCity}
                </p>
                {result.distance !== null && (
                  <div style={{
                    display: 'inline-block',
                    marginTop: '4px',
                    padding: '4px 8px',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    🚶 {result.distance.toFixed(1)} km away
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>
                  ETB {result.price}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: result.quantity > 0 ? '#059669' : '#dc2626',
                  fontWeight: '600'
                }}>
                  {result.quantity > 0 ? `✓ ${result.quantity} in stock` : '✗ Out of stock'}
                </div>
                {result.source === 'catalog' && (
                  <div style={{
                    fontSize: '10px',
                    color: '#f59e0b',
                    fontWeight: '600',
                    marginTop: '4px',
                    padding: '2px 6px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '4px',
                    display: 'inline-block'
                  }}>
                    📋 Catalog Data
                  </div>
                )}
                {result.source === 'pharmacy_inventory' && (
                  <div style={{
                    fontSize: '10px',
                    color: '#059669',
                    fontWeight: '600',
                    marginTop: '4px',
                    padding: '2px 6px',
                    backgroundColor: '#d1fae5',
                    borderRadius: '4px',
                    display: 'inline-block'
                  }}>
                    🏪 Pharmacy Price
                  </div>
                )}
              </div>
            </div>
            <div style={{ fontSize: '14px', color: '#4a5568', fontWeight: '500' }}>
              💊 {result.medicineName}
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</div>

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
{statCards.map((stat) => (
<div key={stat.label} style={{ ...cardBaseStyle, padding: '20px' }}>
<p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>{stat.label}</p>
<div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>{stat.value}</div>
</div>
))}
</div>

{alerts.length > 0 && (
<div style={{ marginBottom: '24px', background: '#e6fffa', borderRadius: '12px', padding: '16px', border: '1px solid #b2f5ea' }}>
{alerts.map((alert, index) => (
<p key={`${alert}-${index}`} style={{ margin: 0, color: '#285e61', fontWeight: 500 }}>
• {alert}
</p>
))}
</div>
)}

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
<div style={cardBaseStyle}>
<h3 style={cardTitleStyle}>My Prescriptions</h3>
<p style={cardBodyStyle}>Add new medications or request refills.</p>
<button style={actionButtonStyle(activePanel === 'prescriptions', '#4299e1')} onClick={() => setActivePanel('prescriptions')}>
Open Prescriptions
</button>
</div>
<div style={cardBaseStyle}>
<h3 style={cardTitleStyle}>Order Medication</h3>
<p style={cardBodyStyle}>Fill out an order form and watch for queue update.</p>
<button style={actionButtonStyle(activePanel === 'orders', '#48bb78')} onClick={() => {
  // Find first approved pharmacy and set it as selected
  const firstApprovedPharmacy = approvedPharmacies.length > 0 ? approvedPharmacies[0] : null;
  if (firstApprovedPharmacy) {
    setSelectedPharmacy(firstApprovedPharmacy);
    setShowOrderTrackModal(true);
    setOrderTrackAction('order');
  } else {
    alert('No approved pharmacies available. Please try again later.');
  }
}}>
Place Order
</button>
</div>
<div style={cardBaseStyle}>
<h3 style={cardTitleStyle}>Approved Pharmacies</h3>
<p style={cardBodyStyle}>View approved pharmacies ready to serve you.</p>
<button style={actionButtonStyle(activePanel === 'approved-pharmacies', '#10b981')} onClick={() => setActivePanel('approved-pharmacies')}>
View Pharmacies
</button>
</div>
<div style={cardBaseStyle}>
<h3 style={cardTitleStyle}>Delivery Status</h3>
<p style={cardBodyStyle}>Confirm when a courier drops off your package.</p>
<button style={actionButtonStyle(activePanel === 'deliveries', '#dd6b20')} onClick={() => setActivePanel('deliveries')}>
View Deliveries
</button>
</div>
</div>

<div style={workspaceCardStyle}>
<div>
<h2 style={{ margin: 0, color: '#1a365d' }}>Workspace</h2>
<p style={{ margin: 0, color: '#718096' }}>Hands-on tools for {activePanel}.</p>
</div>
{renderPanelContent()}
</div>

{/* Order/Track Modal */}
{showOrderTrackModal && selectedPharmacy && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000
  }}>
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '32px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      maxWidth: '500px',
      width: '100%'
    }}>
      <h3 style={{ margin: '0 0 24px', color: '#2d3748', fontSize: '24px', fontWeight: '700' }}>
        {orderTrackAction === 'order' ? '📦 Place Order' : '📍 Track Order'}
      </h3>
      
      <div style={{ marginBottom: '24px' }}>
        <p style={{ margin: '0 0 16px', color: '#718096', fontSize: '16px' }}>
          {orderTrackAction === 'order' 
            ? `Place an order with ${selectedPharmacy.pharmacyName || `${selectedPharmacy.profile?.firstName}'s Pharmacy`}`
            : `Track your orders from ${selectedPharmacy.pharmacyName || `${selectedPharmacy.profile?.firstName}'s Pharmacy`}`
          }
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
        {orderTrackAction === 'order' && (
          <button
            onClick={() => {
              setShowOrderTrackModal(false);
              setShowOrderModal(true);
            }}
            style={{
              padding: '16px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📦 Continue to Order
          </button>
        )}
        
        {orderTrackAction === 'track' && (
          <button
            onClick={() => {
              setShowOrderTrackModal(false);
              setActivePanel('orders');
            }}
            style={{
              padding: '16px 24px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📍 View Orders
          </button>
        )}
        
        <button
          onClick={() => {
            setShowOrderTrackModal(false);
            setSelectedPharmacy(null);
            setOrderTrackAction('');
          }}
          style={{
            padding: '16px 24px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

{/* Order Modal */}
{showOrderModal && selectedPharmacy && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  }}>
    <div style={{
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '12px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <h3 style={{ margin: '0 0 16px', color: '#1a365d' }}>
        Place Order - {selectedPharmacy.pharmacyName || `${selectedPharmacy.profile?.firstName}'s Pharmacy`}
      </h3>
      
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Medications:</label>
        {orderForm.medications.map((med, index) => (
          <div key={index} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Medication name"
                value={med.name}
                onChange={(e) => {
                  const newMeds = [...orderForm.medications];
                  newMeds[index].name = e.target.value;
                  setOrderForm(prev => ({ ...prev, medications: newMeds }));
                  // Clear availability when name changes
                  setAvailabilityResults(prev => ({ ...prev, [index]: null }));
                }}
                onBlur={() => med.name.trim() && checkMedicineAvailability(med.name, index)}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
              />
              <input
                type="number"
                min="1"
                placeholder="Qty"
                value={med.quantity}
                onChange={(e) => {
                  const newMeds = [...orderForm.medications];
                  newMeds[index].quantity = parseInt(e.target.value) || 1;
                  setOrderForm(prev => ({ ...prev, medications: newMeds }));
                }}
                style={{ width: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
              />
            </div>
            
            {/* Availability Check Results */}
            {availabilityResults[index] && (
              <div style={{ 
                padding: '8px', 
                borderRadius: '6px', 
                fontSize: '12px',
                backgroundColor: availabilityResults[index].success ? '#d4edda' : '#f8d7da',
                color: availabilityResults[index].success ? '#155724' : '#721c24'
              }}>
                {availabilityResults[index].success ? (
                  <div>
                    <strong>✓ Available</strong> - {availabilityResults[index].quantity} units in stock
                    {availabilityResults[index].price && ` • ${availabilityResults[index].price} ETB per unit`}
                  </div>
                ) : (
                  <div>
                    <strong>✗ Not Available</strong> - {availabilityResults[index].error || 'Out of stock'}
                  </div>
                )}
              </div>
            )}
            
            {/* Checking Availability Indicator */}
            {checkingAvailability[index] && (
              <div style={{ 
                padding: '8px', 
                borderRadius: '6px', 
                fontSize: '12px',
                backgroundColor: '#fff3cd',
                color: '#856404'
              }}>
                <strong>Checking availability...</strong>
              </div>
            )}
            
            <input
              type="text"
              placeholder="Instructions (e.g., take with food)"
              value={med.instructions}
              onChange={(e) => {
                const newMeds = [...orderForm.medications];
                newMeds[index].instructions = e.target.value;
                setOrderForm(prev => ({ ...prev, medications: newMeds }));
              }}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setOrderForm(prev => ({
              ...prev,
              medications: [...prev.medications, { name: '', quantity: 1, instructions: '' }]
            }));
          }}
          style={{ padding: '4px 8px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', fontSize: '12px' }}
        >
          + Add Medication
        </button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Delivery Address:</label>
        <input
          type="text"
          placeholder="Street"
          value={orderForm.deliveryAddress.street}
          onChange={(e) => setOrderForm(prev => ({
            ...prev,
            deliveryAddress: { ...prev.deliveryAddress, street: e.target.value }
          }))}
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', marginBottom: '8px' }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="City"
            value={orderForm.deliveryAddress.city}
            onChange={(e) => setOrderForm(prev => ({
              ...prev,
              deliveryAddress: { ...prev.deliveryAddress, city: e.target.value }
            }))}
            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
          />
          <input
            type="text"
            placeholder="Kebele"
            value={orderForm.deliveryAddress.kebele}
            onChange={(e) => setOrderForm(prev => ({
              ...prev,
              deliveryAddress: { ...prev.deliveryAddress, kebele: e.target.value }
            }))}
            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Additional Notes:</label>
        <textarea
          placeholder="Any special instructions..."
          value={orderForm.notes}
          onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', minHeight: '80px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => {
            setShowOrderModal(false);
            setSelectedPharmacy(null);
            setOrderForm({
              medications: [{ name: '', quantity: 1, instructions: '' }],
              deliveryAddress: { street: '', city: '', kebele: '', postalCode: '' },
              notes: ''
            });
          }}
          style={{ ...buttonBaseStyle, background: '#718096' }}
        >
          Cancel
        </button>
        <button
          onClick={() => submitOrderToPharmacy(selectedPharmacy._id)}
          disabled={isSubmittingOrder || !orderForm.medications.some(med => med.name.trim()) || 
            orderForm.medications.some((med, index) => 
              med.name.trim() && (!availabilityResults[index] || !availabilityResults[index].success)
            )}
          style={{ 
            ...buttonBaseStyle, 
            background: '#3182ce', 
            opacity: (isSubmittingOrder || !orderForm.medications.some(med => med.name.trim()) || 
              orderForm.medications.some((med, index) => 
                med.name.trim() && (!availabilityResults[index] || !availabilityResults[index].success)
              )) ? 0.5 : 1 
          }}
        >
          {isSubmittingOrder ? 'Submitting...' : 'Submit Order'}
        </button>
      </div>
    </div>
  </div>
)}
</div>
</div>
);
};

const SupplierDashboard = () => {
const navigate = useNavigate();
const { logout, user } = useAuth();
const { supplyLedger, addShipment, updateShipmentStatus } = useSupplyChain();
const [activePanel, setActivePanel] = useState('overview');
const [shipmentForm, setShipmentForm] = useState({
pharmacyId: 'PH-001',
medicineId: 'MED-001',
quantity: '100',
wholesalePrice: '80',
markupPercent: '20',
eta: '3 days',
});
const [highlightPharmacy, setHighlightPharmacy] = useState('');
const [highlightMedicine, setHighlightMedicine] = useState('');

const inventoryDemand = baseMedicineCatalog.map((med) => ({
id: med.id,
label: med.name,
demandStatus: med.availability === 'low_stock' ? 'High demand' : med.availability === 'pre_order' ? 'Pre-order' : 'Stable',
pharmaciesCarrying: med.pharmacies.length,
}));

const supplyStats = {
activeShipments: supplyLedger.filter((entry) => entry.status !== 'Delivered').length,
totalUnits: supplyLedger.reduce((sum, entry) => sum + entry.quantity, 0),
pharmaciesServed: new Set(supplyLedger.map((entry) => entry.pharmacyId)).size,
};

const handleLogout = () => {
logout();
navigate('/login', { replace: true });
};

const handleShipmentSubmit = (event) => {
event.preventDefault();
if (!shipmentForm.pharmacyId || !shipmentForm.medicineId) return;
addShipment({
...shipmentForm,
supplier: user?.profile?.company || 'Demo Supplier',
quantity: Number(shipmentForm.quantity),
wholesalePrice: Number(shipmentForm.wholesalePrice),
markupPercent: Number(shipmentForm.markupPercent),
});
setShipmentForm((prev) => ({ ...prev, quantity: '100' }));
setActivePanel('transactions');
};

const filteredLedger = supplyLedger.filter((entry) => {
const pharmacyMatch = highlightPharmacy ? entry.pharmacyId === highlightPharmacy : true;
const medicineMatch = highlightMedicine ? entry.medicineId === highlightMedicine : true;
return pharmacyMatch && medicineMatch;
});

const renderSupplierPanel = () => {
switch (activePanel) {
case 'overview':
return (
<div style={{ display: 'grid', gap: '18px' }}>
<div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Demand signals</h4>
<div style={{ display: 'grid', gap: '10px' }}>
{inventoryDemand.map((item) => (
<div key={item.id} style={{ border: '1px solid #edf2f7', borderRadius: '12px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
<div>
<div style={{ fontWeight: 600 }}>{item.label}</div>
<p style={{ margin: 0, fontSize: '12px', color: '#4a5568' }}>{item.demandStatus}</p>
</div>
<span style={{ fontSize: '12px', color: '#718096' }}>{item.pharmaciesCarrying} pharmacies</span>
</div>
))}
</div>
</div>
<div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Partner pharmacies</h4>
<div style={{ display: 'grid', gap: '10px' }}>
{pharmacyDirectory.map((pharmacy) => (
<div key={pharmacy.id} style={{ border: '1px solid #edf2f7', borderRadius: '12px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
<div>
<div style={{ fontWeight: 600 }}>{pharmacy.name}</div>
<p style={{ margin: 0, fontSize: '12px', color: '#4a5568' }}>{pharmacy.city} • {pharmacy.kebele}</p>
</div>
<button style={{ ...buttonBaseStyle, background: '#2563eb' }} onClick={() => {
setHighlightPharmacy(pharmacy.id);
setActivePanel('transactions');
}}>
View supply
</button>
</div>
))}
</div>
</div>
</div>
);
case 'transactions':
return (
<div style={{ display: 'grid', gap: '18px' }}>
<div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<form onSubmit={handleShipmentSubmit} style={{ display: 'grid', gap: '12px' }}>
<h4 style={{ margin: 0, color: '#1a365d' }}>Create shipment</h4>
<select
value={shipmentForm.pharmacyId}
onChange={(e) => setShipmentForm((prev) => ({ ...prev, pharmacyId: e.target.value }))}
style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e0' }}
>
{pharmacyDirectory.map((pharmacy) => (
<option key={pharmacy.id} value={pharmacy.id}>
{pharmacy.name}
</option>
))}
</select>
<select
value={shipmentForm.medicineId}
onChange={(e) => setShipmentForm((prev) => ({ ...prev, medicineId: e.target.value }))}
style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e0' }}
>
{baseMedicineCatalog.map((med) => (
<option key={med.id} value={med.id}>
{med.name}
</option>
))}
</select>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
<input
type="number"
placeholder="Quantity"
value={shipmentForm.quantity}
onChange={(e) => setShipmentForm((prev) => ({ ...prev, quantity: e.target.value }))}
style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e0' }}
/>
<input
type="number"
placeholder="Wholesale price"
value={shipmentForm.wholesalePrice}
onChange={(e) => setShipmentForm((prev) => ({ ...prev, wholesalePrice: e.target.value }))}
style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e0' }}
/>
<input
type="number"
placeholder="Markup %"
value={shipmentForm.markupPercent}
onChange={(e) => setShipmentForm((prev) => ({ ...prev, markupPercent: e.target.value }))}
style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e0' }}
/>
<input
placeholder="ETA (e.g. 3 days)"
value={shipmentForm.eta}
onChange={(e) => setShipmentForm((prev) => ({ ...prev, eta: e.target.value }))}
style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e0' }}
/>
</div>
<button type="submit" style={{ ...buttonBaseStyle, background: '#38a169' }}>Send shipment</button>
</form>
</div>
<div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
<select
value={highlightPharmacy}
onChange={(e) => setHighlightPharmacy(e.target.value)}
style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e0' }}
>
<option value="">All pharmacies</option>
{pharmacyDirectory.map((pharmacy) => (
<option key={pharmacy.id} value={pharmacy.id}>
{pharmacy.name}
</option>
))}
</select>
<select
value={highlightMedicine}
onChange={(e) => setHighlightMedicine(e.target.value)}
style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e0' }}
>
<option value="">All medicines</option>
{baseMedicineCatalog.map((med) => (
<option key={med.id} value={med.id}>
{med.name}
</option>
))}
</select>
</div>
<div style={{ display: 'grid', gap: '12px' }}>
{filteredLedger.map((entry) => (
<div key={entry.id} style={{ border: '1px solid #edf2f7', borderRadius: '10px', padding: '12px' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
<div>
<strong style={{ color: '#2d3748' }}>{entry.medicineName}</strong>
<p style={{ margin: 0, fontSize: '12px', color: '#4a5568' }}>{entry.pharmacyName} • Qty {entry.quantity}</p>
</div>
<span style={{ fontSize: '12px', fontWeight: 600, color: entry.status === 'Delivered' ? '#2f855a' : '#b7791f' }}>
{entry.status}
</span>
</div>
<p style={{ margin: '4px 0 0', fontSize: '12px', color: '#718096' }}>
Wholesale {entry.wholesalePrice} birr • Markup {entry.markupPercent}% • Patient price ≈{' '}
{Math.round(entry.wholesalePrice * (1 + entry.markupPercent / 100))} birr
</p>
{entry.status !== 'Delivered' && (
<div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
<button
style={{ ...buttonBaseStyle, background: '#2563eb' }}
onClick={() => updateShipmentStatus(entry.id, 'Delivered')}
>
Mark delivered
</button>
<button
style={{ ...buttonBaseStyle, background: '#4a5568' }}
onClick={() => updateShipmentStatus(entry.id, 'Delayed')}
>
Flag delay
</button>
</div>
)}
</div>
))}
{filteredLedger.length === 0 && <p style={{ margin: 0, color: '#a0aec0' }}>No shipments match the filters.</p>}
</div>
</div>
</div>
);
case 'network':
return (
<div style={{ display: 'grid', gap: '18px' }}>
<div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Supplier directory</h4>
<div style={{ display: 'grid', gap: '10px' }}>
{supplierCatalog.map((supplier) => (
<div key={supplier.id} style={{ border: '1px solid #edf2f7', borderRadius: '12px', padding: '12px' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
<strong style={{ color: '#2d3748' }}>{supplier.name}</strong>
<span style={{ color: '#f59e0b' }}>★ {supplier.rating}</span>
</div>
<p style={{ margin: '4px 0', color: '#4a5568' }}>Coverage: {supplier.coverage}</p>
<p style={{ margin: 0, fontSize: '12px', color: '#718096' }}>Contact: {supplier.contact}</p>
</div>
))}
</div>
</div>
<div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Collaboration ideas</h4>
<ul style={{ margin: 0, paddingLeft: '18px', color: '#4a5568', lineHeight: 1.6 }}>
<li>Run shortage drills with pharmacies to plan contingency stock.</li>
<li>Provide educational pricing sheets for transparency with patients.</li>
<li>Partner with government to prioritize essential medicines.</li>
</ul>
</div>
</div>
);
default:
return null;
}
};

return (
<div style={dashboardShellStyle}>
<div style={dashboardContentStyle}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
<div>
<h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#2d3748', marginBottom: '6px' }}>Supplier Dashboard</h1>
<p style={{ fontSize: '16px', color: '#718096', margin: 0 }}>Plan shipments, track deliveries, and influence retail prices.</p>
</div>
<button style={{ ...buttonBaseStyle, background: '#1f2937', padding: '10px 18px' }} onClick={handleLogout}>
Logout
</button>
</div>

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
<div style={{ ...cardBaseStyle, padding: '20px' }}>
<p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>Active shipments</p>
<div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>{supplyStats.activeShipments}</div>
</div>
<div style={{ ...cardBaseStyle, padding: '20px' }}>
<p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>Units moved</p>
<div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>{supplyStats.totalUnits}</div>
</div>
<div style={{ ...cardBaseStyle, padding: '20px' }}>
<p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>Pharmacies served</p>
<div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>{supplyStats.pharmaciesServed}</div>
</div>
</div>

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '32px' }}>
<div style={cardBaseStyle}>
<h3 style={cardTitleStyle}>Market overview</h3>
<p style={cardBodyStyle}>Identify hotspots to restock.</p>
<button style={actionButtonStyle(activePanel === 'overview', '#2563eb')} onClick={() => setActivePanel('overview')}>
View signals
</button>
</div>
<div style={cardBaseStyle}>
<h3 style={cardTitleStyle}>Transactions</h3>
<p style={cardBodyStyle}>Simulate shipments to pharmacies.</p>
<button style={actionButtonStyle(activePanel === 'transactions', '#38a169')} onClick={() => setActivePanel('transactions')}>
Manage shipments
</button>
</div>
<div style={cardBaseStyle}>
<h3 style={cardTitleStyle}>Network</h3>
<p style={cardBodyStyle}>Collaborate with peers.</p>
<button style={actionButtonStyle(activePanel === 'network', '#9333ea')} onClick={() => setActivePanel('network')}>
View partners
</button>
</div>
</div>

<div style={workspaceCardStyle}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
<div>
<h2 style={{ margin: 0, color: '#1a365d' }}>Workspace</h2>
<p style={{ margin: 0, color: '#718096' }}>Hands-on tools for {activePanel}.</p>
</div>
</div>
{renderSupplierPanel()}
</div>
</div>
</div>
);
};

const PharmacyDashboard = ({ activePharmacy }) => {
const navigate = useNavigate();
const { logout } = useAuth();
const [activePanel, setActivePanel] = useState('inventory');

const [alerts, setAlerts] = useState([]);
const [inventory, setInventory] = useState([
{ id: 'INV-101', name: 'Amoxicillin 500mg', stock: 320, unit: 'caps', reorderPoint: 150, expiry: 'Apr 2025', supplier: 'PharmaLab PLC', price: 120 },
{ id: 'INV-088', name: 'Metformin 850mg', stock: 140, unit: 'tabs', reorderPoint: 120, expiry: 'Jan 2026', supplier: 'LifePharm', price: 95 },
{ id: 'INV-230', name: 'Insulin Pen (Rapid)', stock: 40, unit: 'cartridges', reorderPoint: 60, expiry: 'Dec 2024', supplier: 'Novo Ethiopia', price: 450 },
]);

const [ordersQueue, setOrdersQueue] = useState([
{ id: 'ORD-7901', patient: 'Selam M', medicine: 'Metformin 850mg', qty: 2, status: 'Pending verification' },
{ id: 'ORD-7894', patient: 'Abel T', medicine: 'Insulin Pen (Rapid)', qty: 1, status: 'Awaiting pickup' },
{ id: 'ORD-7888', patient: 'Rahel G', medicine: 'Vitamin D3', qty: 3, status: 'Packed' },
]);

const [shortageReports, setShortageReports] = useState([
{ id: 'SRT-301', medicine: 'Insulin Pen (Rapid)', severity: 'critical', submitted: 'Today', status: 'Escalated to supplier' },
{ id: 'SRT-287', medicine: 'Salbutamol Inhaler', severity: 'warning', submitted: 'Yesterday', status: 'Awaiting delivery' },
]);

const [feedback, setFeedback] = useState([
{ id: 'FDB-120', author: 'Patient • Dawit', topic: 'Delivery delay', detail: 'Courier arrived 40 minutes late.', status: 'Open' },
{ id: 'FDB-121', author: 'Patient • Eden', topic: 'Great counseling', detail: 'Appreciated the dosage explanation.', status: 'Resolved' },
]);

const [inventoryForm, setInventoryForm] = useState({ name: '', delta: '', lot: '', price: '' });
const [shortageForm, setShortageForm] = useState({ medicine: '', severity: 'warning', notes: '' });
const [feedbackNote, setFeedbackNote] = useState({ targetId: '', note: '' });

const recordAlert = (message) => setAlerts((prev) => [message, ...prev].slice(0, 4));

const inventoryStats = {
totalUnits: inventory.reduce((sum, item) => sum + item.stock, 0),
lowStock: inventory.filter((item) => item.stock <= item.reorderPoint).length,
openOrders: ordersQueue.filter((order) => order.status !== 'Completed').length,
};

const handleLogout = () => {
logout();
navigate('/login', { replace: true });
};

const adjustStock = (id, delta) => {
setInventory((prev) =>
prev.map((item) => (item.id === id ? { ...item, stock: Math.max(0, item.stock + delta) } : item))
);
recordAlert(`Stock adjusted for ${id}.`);
};

const handleInventorySubmit = (event) => {
event.preventDefault();
if (!inventoryForm.name.trim() || !inventoryForm.delta.trim()) return;
const units = Number(inventoryForm.delta);
const price = Number(inventoryForm.price) || 0;
setInventory((prev) => {
const existing = prev.find((item) => item.name === inventoryForm.name.trim());
if (existing) {
return prev.map((item) =>
item.name === inventoryForm.name.trim()
? { ...item, stock: Math.max(0, item.stock + units), price: price > 0 ? price : item.price }
: item
);
}
return [
{
id: `INV-${Math.floor(Math.random() * 900 + 100)}`,
name: inventoryForm.name.trim(),
stock: Math.max(0, units),
unit: 'units',
reorderPoint: 50,
expiry: 'TBD',
supplier: inventoryForm.lot.trim() || 'New supplier',
price: price > 0 ? price : 50, // Default price if not specified
},
...prev,
];
});
recordAlert(`Received ${inventoryForm.delta} units for ${inventoryForm.name}${price > 0 ? ` at ETB ${price}` : ''}.`);
setInventoryForm({ name: '', delta: '', lot: '', price: '' });
};

const handleShortageSubmit = (event) => {
event.preventDefault();
if (!shortageForm.medicine.trim()) return;
const newReport = {
id: `SRT-${Math.floor(Math.random() * 900 + 300)}`,
medicine: shortageForm.medicine.trim(),
severity: shortageForm.severity,
submitted: 'Just now',
status: 'New',
notes: shortageForm.notes.trim(),
};
setShortageReports((prev) => [newReport, ...prev]);
recordAlert(`Shortage flagged for ${newReport.medicine}.`);
setShortageForm({ medicine: '', severity: 'warning', notes: '' });
};

const resolveShortage = (id) => {
setShortageReports((prev) => prev.map((report) => (report.id === id ? { ...report, status: 'Resolved' } : report)));
recordAlert(`Shortage ${id} resolved.`);
};

const advanceOrder = (id) => {
const steps = ['Pending verification', 'Packed', 'Awaiting pickup', 'Completed'];
setOrdersQueue((prev) =>
prev.map((order) =>
order.id === id
? {
...order,
status: steps[Math.min(steps.indexOf(order.status) + 1, steps.length - 1)],
}
: order
)
);
recordAlert(`Order ${id} progressed.`);
};

const handleFeedbackNote = (event) => {
event.preventDefault();
if (!feedbackNote.targetId || !feedbackNote.note.trim()) return;
setFeedback((prev) =>
prev.map((entry) =>
entry.id === feedbackNote.targetId
? { ...entry, status: 'Resolved', response: feedbackNote.note.trim() }
: entry
)
);
recordAlert(`Feedback ${feedbackNote.targetId} marked resolved.`);
setFeedbackNote({ targetId: '', note: '' });
};

const renderPanelContent = () => {
switch (activePanel) {
case 'inventory':
return (
<div style={{ display: 'grid', gap: '18px' }}>
<form onSubmit={handleInventorySubmit} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Receive / adjust stock</h4>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
<input
style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
placeholder="Medicine name"
value={inventoryForm.name}
onChange={(e) => setInventoryForm((prev) => ({ ...prev, name: e.target.value }))}
/>
<input
type="number"
style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
placeholder="Units (+/-)"
value={inventoryForm.delta}
onChange={(e) => setInventoryForm((prev) => ({ ...prev, delta: e.target.value }))}
/>
<input
type="number"
step="0.01"
min="0"
style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
placeholder="Price per unit (ETB)"
value={inventoryForm.price}
onChange={(e) => setInventoryForm((prev) => ({ ...prev, price: e.target.value }))}
/>
<input
style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
placeholder="Batch / supplier"
value={inventoryForm.lot}
onChange={(e) => setInventoryForm((prev) => ({ ...prev, lot: e.target.value }))}
/>
</div>
<button type="submit" style={{ ...buttonBaseStyle, background: '#2563eb' }}>Update inventory</button>
</form>
<div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Inventory overview</h4>
<div style={{ display: 'grid', gap: '12px' }}>
{inventory.map((item) => (
<div key={item.id} style={{ border: '1px solid #edf2f7', borderRadius: '12px', padding: '12px', display: 'grid', gap: '6px' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
<div>
<div style={{ fontWeight: 600, color: '#2d3748' }}>{item.name}</div>
<p style={{ margin: 0, color: '#4a5568', fontSize: '13px' }}>
Stock: {item.stock} {item.unit} • Reorder at {item.reorderPoint}
</p>
<p style={{ margin: 0, color: '#718096', fontSize: '12px' }}>
Expiry {item.expiry} • Supplier {item.supplier}
</p>
<div style={{ margin: '4px 0', fontSize: '14px', fontWeight: '600', color: '#059669' }}>
💰 ETB {item.price} per unit
</div>
</div>
<div style={{ display: 'flex', gap: '6px' }}>
<button style={{ ...buttonBaseStyle, background: '#0f9d58' }} onClick={() => adjustStock(item.id, 25)}>
+25
</button>
<button style={{ ...buttonBaseStyle, background: '#9b2c2c' }} onClick={() => adjustStock(item.id, -25)}>
-25
</button>
</div>
</div>
{item.stock <= item.reorderPoint && (
<div style={{ fontSize: '12px', color: '#C05621' }}>⚠ Low stock — escalate to supplier</div>
)}
</div>
))}
</div>
</div>
</div>
);
case 'shortages':
return (
<div style={{ display: 'grid', gap: '18px' }}>
<form onSubmit={handleShortageSubmit} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Flag shortage</h4>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '12px' }}>
<input
style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
placeholder="Medicine"
value={shortageForm.medicine}
onChange={(e) => setShortageForm((prev) => ({ ...prev, medicine: e.target.value }))}
/>
<select
style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
value={shortageForm.severity}
onChange={(e) => setShortageForm((prev) => ({ ...prev, severity: e.target.value }))}
>
<option value="warning">Warning</option>
<option value="critical">Critical</option>
</select>
<input
style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
placeholder="Notes / mitigation"
value={shortageForm.notes}
onChange={(e) => setShortageForm((prev) => ({ ...prev, notes: e.target.value }))}
/>
</div>
<button type="submit" style={{ ...buttonBaseStyle, background: '#dd6b20' }}>Escalate</button>
</form>
<div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Active shortage tickets</h4>
{shortageReports.map((report) => (
<div key={report.id} style={{ border: '1px solid #edf2f7', borderRadius: '12px', padding: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
<div>
<div style={{ fontWeight: 600 }}>{report.medicine}</div>
<p style={{ margin: 0, color: '#4a5568', fontSize: '13px' }}>Severity: {report.severity}</p>
<p style={{ margin: 0, color: '#718096', fontSize: '12px' }}>Submitted {report.submitted} • {report.status}</p>
</div>
{report.status !== 'Resolved' && (
<button style={{ ...buttonBaseStyle, background: '#0f9d58' }} onClick={() => resolveShortage(report.id)}>
Mark resolved
</button>
)}
</div>
))}
{shortageReports.length === 0 && <p style={{ margin: 0, color: '#a0aec0' }}>No shortages reported.</p>}
</div>
</div>
);
case 'orders':
return (
<div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Order fulfillment queue</h4>
{ordersQueue.map((order) => (
<div key={order.id} style={{ border: '1px solid #edf2f7', borderRadius: '12px', padding: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
<div>
<div style={{ fontWeight: 600 }}>{order.medicine}</div>
<p style={{ margin: 0, color: '#4a5568' }}>Patient: {order.patient}</p>
<p style={{ margin: 0, color: '#4a5568' }}>Qty {order.qty}</p>
</div>
<div style={{ textAlign: 'right' }}>
<span
style={{
padding: '6px 12px',
borderRadius: '999px',
background: order.status === 'Completed' ? '#c6f6d5' : '#fefcbf',
color: order.status === 'Completed' ? '#22543d' : '#744210',
fontSize: '12px',
fontWeight: 600,
}}
>
{order.status}
</span>
{order.status !== 'Completed' && (
<button style={{ ...buttonBaseStyle, background: '#1d4ed8', marginTop: '8px' }} onClick={() => advanceOrder(order.id)}>
Progress stage
</button>
)}
</div>
</div>
))}
{ordersQueue.length === 0 && <p style={{ margin: 0, color: '#a0aec0' }}>No orders yet.</p>}
</div>
);
case 'feedback':
return (
<div style={{ display: 'grid', gap: '18px' }}>
<form onSubmit={handleFeedbackNote} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Respond to feedback</h4>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
<select
style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
value={feedbackNote.targetId}
onChange={(e) => setFeedbackNote((prev) => ({ ...prev, targetId: e.target.value }))}
>
<option value="">Select ticket</option>
{feedback.map((entry) => (
<option key={entry.id} value={entry.id}>
{entry.id} — {entry.topic}
</option>
))}
</select>
<input
style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
placeholder="Resolution note"
value={feedbackNote.note}
onChange={(e) => setFeedbackNote((prev) => ({ ...prev, note: e.target.value }))}
/>
</div>
<button type="submit" style={{ ...buttonBaseStyle, background: '#38a169' }}>Submit response</button>
</form>
<div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Customer feedback</h4>
{feedback.map((entry) => (
<div key={entry.id} style={{ border: '1px solid #edf2f7', borderRadius: '10px', padding: '10px' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
<strong style={{ color: '#2d3748' }}>{entry.topic}</strong>
<span style={{ fontSize: '12px', color: entry.status === 'Resolved' ? '#2f855a' : '#c05621', fontWeight: 600 }}>
{entry.status}
</span>
</div>
<p style={{ margin: '4px 0', color: '#4a5568' }}>{entry.detail}</p>
<p style={{ margin: 0, fontSize: '12px', color: '#a0aec0' }}>{entry.author}</p>
{entry.response && (
<p style={{ margin: '6px 0 0', color: '#2f855a', fontSize: '13px' }}>Response: {entry.response}</p>
)}
</div>
))}
{feedback.length === 0 && <p style={{ margin: 0, color: '#a0aec0' }}>No feedback yet.</p>}
</div>
</div>
);
default:
return null;
}
};

return (
<div style={dashboardShellStyle}>
<div style={dashboardContentStyle}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
<div>
<h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#2d3748', marginBottom: '6px' }}>Pharmacy Dashboard</h1>
<p style={{ fontSize: '16px', color: '#718096', margin: 0 }}>
{activePharmacy?.name ? `Managing ${activePharmacy.name}${activePharmacy.city ? ` • ${activePharmacy.city}` : ''}` : 'Control inventory, shortages, and community feedback.'}
</p>
</div>
<button style={{ ...buttonBaseStyle, background: '#1f2937', padding: '10px 18px' }} onClick={handleLogout}>
Logout
</button>
</div>

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
<div style={{ ...cardBaseStyle, padding: '20px' }}>
<p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>Total units on-hand</p>
<div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>{inventoryStats.totalUnits}</div>
</div>
<div style={{ ...cardBaseStyle, padding: '20px' }}>
<p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>Low-stock SKUs</p>
<div style={{ fontSize: '28px', fontWeight: 700, color: '#C05621' }}>{inventoryStats.lowStock}</div>
</div>
<div style={{ ...cardBaseStyle, padding: '20px' }}>
<p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>Orders in queue</p>
<div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>{inventoryStats.openOrders}</div>
</div>
</div>

{alerts.length > 0 && (
<div style={{ marginBottom: '24px', background: '#fffaf0', borderRadius: '12px', padding: '16px', border: '1px solid #feebc8' }}>
{alerts.map((alert, index) => (
<p key={`${alert}-${index}`} style={{ margin: 0, color: '#975a16', fontWeight: 500 }}>
• {alert}
</p>
))}
</div>
)}

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '32px' }}>
<div style={cardBaseStyle}>
<h3 style={cardTitleStyle}>Inventory</h3>
<p style={cardBodyStyle}>Receive stock and tune counts.</p>
<button style={actionButtonStyle(activePanel === 'inventory', '#2563eb')} onClick={() => setActivePanel('inventory')}>
Open inventory tools
</button>
</div>
<div style={cardBaseStyle}>
<h3 style={cardTitleStyle}>Shortages</h3>
<p style={cardBodyStyle}>Flag issues before they impact patients.</p>
<button style={actionButtonStyle(activePanel === 'shortages', '#dd6b20')} onClick={() => setActivePanel('shortages')}>
Manage shortages
</button>
</div>
<div style={cardBaseStyle}>
<h3 style={cardTitleStyle}>Orders</h3>
<p style={cardBodyStyle}>Advance dispensing workflows.</p>
<button style={actionButtonStyle(activePanel === 'orders', '#1d4ed8')} onClick={() => setActivePanel('orders')}>
View queue
</button>
</div>
<div style={cardBaseStyle}>
<h3 style={cardTitleStyle}>Feedback</h3>
<p style={cardBodyStyle}>Close the loop with patients.</p>
<button style={actionButtonStyle(activePanel === 'feedback', '#38a169')} onClick={() => setActivePanel('feedback')}>
Open feedback
</button>
</div>
</div>

<div style={workspaceCardStyle}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
<div>
<h2 style={{ margin: 0, color: '#1a365d' }}>Workspace</h2>
<p style={{ margin: 0, color: '#718096' }}>Hands-on tools for {activePanel}.</p>
</div>
</div>
{renderPanelContent()}
</div>
</div>
</div>
);
};

const PharmacyPending = ({ onEditRequest }) => {
const { user, updateUser } = useAuth();
const pharmacy = user?.pharmacy;

if (!pharmacy) return null;

const handleEdit = () => {
updateUser({ pharmacy: null });
if (onEditRequest) onEditRequest();
};

const handleDemoApprove = () => {
updateUser({
pharmacy: {
...pharmacy,
status: 'approved',
approvedAt: new Date().toISOString(),
},
});
};

const statusCopy = {
pending: 'Your request is under review by TenaMed ops.',
'pending_review': 'We are verifying your documents.',
rejected: 'Unfortunately this submission was rejected. Please edit the details.',
};

return (
<div style={dashboardShellStyle}>
<div style={{ ...dashboardContentStyle, maxWidth: '720px' }}>
<div style={{ marginBottom: '24px' }}>
<h1 style={{ fontSize: '32px', color: '#2d3748', marginBottom: '8px' }}>Pharmacy verification</h1>
<p style={{ color: '#4a5568', margin: 0 }}>We need to verify {pharmacy.name || 'your pharmacy'} before enabling inventory tools.</p>
</div>

<div style={{ ...workspaceCardStyle, padding: '24px', marginBottom: '24px' }}>
<h3 style={{ ...cardTitleStyle, marginBottom: '8px' }}>{pharmacy.name || 'Unnamed pharmacy'}</h3>
<p style={{ ...cardBodyStyle, marginBottom: '16px' }}>
Status: <strong>{pharmacy.status || 'pending'}</strong> — {statusCopy[pharmacy.status] || 'We will notify you once reviewed.'}
</p>
<div style={{ display: 'flex', gap: '12px' }}>
<button style={{ ...buttonBaseStyle, background: '#4a5568' }} onClick={handleEdit}>
Edit submission
</button>
<button style={{ ...buttonBaseStyle, background: '#2563eb' }} onClick={handleDemoApprove}>
Mark approved (demo)
</button>
</div>
</div>

<div style={{ ...workspaceCardStyle, padding: '24px' }}>
<h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>What happens next?</h4>
<ol style={{ paddingLeft: '20px', margin: 0, color: '#4a5568', lineHeight: 1.6 }}>
<li>Our compliance team validates your license and location.</li>
<li>We may call the pharmacy phone on file for confirmation.</li>
<li>Once approved, you will gain full access to the pharmacy dashboard.</li>
</ol>
</div>
</div>
</div>
);
};

const PharmacyOnboarding = () => {
const { updateUser } = useAuth();
const [mode, setMode] = useState('existing');
const [selectedPharmacyId, setSelectedPharmacyId] = useState('');
const [supportingNote, setSupportingNote] = useState('');
const [application, setApplication] = useState({ name: '', license: '', city: '', kebele: '', phone: '' });
const [submissionAlert, setSubmissionAlert] = useState('');

const selectedPharmacy = pharmacyDirectory.find((item) => item.id === selectedPharmacyId);

const resetForm = () => {
setSelectedPharmacyId('');
setSupportingNote('');
setApplication({ name: '', license: '', city: '', kebele: '', phone: '' });
};

const handleExistingSubmit = (event) => {
event.preventDefault();
if (!selectedPharmacy) {
setSubmissionAlert('Please choose a pharmacy from the directory.');
return;
}
updateUser({
pharmacy: {
...selectedPharmacy,
status: 'pending',
mode: 'existing',
requestNote: supportingNote,
submittedAt: new Date().toISOString(),
},
});
setSubmissionAlert('Affiliation request submitted. We will notify you once verified.');
resetForm();
};

const handleNewSubmit = (event) => {
event.preventDefault();
if (!application.name.trim() || !application.license.trim()) {
setSubmissionAlert('Please provide the pharmacy name and license number.');
return;
}
updateUser({
pharmacy: {
id: `NEW-${Date.now()}`,
name: application.name.trim(),
license: application.license.trim(),
city: application.city.trim(),
kebele: application.kebele.trim(),
contactPhone: application.phone.trim(),
status: 'pending_review',
mode: 'new',
submittedAt: new Date().toISOString(),
},
});
setSubmissionAlert('Thank you! Your pharmacy application is now pending review.');
resetForm();
};

return (
<div style={dashboardShellStyle}>
<div style={{ ...dashboardContentStyle, maxWidth: '900px' }}>
<div style={{ marginBottom: '24px' }}>
<h1 style={{ fontSize: '36px', color: '#2d3748', marginBottom: '8px' }}>Set up your pharmacy</h1>
<p style={{ color: '#4a5568', margin: 0 }}>Tell us which licensed pharmacy you represent or submit a new application.</p>
</div>

{submissionAlert && (
<div style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '12px', border: '1px solid #bee3f8', background: '#ebf8ff', color: '#1a365d' }}>
{submissionAlert}
</div>
)}

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
<button
style={actionButtonStyle(mode === 'existing', '#2563eb')}
onClick={() => setMode('existing')}
>
Join existing pharmacy
</button>
<button
style={actionButtonStyle(mode === 'new', '#38a169')}
onClick={() => setMode('new')}
>
Register new pharmacy
</button>
</div>

{mode === 'existing' ? (
<div style={workspaceCardStyle}>
<h3 style={cardTitleStyle}>Search directory</h3>
<form onSubmit={handleExistingSubmit} style={{ display: 'grid', gap: '12px' }}>
<select
value={selectedPharmacyId}
onChange={(e) => setSelectedPharmacyId(e.target.value)}
style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e0' }}
>
<option value="">Select a pharmacy</option>
{pharmacyDirectory.map((pharmacy) => (
<option key={pharmacy.id} value={pharmacy.id}>
{pharmacy.name} — {pharmacy.city}
</option>
))}
</select>
<textarea
rows={3}
placeholder="Add any supporting note (optional)"
value={supportingNote}
onChange={(e) => setSupportingNote(e.target.value)}
style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e0', resize: 'vertical' }}
/>
<button type="submit" style={{ ...buttonBaseStyle, background: '#2563eb' }}>Submit affiliation</button>
</form>
</div>
) : (
<div style={workspaceCardStyle}>
<h3 style={cardTitleStyle}>Create new pharmacy record</h3>
<form onSubmit={handleNewSubmit} style={{ display: 'grid', gap: '12px' }}>
<input
style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e0' }}
placeholder="Pharmacy name"
value={application.name}
onChange={(e) => setApplication((prev) => ({ ...prev, name: e.target.value }))}
/>
<input
style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e0' }}
placeholder="License number"
value={application.license}
onChange={(e) => setApplication((prev) => ({ ...prev, license: e.target.value }))}
/>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
<input
style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e0' }}
placeholder="City"
value={application.city}
onChange={(e) => setApplication((prev) => ({ ...prev, city: e.target.value }))}
/>
<input
style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e0' }}
placeholder="Sub-city / kebele"
value={application.kebele}
onChange={(e) => setApplication((prev) => ({ ...prev, kebele: e.target.value }))}
/>
</div>
<input
style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e0' }}
placeholder="Pharmacy phone (optional)"
value={application.phone}
onChange={(e) => setApplication((prev) => ({ ...prev, phone: e.target.value }))}
/>
<button type="submit" style={{ ...buttonBaseStyle, background: '#38a169' }}>Submit application</button>
</form>
</div>
)}
</div>
</div>
);
};

const DispatcherDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activePanel, setActivePanel] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [analytics, setAnalytics] = useState({
    todayDeliveries: 0,
    weekDeliveries: 0,
    monthDeliveries: 0,
    totalDeliveries: 0,
    activeDrivers: 0,
    pendingOrders: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Fetch pending orders
  const fetchOrders = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/dispatcher/orders`);
      const data = await response.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  // Fetch available drivers
  const fetchDrivers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/dispatcher/drivers`);
      const data = await response.json();
      if (data.success) {
        setDrivers(data.data);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  // Fetch active deliveries
  const fetchDeliveries = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/dispatcher/deliveries`);
      const data = await response.json();
      if (data.success) {
        setDeliveries(data.data);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/dispatcher/analytics`);
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Assign driver to order
  const assignDriver = async (orderId, driverId) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/dispatcher/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, driverId })
      });
      const data = await response.json();
      if (data.success) {
        alert('Driver assigned successfully!');
        fetchOrders();
        fetchDrivers();
        fetchDeliveries();
        setSelectedOrder(null);
        setSelectedDriver(null);
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
      alert('Failed to assign driver');
    } finally {
      setIsLoading(false);
    }
  };

  // Update delivery status
  const updateDeliveryStatus = async (deliveryId, status) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/dispatcher/status/${deliveryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        alert('Delivery status updated successfully!');
        fetchDeliveries();
        fetchDrivers();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setIsLoading(false);
    }
  };

  // Process payment
  const processPayment = async (orderId, paymentMethod, amount) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/dispatcher/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paymentMethod, amount })
      });
      const data = await response.json();
      if (data.success) {
        alert('Payment processed successfully!');
        fetchOrders();
        fetchDeliveries();
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDrivers();
    fetchDeliveries();
    fetchAnalytics();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'orders':
        return (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#1a365d' }}>Pending Orders</h3>
            {orders.length === 0 ? (
              <p style={{ color: '#718096' }}>No pending orders</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {orders.map((order) => (
                  <div key={order._id} style={{ border: '1px solid #edf2f7', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#2d3748' }}>
                          Order #{order._id.slice(-8)}
                        </div>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#4a5568' }}>
                          Pharmacy: {order.pharmacyId?.pharmacyName}
                        </p>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#4a5568' }}>
                          Patient: {order.patientId?.email}
                        </p>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#4a5568' }}>
                          Total: ${order.totalAmount}
                        </p>
                        <p style={{ margin: '4px 0', fontSize: '12px', color: '#718096' }}>
                          Address: {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          style={{ ...buttonBaseStyle, background: '#3182ce' }}
                          onClick={() => setSelectedOrder(order)}
                        >
                          Assign Driver
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'drivers':
        return (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#1a365d' }}>Available Drivers</h3>
            {drivers.length === 0 ? (
              <p style={{ color: '#718096' }}>No available drivers</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {drivers.map((driver) => (
                  <div key={driver._id} style={{ border: '1px solid #edf2f7', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#2d3748' }}>
                          {driver.profile?.firstName} {driver.profile?.lastName}
                        </div>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#4a5568' }}>
                          {driver.email}
                        </p>
                        <p style={{ margin: '4px 0', fontSize: '12px', color: '#718096' }}>
                          Vehicle: {driver.vehicleType}
                        </p>
                        <p style={{ margin: '4px 0', fontSize: '12px', color: '#718096' }}>
                          Rating: {driver.deliveryStats?.rating || 'N/A'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: driver.isAvailable ? '#d1fae5' : '#fee2e2',
                          color: driver.isAvailable ? '#065f46' : '#991b1b'
                        }}>
                          {driver.isAvailable ? 'Available' : 'Busy'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'deliveries':
        return (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#1a365d' }}>Active Deliveries</h3>
            {deliveries.length === 0 ? (
              <p style={{ color: '#718096' }}>No active deliveries</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {deliveries.map((delivery) => (
                  <div key={delivery._id} style={{ border: '1px solid #edf2f7', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#2d3748' }}>
                          Tracking: {delivery.trackingCode}
                        </div>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#4a5568' }}>
                          Driver: {delivery.driverId?.profile?.firstName} {delivery.driverId?.profile?.lastName}
                        </p>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#4a5568' }}>
                          Status: {delivery.status}
                        </p>
                        <p style={{ margin: '4px 0', fontSize: '12px', color: '#718096' }}>
                          Assigned: {new Date(delivery.assignedAt).toLocaleString()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                        <select
                          value={delivery.status}
                          onChange={(e) => updateDeliveryStatus(delivery._id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                        >
                          <option value="assigned">Assigned</option>
                          <option value="picked_up">Picked Up</option>
                          <option value="in_transit">In Transit</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div style={dashboardShellStyle}>
      <div style={dashboardContentStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#2d3748', marginBottom: '6px' }}>
              Dispatcher Dashboard
            </h1>
            <p style={{ fontSize: '16px', color: '#718096', margin: 0 }}>
              Coordinate deliveries and track shipments
            </p>
          </div>
          <button style={{ ...buttonBaseStyle, background: '#1f2937', padding: '10px 18px' }} onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* Analytics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ ...cardBaseStyle, padding: '20px' }}>
            <p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>Today's Deliveries</p>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>{analytics.todayDeliveries}</div>
          </div>
          <div style={{ ...cardBaseStyle, padding: '20px' }}>
            <p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>This Week</p>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>{analytics.weekDeliveries}</div>
          </div>
          <div style={{ ...cardBaseStyle, padding: '20px' }}>
            <p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>This Month</p>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>{analytics.monthDeliveries}</div>
          </div>
          <div style={{ ...cardBaseStyle, padding: '20px' }}>
            <p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>Active Drivers</p>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>{analytics.activeDrivers}</div>
          </div>
          <div style={{ ...cardBaseStyle, padding: '20px' }}>
            <p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>Pending Orders</p>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>{analytics.pendingOrders}</div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <div style={cardBaseStyle}>
            <h3 style={cardTitleStyle}>Pending Orders</h3>
            <p style={cardBodyStyle}>View and assign drivers to pending orders</p>
            <button style={actionButtonStyle(activePanel === 'orders', '#4299e1')} onClick={() => setActivePanel('orders')}>
              View Orders ({orders.length})
            </button>
          </div>
          <div style={cardBaseStyle}>
            <h3 style={cardTitleStyle}>Available Drivers</h3>
            <p style={cardBodyStyle}>Manage driver availability and assignments</p>
            <button style={actionButtonStyle(activePanel === 'drivers', '#48bb78')} onClick={() => setActivePanel('drivers')}>
              View Drivers ({drivers.length})
            </button>
          </div>
          <div style={cardBaseStyle}>
            <h3 style={cardTitleStyle}>Active Deliveries</h3>
            <p style={cardBodyStyle}>Track ongoing deliveries and update status</p>
            <button style={actionButtonStyle(activePanel === 'deliveries', '#dd6b20')} onClick={() => setActivePanel('deliveries')}>
              View Deliveries ({deliveries.length})
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div style={workspaceCardStyle}>
          <div>
            <h2 style={{ margin: 0, color: '#1a365d' }}>Workspace</h2>
            <p style={{ margin: 0, color: '#718096' }}>Hands-on tools for {activePanel}</p>
          </div>
          {renderPanelContent()}
        </div>

        {/* Driver Assignment Modal */}
        {selectedOrder && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%'
            }}>
              <h3 style={{ margin: '0 0 16px', color: '#1a365d' }}>Assign Driver to Order</h3>
              <p style={{ margin: '0 0 16px', color: '#4a5568' }}>
                Order #{selectedOrder._id.slice(-8)} - ${selectedOrder.totalAmount}
              </p>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Select Driver:</label>
                <select
                  value={selectedDriver || ''}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                >
                  <option value="">Choose a driver...</option>
                  {drivers.map((driver) => (
                    <option key={driver._id} value={driver._id}>
                      {driver.profile?.firstName} {driver.profile?.lastName} - {driver.vehicleType}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setSelectedOrder(null); setSelectedDriver(null); }}
                  style={{ ...buttonBaseStyle, background: '#718096' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => assignDriver(selectedOrder._id, selectedDriver)}
                  disabled={!selectedDriver || isLoading}
                  style={{ ...buttonBaseStyle, background: '#3182ce', opacity: selectedDriver ? 1 : 0.5 }}
                >
                  {isLoading ? 'Assigning...' : 'Assign Driver'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Delivery Person Dashboard
const DeliveryDashboard = () => {
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [activePanel, setActivePanel] = useState('assignments');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState({
    todayDeliveries: 0,
    weekDeliveries: 0,
    monthDeliveries: 0,
    averageRating: 0,
    onTimeRate: 0
  });

  // Fetch delivery person data
  useEffect(() => {
    fetchProfile();
    fetchAssignedOrders();
    fetchCompletedOrders();
    fetchAnalytics();
    startLocationTracking();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/delivery/profile`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setProfile(data.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchAssignedOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/delivery/my-assignments`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setAssignedOrders(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching assigned orders:', error);
    }
  };

  const fetchCompletedOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/delivery/completed-orders`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setCompletedOrders(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching completed orders:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/delivery/analytics`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data || {});
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const startLocationTracking = () => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Location tracking error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
      return watchId;
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/delivery/accept-order/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setAssignedOrders(prev => 
          prev.map(order => 
            order._id === orderId 
              ? { ...order, status: 'accepted' }
              : order
          )
        );
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      alert('Failed to accept order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startDelivery = async (orderId) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/delivery/start-delivery/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setAssignedOrders(prev => 
          prev.map(order => 
            order._id === orderId 
              ? { ...order, status: 'in_progress' }
              : order
          )
        );
      }
    } catch (error) {
      console.error('Error starting delivery:', error);
      alert('Failed to start delivery. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const completeDelivery = async (orderId) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/delivery/complete-delivery/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        // Move from assigned to completed
        const completedOrder = assignedOrders.find(order => order._id === orderId);
        if (completedOrder) {
          setAssignedOrders(prev => prev.filter(order => order._id !== orderId));
          setCompletedOrders(prev => [...prev, { ...completedOrder, status: 'completed', completedAt: new Date() }]);
        }
        fetchAnalytics(); // Refresh analytics
      }
    } catch (error) {
      console.error('Error completing delivery:', error);
      alert('Failed to complete delivery. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const buttonBaseStyle = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  };

  const cardBaseStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  };

  const cardTitleStyle = {
    margin: '0 0 8px',
    color: '#1a365d',
    fontSize: '18px',
    fontWeight: '600'
  };

  const cardBodyStyle = {
    margin: '0 0 16px',
    color: '#718096',
    fontSize: '14px'
  };

  const actionButtonStyle = (isActive, color) => ({
    ...buttonBaseStyle,
    backgroundColor: isActive ? color : '#f7fafc',
    color: isActive ? 'white' : '#4a5568',
    border: isActive ? 'none' : '1px solid #e2e8f0'
  });

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'assignments':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#1a365d' }}>Current Assignments</h3>
            {assignedOrders.length === 0 ? (
              <p style={{ margin: 0, color: '#a0aec0' }}>No assigned orders</p>
            ) : (
              assignedOrders.map((order) => (
                <div key={order._id} style={cardBaseStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#2d3748' }}>
                        Order #{order._id.slice(-8)}
                      </div>
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#4a5568' }}>
                        {order.medications ? order.medications.map(med => med.name).join(', ') : 'Medications'}
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#4a5568' }}>
                        📍 {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#4a5568' }}>
                        💰 ETB {order.totalAmount || 0}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: order.status === 'pending' ? '#fef3c7' : 
                                       order.status === 'accepted' ? '#dbeafe' : 
                                       order.status === 'in_progress' ? '#e0e7ff' : '#d1fae5',
                        color: order.status === 'pending' ? '#92400e' : 
                                order.status === 'accepted' ? '#1e40af' : 
                                order.status === 'in_progress' ? '#3730a3' : '#065f46'
                      }}>
                        {order.status === 'pending' ? 'Pending' :
                         order.status === 'accepted' ? 'Accepted' :
                         order.status === 'in_progress' ? 'In Progress' : 'Completed'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {order.status === 'pending' && (
                      <button
                        onClick={() => acceptOrder(order._id)}
                        disabled={isLoading}
                        style={{ ...buttonBaseStyle, background: '#10b981', opacity: isLoading ? 0.5 : 1 }}
                      >
                        {isLoading ? 'Accepting...' : 'Accept Order'}
                      </button>
                    )}
                    {order.status === 'accepted' && (
                      <button
                        onClick={() => startDelivery(order._id)}
                        disabled={isLoading}
                        style={{ ...buttonBaseStyle, background: '#3b82f6', opacity: isLoading ? 0.5 : 1 }}
                      >
                        {isLoading ? 'Starting...' : 'Start Delivery'}
                      </button>
                    )}
                    {order.status === 'in_progress' && (
                      <button
                        onClick={() => completeDelivery(order._id)}
                        disabled={isLoading}
                        style={{ ...buttonBaseStyle, background: '#059669', opacity: isLoading ? 0.5 : 1 }}
                      >
                        {isLoading ? 'Completing...' : 'Complete Delivery'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'completed':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#1a365d' }}>Completed Today</h3>
            {completedOrders.length === 0 ? (
              <p style={{ margin: 0, color: '#a0aec0' }}>No completed deliveries today</p>
            ) : (
              completedOrders.map((order) => (
                <div key={order._id} style={cardBaseStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#2d3748' }}>
                        Order #{order._id.slice(-8)}
                      </div>
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#4a5568' }}>
                        {order.medications ? order.medications.map(med => med.name).join(', ') : 'Medications'}
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#4a5568' }}>
                        📍 {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#059669' }}>
                        ✅ Completed at {order.completedAt ? new Date(order.completedAt).toLocaleTimeString() : 'N/A'}
                      </p>
                    </div>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: '#d1fae5',
                      color: '#065f46'
                    }}>
                      Delivered
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'profile':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#1a365d' }}>My Profile</h3>
            {profile ? (
              <div style={cardBaseStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 8px', color: '#374151' }}>Personal Information</h4>
                    <p><strong>Name:</strong> {profile.profile?.firstName} {profile.profile?.lastName}</p>
                    <p><strong>Email:</strong> {profile.email}</p>
                    <p><strong>Phone:</strong> {profile.profile?.phone}</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 8px', color: '#374151' }}>Vehicle Information</h4>
                    <p><strong>Type:</strong> {profile.profile?.vehicleInfo?.type}</p>
                    <p><strong>Plate:</strong> {profile.profile?.vehicleInfo?.plateNumber}</p>
                    <p><strong>Model:</strong> {profile.profile?.vehicleInfo?.make} {profile.profile?.vehicleInfo?.model}</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 8px', color: '#374151' }}>Performance</h4>
                    <p><strong>Total Deliveries:</strong> {profile.profile?.performance?.totalDeliveries || 0}</p>
                    <p><strong>Average Rating:</strong> ⭐ {profile.profile?.performance?.averageRating || 0}</p>
                    <p><strong>On-Time Rate:</strong> {profile.profile?.performance?.onTimeDeliveryRate || 0}%</p>
                  </div>
                </div>
                {currentLocation && (
                  <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#0c4a6e' }}>
                      📍 Current Location: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#a0aec0' }}>Loading profile...</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#2d3748', marginBottom: '6px' }}>
              Delivery Dashboard
            </h1>
            <p style={{ fontSize: '16px', color: '#718096', margin: 0 }}>
              Manage your deliveries and track your performance
            </p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
            style={{ ...buttonBaseStyle, background: '#1f2937', padding: '10px 18px' }}
          >
            Logout
          </button>
        </div>

        {/* Analytics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={cardBaseStyle}>
            <p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>Today's Deliveries</p>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>{analytics.todayDeliveries}</div>
          </div>
          <div style={cardBaseStyle}>
            <p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>This Week</p>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>{analytics.weekDeliveries}</div>
          </div>
          <div style={cardBaseStyle}>
            <p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>This Month</p>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>{analytics.monthDeliveries}</div>
          </div>
          <div style={cardBaseStyle}>
            <p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>Average Rating</p>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a365d' }}>⭐ {analytics.averageRating}</div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <div style={cardBaseStyle}>
            <h3 style={cardTitleStyle}>Current Assignments</h3>
            <p style={cardBodyStyle}>View and manage your assigned orders</p>
            <button style={actionButtonStyle(activePanel === 'assignments', '#4299e1')} onClick={() => setActivePanel('assignments')}>
              View Assignments ({assignedOrders.length})
            </button>
          </div>
          <div style={cardBaseStyle}>
            <h3 style={cardTitleStyle}>Completed Today</h3>
            <p style={cardBodyStyle}>See your completed deliveries for today</p>
            <button style={actionButtonStyle(activePanel === 'completed', '#10b981')} onClick={() => setActivePanel('completed')}>
              View Completed ({completedOrders.length})
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div style={cardBaseStyle}>
          <div>
            <h2 style={{ margin: 0, color: '#1a365d' }}>Workspace</h2>
            <p style={{ margin: 0, color: '#718096' }}>Hands-on tools for {activePanel}</p>
          </div>
          {renderPanelContent()}
        </div>
      </div>
    </div>
  );
};

// Role-based dashboard router
const DashboardRouter = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

const isPharmacyApproved = (pharmacyProfile) => {
if (!pharmacyProfile) return false;
return pharmacyProfile.status === 'approved' || pharmacyProfile.status === 'active';
};

// Handle admin role (via isAdmin flag or role)
if (user.isAdmin || user.role === 'admin') {
return <AdminDashboard />;
}

// For pharmacy users, check if they're approved
if (user.role === 'pharmacy') {
// If pharmacy is not approved, show pending approval screen
if (!user.isApproved || user.status === 'pending') {
return (
<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
<div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 text-center">
<div className="mb-6">
<div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
<svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
</svg>
</div>
<h2 className="text-2xl font-bold text-gray-800 mb-2">Pending Approval</h2>
<p className="text-gray-600">
Thank you for registering your pharmacy. Your account is currently under review by our admin team.
You'll receive an email notification once your pharmacy is approved and you can start using the platform.
</p>
</div>
<div className="mt-6">
<button 
onClick={async () => {
try {
const response = await fetch('/api/auth/me', {
headers: {
'Authorization': `Bearer ${localStorage.getItem('token')}`
}
});

if (!response.ok) throw new Error('Failed to check status');

const userData = await response.json();

if (userData.user?.isApproved) {
window.location.reload();
} else {
alert('Your pharmacy is still under review. Please check back later.');
}
} catch (error) {
console.error('Error checking status:', error);
alert('Failed to check status. Please try again.');
}
}}
className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
>
Check Status
</button>
</div>
<div className="mt-6 pt-6 border-t border-gray-100">
<p className="text-sm text-gray-500">
Need help? <a href="mailto:support@tenamed.com" className="text-blue-600 hover:underline">Contact support</a>
</p>
</div>
</div>
</div>
);
}
// If approved, show the pharmacy dashboard
return <PharmacyDashboard activePharmacy={user.pharmacy} />;
}

switch (user.role) {
case 'patient':
return <PatientDashboard />;
case 'dispatcher':
return <DispatcherDashboard />;
case 'delivery_person':
return <DeliveryDashboard />;
case 'government':
return (
<div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
<div className="max-w-7xl mx-auto">
<div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Government Dashboard</h1>
<p className="text-gray-600 dark:text-gray-300">
Welcome to the government oversight portal. Here you can monitor and manage regulatory compliance.
</p>
<div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
<h3 className="font-medium text-blue-800 dark:text-blue-200">Pharmacy Compliance</h3>
<p className="text-3xl font-bold text-blue-600 dark:text-blue-300 mt-2">92%</p>
<p className="text-sm text-blue-600 dark:text-blue-300">Compliance Rate</p>
</div>
<div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
<h3 className="font-medium text-green-800 dark:text-green-200">Active Pharmacies</h3>
<p className="text-3xl font-bold text-green-600 dark:text-green-300 mt-2">156</p>
<p className="text-sm text-green-600 dark:text-green-300">Active</p>
</div>
<div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg">
<h3 className="font-medium text-amber-800 dark:text-amber-200">Pending Inspections</h3>
<p className="text-3xl font-bold text-amber-600 dark:text-amber-300 mt-2">8</p>
<p className="text-sm text-amber-600 dark:text-amber-300">Due this week</p>
</div>
</div>
</div>
</div>
</div>
);
default:
return <div className="p-6">Invalid role: {user.role}</div>;
}
};

// App content component
const AppContent = () => {
// Get auth state
const { user, isLoading } = useAuth();

// Show loading state while checking auth
if (isLoading) {
return (
<div style={{
display: 'flex',
justifyContent: 'center',
alignItems: 'center',
height: '100vh',
fontSize: '1.2rem',
color: '#4a5568'
}}>
Loading...
</div>
);
}

// If we have a user, render the app with protected routes
return (
<Router future={{
v7_startTransition: true,
v7_relativeSplatPath: true
}}>
<Routes>
<Route path="/" element={<Landing />} />
<Route
path="/login"
element={!user ? <Login /> : <Navigate to="/dashboard" replace />}
/>
<Route
path="/register"
element={!user ? <Register /> : <Navigate to="/dashboard" replace />}
/>
<Route
path="/dashboard/*"
element={user ? <DashboardRouter /> : <Navigate to="/login" replace />}
/>
<Route path="*" element={<Navigate to="/" replace />} />
</Routes>
</Router>
);
};

// Main App component that provides the auth context
const App = () => {
return (
<AuthProvider>
<SupplyChainProvider>
<Toaster 
position="top-center"
toastOptions={{
duration: 5000,
style: {
background: '#363636',
color: '#fff',
},
success: {
duration: 3000,
theme: {
primary: 'green',
secondary: 'black',
},
},
error: {
duration: 5000,
style: {
background: '#ff4d4f',
},
},
}}
/>
<AppContent />
</SupplyChainProvider>
</AuthProvider>
);
};

export default App;1  