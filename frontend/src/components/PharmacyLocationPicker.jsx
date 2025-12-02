import React, { useState, useEffect } from 'react';

const PharmacyLocationPicker = ({ onLocationSelect, initialPosition = null }) => {
  const [latitude, setLatitude] = useState(initialPosition?.lat || 9.0054);
  const [longitude, setLongitude] = useState(initialPosition?.lng || 38.7636);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  // Get user's current location if requested
  useEffect(() => {
    if (useCurrentLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLatitude(pos.lat);
          setLongitude(pos.lng);
          onLocationSelect(pos);
        },
        () => {
          alert('Unable to retrieve your location. Please enter coordinates manually.');
          setUseCurrentLocation(false);
        }
      );
    }
  }, [useCurrentLocation]);

  const handleLatitudeChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setLatitude(value);
      onLocationSelect({ lat: value, lng: longitude });
    }
  };

  const handleLongitudeChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setLongitude(value);
      onLocationSelect({ lat: latitude, lng: value });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Pharmacy Location</h3>
        <p className="text-sm text-gray-600 mb-4">
          Enter your pharmacy's coordinates or use your current location
        </p>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
              Latitude
            </label>
            <input
              type="number"
              id="latitude"
              step="0.000001"
              value={latitude}
              onChange={handleLatitudeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 9.0054"
            />
          </div>
          
          <div>
            <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
              Longitude
            </label>
            <input
              type="number"
              id="longitude"
              step="0.000001"
              value={longitude}
              onChange={handleLongitudeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 38.7636"
            />
          </div>
          
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setUseCurrentLocation(true)}
              disabled={useCurrentLocation}
              className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${useCurrentLocation ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {useCurrentLocation ? 'Using Current Location' : 'Use My Current Location'}
            </button>
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            <p>Example coordinates for Addis Ababa: 9.0054° N, 38.7636° E</p>
            <p>You can find coordinates using <a href="https://www.latlong.net/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">latlong.net</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyLocationPicker;
