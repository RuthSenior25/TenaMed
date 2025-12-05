import React, { useState, useEffect } from 'react';
import { FiMapPin, FiNavigation, FiExternalLink } from 'react-icons/fi';

const PharmacyLocationPicker = ({ onLocationSelect, initialPosition = null }) => {
  const [latitude, setLatitude] = useState(initialPosition?.lat || 9.0054);
  const [longitude, setLongitude] = useState(initialPosition?.lng || 38.7636);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Update parent when coordinates change
  useEffect(() => {
    onLocationSelect({ lat: latitude, lng: longitude });
  }, [latitude, longitude, onLocationSelect]);

  // Get user's current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: parseFloat(position.coords.latitude.toFixed(6)),
          lng: parseFloat(position.coords.longitude.toFixed(6))
        };
        setLatitude(pos.lat);
        setLongitude(pos.lng);
        setIsLoading(false);
      },
      (err) => {
        setError('Unable to retrieve your location. Please enter coordinates manually.');
        console.error('Geolocation error:', err);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleLatitudeChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setLatitude(value);
    }
  };

  const handleLongitudeChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setLongitude(value);
    }
  };

  const handlePaste = async (e, type) => {
    try {
      const text = await navigator.clipboard.readText();
      const [lat, lng] = text.split(',').map(coord => parseFloat(coord.trim()));
      
      if (!isNaN(lat) && !isNaN(lng)) {
        setLatitude(lat);
        setLongitude(lng);
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center mb-2">
          <FiMapPin className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Pharmacy Location</h3>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Enter your pharmacy's coordinates or use your current location
        </p>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label 
                htmlFor="latitude" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Latitude
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="number"
                  id="latitude"
                  step="0.000001"
                  min="-90"
                  max="90"
                  value={latitude}
                  onChange={handleLatitudeChange}
                  onPaste={(e) => handlePaste(e, 'lat')}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  placeholder="e.g., 9.0054"
                  aria-describedby="latitude-description"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400" id="latitude-description">
                Between -90 and 90
              </p>
            </div>
            
            <div>
              <label 
                htmlFor="longitude" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Longitude
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="number"
                  id="longitude"
                  step="0.000001"
                  min="-180"
                  max="180"
                  value={longitude}
                  onChange={handleLongitudeChange}
                  onPaste={(e) => handlePaste(e, 'lng')}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  placeholder="e.g., 38.7636"
                  aria-describedby="longitude-description"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400" id="longitude-description">
                Between -180 and 180
              </p>
            </div>
          </div>
          
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLoading}
              className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isLoading 
                  ? 'bg-blue-400' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              } focus:outline-none`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Getting Location...
                </>
              ) : (
                <>
                  <FiNavigation className="w-4 h-4 mr-2" />
                  Use My Current Location
                </>
              )}
            </button>
          </div>
          
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md dark:bg-red-900 dark:text-red-200">
              {error}
            </div>
          )}
          
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p className="flex items-center">
              <span>Example coordinates for Addis Ababa: 9.0054° N, 38.7636° E</span>
            </p>
            <p className="flex items-center">
              <span>Find coordinates on </span>
              <a 
                href="https://www.latlong.net/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline ml-1 flex items-center"
              >
                latlong.net <FiExternalLink className="ml-1 w-3 h-3" />
              </a>
            </p>
            <p className="text-gray-400 mt-2">
              You can also paste coordinates (e.g., "9.0054, 38.7636") into either field
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyLocationPicker;