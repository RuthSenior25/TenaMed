import React, { useState, useEffect } from 'react';
import { pharmaciesAPI } from '../api/pharmacies';
import { MapPinIcon, ArrowPathIcon, MapIcon, PhoneIcon, ClockIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { calculateDistance, formatDistance } from '../utils/geoUtils';

const PharmacyLocator = () => {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [radius, setRadius] = useState(10); // Default 10km radius
  const [filter, setFilter] = useState('all');

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

  const getOperatingStatus = (operatingHours) => {
    if (!operatingHours) return { status: 'unknown', text: 'Hours not available' };
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const todayHours = operatingHours[currentDay];
    if (!todayHours || !todayHours.isOpen) {
      return { status: 'closed', text: 'Closed today' };
    }
    
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    if (currentTime >= openTime && currentTime <= closeTime) {
      return { status: 'open', text: 'Open now' };
    } else if (currentTime < openTime) {
      return { status: 'closed', text: `Opens at ${todayHours.open}` };
    } else {
      return { status: 'closed', text: 'Closed for today' };
    }
  };

  const filteredPharmacies = filter === 'open' 
    ? pharmacies.filter(pharmacy => {
        const status = getOperatingStatus(pharmacy.operatingHours);
        return status.status === 'open';
      })
    : pharmacies;

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Find a Pharmacy Near You
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {userLocation 
              ? `Showing pharmacies within ${radius}km of your location` 
              : 'Showing all pharmacies. Enable location services to see nearby options.'}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className="w-full md:w-1/4 space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  <FunnelIcon className="h-5 w-5 inline-block mr-2" />
                  Filters
                </h2>
                <button 
                  onClick={handleRefreshLocation}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  disabled={loading}
                >
                  <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Pharmacies</option>
                    <option value="open">Open Now</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Radius: {radius} km
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                    onMouseUp={() => userLocation && fetchNearbyPharmacies(userLocation.lat, userLocation.lng)}
                    onTouchEnd={() => userLocation && fetchNearbyPharmacies(userLocation.lat, userLocation.lng)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>1 km</span>
                    <span>50 km</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pharmacies List */}
          <div className="w-full md:w-3/4">
            {locationError && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {locationError}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredPharmacies.length === 0 ? (
              <div className="text-center py-12">
                <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No pharmacies found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {filter === 'open' 
                    ? 'No open pharmacies found in your area. Try adjusting your filters.'
                    : 'No pharmacies found in your area. Try increasing the search radius.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPharmacies.map((pharmacy) => {
                  const status = getOperatingStatus(pharmacy.operatingHours);
                  return (
                    <div 
                      key={pharmacy._id} 
                      className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg hover:shadow-lg transition-shadow duration-200"
                    >
                      <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
                        <div>
                          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                            {pharmacy.pharmacyName}
                          </h3>
                          <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <MapPinIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
                            <p>{pharmacy.address?.street}, {pharmacy.address?.city}</p>
                            {pharmacy.distance !== undefined && (
                              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {pharmacy.distance.toFixed(1)} km away
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            status.status === 'open' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {status.text}
                          </span>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700">
                        <dl className="sm:divide-y sm:divide-gray-200 dark:divide-gray-700">
                          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200 sm:mt-0 sm:col-span-2 flex items-center">
                              <PhoneIcon className="flex-shrink-0 h-4 w-4 mr-2 text-gray-400" />
                              {pharmacy.phone || 'Not provided'}
                            </dd>
                          </div>
                          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Hours</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200 sm:mt-0 sm:col-span-2">
                              {pharmacy.operatingHours ? (
                                <div className="space-y-1">
                                  {Object.entries(pharmacy.operatingHours).map(([day, hours]) => (
                                    <div key={day} className="flex justify-between">
                                      <span className="capitalize">{day}:</span>
                                      <span>
                                        {hours.isOpen 
                                          ? `${hours.open} - ${hours.close}`
                                          : 'Closed'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : 'Not available'}
                            </dd>
                          </div>
                        </dl>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-4 sm:px-6 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <MapIcon className="-ml-1 mr-2 h-5 w-5" />
                          Get Directions
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyLocator;
