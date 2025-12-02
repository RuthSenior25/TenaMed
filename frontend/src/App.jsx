import React, { useState, useMemo, useContext } from 'react';
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
  const [prescriptions, setPrescriptions] = useState([
    { id: 'RX-1023', drug: 'Amoxicillin 500mg', dosage: '2x / day', frequency: 'Morning & Night', refills: 1 },
    { id: 'RX-0991', drug: 'Metformin 850mg', dosage: '1x / day', frequency: 'Evening', refills: 3 },
  ]);
  const [orders, setOrders] = useState([
    { id: 'ORD-2011', medication: 'Insulin Pen', quantity: 3, notes: 'Rapid acting', status: 'Processing' },
    { id: 'ORD-2010', medication: 'Vitamin D3', quantity: 1, notes: 'Chewable tablets', status: 'Delivered' },
  ]);
  const [deliveries, setDeliveries] = useState([
    { id: 'DLV-3001', courier: 'Yared', eta: 'Today • 6:00 PM', status: 'Out for delivery' },
    { id: 'DLV-2999', courier: 'Hanna', eta: 'Yesterday • Delivered', status: 'Delivered' },
  ]);
  const [alerts, setAlerts] = useState([]);
  const [prescriptionForm, setPrescriptionForm] = useState({ drug: '', dosage: '', frequency: '' });
  const [orderForm, setOrderForm] = useState({ medication: '', quantity: '1', instructions: '' });
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

  const handlePrescriptionSubmit = (event) => {
    event.preventDefault();
    if (!prescriptionForm.drug.trim() || !prescriptionForm.dosage.trim()) return;
    const newRx = {
      id: `RX-${Math.floor(Math.random() * 9000 + 1000)}`,
      ...prescriptionForm,
      refills: 0,
    };
    setPrescriptions((prev) => [newRx, ...prev]);
    setPrescriptionForm({ drug: '', dosage: '', frequency: '' });
    setActivePanel('prescriptions');
    recordAlert(`${newRx.drug} saved to prescriptions.`);
  };

  const handleOrderSubmit = (event) => {
    event.preventDefault();
    if (!orderForm.medication.trim()) return;
    const newOrder = {
      id: `ORD-${Math.floor(Math.random() * 9000 + 2000)}`,
      medication: orderForm.medication.trim(),
      quantity: Number(orderForm.quantity) || 1,
      notes: orderForm.instructions.trim(),
      status: 'Draft',
    };
    setOrders((prev) => [newOrder, ...prev]);
    setOrderForm({ medication: '', quantity: '1', instructions: '' });
    setActivePanel('orders');
    recordAlert(`Draft order ${newOrder.id} created.`);
  };

  const handleConfirmDelivery = (deliveryId) => {
    setDeliveries((prev) =>
      prev.map((delivery) =>
        delivery.id === deliveryId
          ? { ...delivery, status: 'Delivered', eta: 'Delivered just now' }
          : delivery
      )
    );
    recordAlert(`Delivery ${deliveryId} marked as received.`);
  };

  const handleRequestRefill = (rxId) => {
    setPrescriptions((prev) =>
      prev.map((rx) => (rx.id === rxId ? { ...rx, refills: rx.refills + 1 } : rx))
    );
    recordAlert(`Refill request sent for ${rxId}.`);
  };

  const handleSelectMedicine = (med) => {
    setOrderForm((prev) => ({ ...prev, medication: med.name }));
    recordAlert(`${med.name} added to the order form.`);
    setActivePanel('orders');
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
        return <PharmacyLocator />;
      case 'prescriptions':
        return (
          <div>
            <form onSubmit={handlePrescriptionSubmit} style={{ marginBottom: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <input
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                  placeholder="Medication name"
                  value={prescriptionForm.drug}
                  onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, drug: e.target.value }))}
                />
                <input
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                  placeholder="Dosage (e.g. 1 tablet)"
                  value={prescriptionForm.dosage}
                  onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, dosage: e.target.value }))}
                />
                <input
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                  placeholder="Frequency"
                  value={prescriptionForm.frequency}
                  onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, frequency: e.target.value }))}
                />
              </div>
              <button type="submit" style={{ ...buttonBaseStyle, background: '#3182ce' }}>Save Prescription</button>
            </form>
            {prescriptions.map((rx) => (
              <div key={rx.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                <div style={{ fontWeight: 600, fontSize: '16px' }}>{rx.drug}</div>
                <p style={{ margin: '4px 0', color: '#4a5568' }}>Dosage: {rx.dosage}</p>
                <p style={{ margin: '4px 0', color: '#4a5568' }}>Frequency: {rx.frequency || '—'}</p>
                <p style={{ margin: '4px 0', color: '#4a5568' }}>Refills requested: {rx.refills}</p>
                <button style={{ ...buttonBaseStyle, background: '#4299e1' }} onClick={() => handleRequestRefill(rx.id)}>
                  Request Refill
                </button>
              </div>
            ))}
          </div>
        );
      case 'orders':
        return (
          <div style={{ display: 'grid', gap: '18px' }}>
            <form onSubmit={handleCatalogSearch} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px' }}>
                  <input
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                    placeholder="Search catalog (e.g. Ibuprofen)"
                    value={catalogQuery}
                    onChange={(e) => setCatalogQuery(e.target.value)}
                  />
                  <button type="submit" style={{ ...buttonBaseStyle, background: '#2563eb' }}>Search</button>
                  <button type="button" style={{ ...buttonBaseStyle, background: '#4a5568' }} onClick={handleResetCatalog}>
                    Reset
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                    placeholder="Min price"
                    value={filterInputs.minPrice}
                    onChange={(e) => handleFilterInputChange('minPrice', e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                    placeholder="Max price"
                    value={filterInputs.maxPrice}
                    onChange={(e) => handleFilterInputChange('maxPrice', e.target.value)}
                  />
                  <select
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                    value={filterInputs.availability}
                    onChange={(e) => handleFilterInputChange('availability', e.target.value)}
                  >
                    <option value="any">Any availability</option>
                    <option value="in_stock">In stock</option>
                    <option value="low_stock">Low stock</option>
                    <option value="pre_order">Pre-order</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                    placeholder="Min rating"
                    value={filterInputs.minRating}
                    onChange={(e) => handleFilterInputChange('minRating', e.target.value)}
                  />
                </div>
              </div>
            </form>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <strong style={{ color: '#1f2937' }}>Available Medicines</strong>
                  <p style={{ margin: 0, fontSize: '12px', color: '#718096' }}>
                    Showing filters: {catalogFilter || 'all names'}, price {appliedFilters.minPrice || 0} –
                    {appliedFilters.maxPrice || '∞'}, availability {appliedFilters.availability}, rating ≥
                    {appliedFilters.minRating || '0'}
                  </p>
                </div>
                <span style={{ fontSize: '12px', color: '#718096' }}>{filteredMedicines.length} result(s)</span>
              </div>
              <div style={{ display: 'grid', gap: '14px' }}>
                {filteredMedicines.map((med) => (
                  <div key={med.id} style={{ border: '1px solid #edf2f7', borderRadius: '12px', padding: '12px', display: 'grid', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#2d3748' }}>{med.name}</div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#4a5568' }}>{med.description}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#718096' }}>
                          {med.stock} • Avg price {med.averagePrice} birr • Rating {med.averageRating.toFixed(1)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={{ ...buttonBaseStyle, background: '#0f9d58' }} onClick={() => handleSelectMedicine(med)}>
                          Order
                        </button>
                        <button style={{ ...buttonBaseStyle, background: '#9333ea' }} onClick={() => handleCompareMedicine(med)}>
                          Compare
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#4a5568', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                      Usage: {med.instructions.timing} • Interval: {med.instructions.interval} • Precautions: {med.instructions.precautions}
                    </div>
                  </div>
                ))}
                {filteredMedicines.length === 0 && (
                  <p style={{ margin: 0, fontSize: '13px', color: '#a0aec0' }}>No matches—try another search.</p>
                )}
              </div>
            </div>
            {selectedMedicine && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <strong style={{ color: '#1f2937' }}>Price comparison</strong>
                    <p style={{ margin: 0, fontSize: '12px', color: '#718096' }}>Pharmacies carrying {selectedMedicine.name}</p>
                  </div>
                  <button style={{ ...buttonBaseStyle, background: '#9b2c2c' }} onClick={() => setSelectedMedicine(null)}>
                    Close
                  </button>
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {selectedMedicine.pharmacies.map((pharmacy) => (
                    <div key={pharmacy.name} style={{ border: '1px solid #edf2f7', borderRadius: '10px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#2d3748' }}>{pharmacy.name}</div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#4a5568' }}>{pharmacy.location}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#718096' }}>Rating {pharmacy.rating.toFixed(1)} / 5</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a365d' }}>{pharmacy.price} birr</div>
                        <button
                          style={{ ...buttonBaseStyle, background: '#0f9d58', marginTop: '6px' }}
                          onClick={() => {
                            setOrderForm((prev) => ({ ...prev, medication: `${selectedMedicine.name} @ ${pharmacy.name}` }));
                            recordAlert(`${selectedMedicine.name} from ${pharmacy.name} added to order form.`);
                            setActivePanel('orders');
                          }}
                        >
                          Order here
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <form onSubmit={handleOrderSubmit} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Order form</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <input
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                  placeholder="Medication name"
                  value={orderForm.medication}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, medication: e.target.value }))}
                />
                <input
                  type="number"
                  min="1"
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                  placeholder="Quantity"
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, quantity: e.target.value }))}
                />
                <input
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                  placeholder="Instructions / notes"
                  value={orderForm.instructions}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, instructions: e.target.value }))}
                />
              </div>
              <button type="submit" style={{ ...buttonBaseStyle, background: '#38a169' }}>Submit Order</button>
            </form>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Recent orders</h4>
              {orders.map((order) => (
                <div key={order.id} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #edf2f7', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{order.medication}</div>
                    <p style={{ margin: 0, color: '#4a5568' }}>Qty {order.quantity}</p>
                    <p style={{ margin: 0, color: '#4a5568' }}>{order.notes || 'No special instructions'}</p>
                  </div>
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      background: order.status === 'Delivered' ? '#c6f6d5' : '#fefcbf',
                      color: order.status === 'Delivered' ? '#22543d' : '#744210',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {order.status}
                  </span>
                </div>
              ))}
              {orders.length === 0 && <p style={{ margin: 0, color: '#a0aec0' }}>No orders yet.</p>}
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>Rate & review a pharmacy</h4>
              <form onSubmit={handleReviewSubmit} style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
                <select
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                  value={reviewForm.pharmacy}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, pharmacy: e.target.value }))}
                >
                  <option value="">Select pharmacy</option>
                  {pharmacyOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: e.target.value }))}
                >
                  {[5, 4, 3, 2, 1].map((star) => (
                    <option key={star} value={star}>
                      {star} star{star > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={3}
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', resize: 'vertical' }}
                  placeholder="Share your experience"
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                />
                <button type="submit" style={{ ...buttonBaseStyle, background: '#2563eb' }}>Submit review</button>
              </form>
              <div style={{ display: 'grid', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                {reviews.map((review) => (
                  <div key={review.id} style={{ border: '1px solid #edf2f7', borderRadius: '10px', padding: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#2d3748' }}>{review.pharmacy}</strong>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>{'★'.repeat(review.rating)}</span>
                    </div>
                    <p style={{ margin: '4px 0', color: '#4a5568' }}>{review.comment}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#a0aec0' }}>{review.date}</p>
                  </div>
                ))}
              </div>
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
            <p style={cardBodyStyle}>Fill out an order form and watch the queue update.</p>
            <button style={actionButtonStyle(activePanel === 'orders', '#48bb78')} onClick={() => setActivePanel('orders')}>
              Order / Track
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
    { id: 'INV-101', name: 'Amoxicillin 500mg', stock: 320, unit: 'caps', reorderPoint: 150, expiry: 'Apr 2025', supplier: 'PharmaLab PLC' },
    { id: 'INV-088', name: 'Metformin 850mg', stock: 140, unit: 'tabs', reorderPoint: 120, expiry: 'Jan 2026', supplier: 'LifePharm' },
    { id: 'INV-230', name: 'Insulin Pen (Rapid)', stock: 40, unit: 'cartridges', reorderPoint: 60, expiry: 'Dec 2024', supplier: 'Novo Ethiopia' },
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

  const [inventoryForm, setInventoryForm] = useState({ name: '', delta: '', lot: '' });
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
    setInventory((prev) => {
      const existing = prev.find((item) => item.name === inventoryForm.name.trim());
      if (existing) {
        return prev.map((item) =>
          item.name === inventoryForm.name.trim()
            ? { ...item, stock: Math.max(0, item.stock + units) }
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
        },
        ...prev,
      ];
    });
    recordAlert(`Received ${inventoryForm.delta} units for ${inventoryForm.name}.`);
    setInventoryForm({ name: '', delta: '', lot: '' });
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
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [driverCount, setDriverCount] = useState(0);

  const handleDeliveryClick = () => {
    setDeliveryCount(deliveryCount + 1);
  };

  const handleDriverClick = () => {
    setDriverCount(driverCount + 1);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f7fafc',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#2d3748',
              marginBottom: '6px'
            }}>Dispatcher Dashboard</h1>
            <p style={{
              fontSize: '16px',
              color: '#718096',
              margin: 0
            }}>Coordinate deliveries and track shipments</p>
          </div>
          <button style={{ ...buttonBaseStyle, background: '#1f2937', padding: '10px 18px' }} onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#2d3748',
              marginBottom: '16px'
            }}>Active Deliveries</h3>
            <p style={{
              color: '#718096',
              marginBottom: '16px'
            }}>You have {deliveryCount} active deliveries</p>
            <button
              style={{
                background: '#4299e1',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={handleDeliveryClick}
            >View Deliveries</button>
          </div>
          
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#2d3748',
              marginBottom: '16px'
            }}>Assign Drivers</h3>
            <p style={{
              color: '#718096',
              marginBottom: '16px'
            }}>You have {driverCount} available drivers</p>
            <button
              style={{
                background: '#48bb78',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={handleDriverClick}
            >Assign Tasks</button>
          </div>
          
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#2d3748',
              marginBottom: '16px'
            }}>Delivery Map</h3>
            <p style={{
              color: '#718096',
              marginBottom: '16px'
              
            }}>View real-time delivery locations</p>
            <button
              style={{
                background: '#ed8936',
                color: 'white',
                padding: '8px 16px',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
            >View Map</button>
          </div>
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

  switch (user.role) {
    case 'patient':
      return <PatientDashboard />;
    case 'pharmacy': {
      // If pharmacy is approved/active, show dashboard
      if (isPharmacyApproved(user.pharmacy)) {
        return <PharmacyDashboard activePharmacy={user.pharmacy} />;
      }
      
      // Show pending approval screen for new pharmacy registrations
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
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
    case 'dispatcher':
      return <DispatcherDashboard />;
    case 'supplier':
      return <SupplierDashboard />;
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

export default App;