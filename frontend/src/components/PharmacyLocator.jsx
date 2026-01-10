import React, { useState, useEffect } from 'react';
import { pharmaciesAPI } from '../api/pharmacies';
import { MapPinIcon, ArrowPathIcon, MapIcon, PhoneIcon, ClockIcon, FunnelIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { calculateDistance, formatDistance } from '../utils/geoUtils';

const PharmacyLocator = ({ onOrderFromPharmacy }) => {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [radius, setRadius] = useState(10); // Default 10km radius
  const [filter, setFilter] = useState('all');
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          fetchNearbyPharmacies(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('Unable to retrieve your location. Please enable location services.');
          setLoading(false);
          // Fallback to fetching all pharmacies if location is not available
          fetchAllPharmacies();
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser');
      setLoading(false);
      // Fallback to fetching all pharmacies
      fetchAllPharmacies();
    }
  }, []);

  const fetchNearbyPharmacies = async (lat, lng) => {
    try {
      setLoading(true);
      const response = await pharmaciesAPI.searchNearby({
        lat,
        lng,
        radius,
        limit: 20
      });
      
      // Add distance to each pharmacy
      const pharmaciesWithDistance = response.data.pharmacies.map(pharmacy => ({
        ...pharmacy,
        distance: calculateDistance(
          lat,
          lng,
          pharmacy.location?.coordinates[1],
          pharmacy.location?.coordinates[0]
        )
      }));
      
      // Sort by distance
      pharmaciesWithDistance.sort((a, b) => a.distance - b.distance);
      
      setPharmacies(pharmaciesWithDistance);
    } catch (error) {
      console.error('Error fetching nearby pharmacies:', error);
      toast.error('Failed to load nearby pharmacies');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPharmacies = async () => {
    try {
      setLoading(true);
      const response = await pharmaciesAPI.getAllPharmacies({ limit: 20 });
      setPharmacies(response.data.pharmacies);
    } catch (error) {
      console.error('Error fetching all pharmacies:', error);
      toast.error('Failed to load pharmacies');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          fetchNearbyPharmacies(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Error refreshing location:', error);
          toast.error('Unable to refresh location');
        }
      );
    }
  };

  const handleOrderFromPharmacy = (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setShowOrderModal(true);
    if (onOrderFromPharmacy) {
      onOrderFromPharmacy(pharmacy);
    }
  };

  const filteredPharmacies = pharmacies.filter(pharmacy => {
    if (filter === 'all') return true;
    if (filter === 'open') return pharmacy.operatingStatus === 'open';
    if (filter === 'nearby') return pharmacy.distance && pharmacy.distance <= 5;
    return true;
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '16px', color: '#718096' }}>Finding nearby pharmacies...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Header with location info */}
      <div style={{ 
        padding: '16px', 
        backgroundColor: '#f8fafc', 
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, color: '#1a365d', fontSize: '18px' }}>
            📍 Nearby Pharmacies
          </h3>
          <button
            onClick={handleRefreshLocation}
            style={{
              padding: '8px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowPathIcon style={{ width: '16px', height: '16px' }} />
            Refresh
          </button>
        </div>
        
        {userLocation && (
          <div style={{ fontSize: '14px', color: '#059669' }}>
            📍 Using your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
          </div>
        )}
        
        {locationError && (
          <div style={{ fontSize: '14px', color: '#dc2626', marginTop: '8px' }}>
            ⚠️ {locationError}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ 
        padding: '16px', 
        backgroundColor: 'white', 
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FunnelIcon style={{ width: '16px', height: '16px', color: '#6b7280' }} />
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Filters:</span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: filter === 'all' ? '#3b82f6' : 'white',
              color: filter === 'all' ? 'white' : '#374151',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            All Pharmacies
          </button>
          <button
            onClick={() => setFilter('open')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: filter === 'open' ? '#10b981' : 'white',
              color: filter === 'open' ? 'white' : '#374151',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Open Now
          </button>
          <button
            onClick={() => setFilter('nearby')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: filter === 'nearby' ? '#f59e0b' : 'white',
              color: filter === 'nearby' ? 'white' : '#374151',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Within 5km
          </button>
        </div>
      </div>

      {/* Pharmacy List */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {filteredPharmacies.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '16px', color: '#718096' }}>
              No pharmacies found matching your criteria
            </div>
          </div>
        ) : (
          filteredPharmacies.map((pharmacy) => (
            <div
              key={pharmacy._id}
              style={{
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px', color: '#1a365d', fontSize: '18px' }}>
                    {pharmacy.pharmacyName || `${pharmacy.profile?.firstName} ${pharmacy.profile?.lastName}'s Pharmacy`}
                  </h4>
                  <p style={{ margin: '0 0 8px', color: '#718096', fontSize: '14px' }}>
                    {pharmacy.profile?.firstName} {pharmacy.profile?.lastName}
                  </p>
                  
                  {/* Location */}
                  {pharmacy.address && (
                    <div style={{ fontSize: '14px', color: '#4a5568', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <MapPinIcon style={{ width: '16px', height: '16px' }} />
                        <span>{pharmacy.address.street}, {pharmacy.address.city}</span>
                      </div>
                      {pharmacy.distance && (
                        <div style={{ 
                          padding: '4px 8px',
                          backgroundColor: '#e0f2fe',
                          borderRadius: '4px',
                          color: '#1e40af',
                          fontSize: '12px',
                          fontWeight: '500',
                          display: 'inline-block',
                          marginTop: '4px'
                        }}>
                          🚶 {formatDistance(pharmacy.distance)} away
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Contact */}
                  <div style={{ fontSize: '14px', color: '#4a5568', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <PhoneIcon style={{ width: '16px', height: '16px' }} />
                      <span>{pharmacy.phone || 'Not available'}</span>
                    </div>
                  </div>
                  
                  {/* Operating Hours */}
                  {pharmacy.operatingHours && (
                    <div style={{ fontSize: '14px', color: '#4a5568' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ClockIcon style={{ width: '16px', height: '16px' }} />
                        <span>{pharmacy.operatingHours}</span>
                      </div>
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
              
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleOrderFromPharmacy(pharmacy)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <ShoppingCartIcon style={{ width: '16px', height: '16px' }} />
                  Order Medicine
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PharmacyLocator;
