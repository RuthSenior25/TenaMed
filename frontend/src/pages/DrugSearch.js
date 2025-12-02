import React, { useState, useEffect } from 'react';
import { BeakerIcon, MagnifyingGlassIcon, BuildingOfficeIcon, StarIcon } from '@heroicons/react/24/outline';
import { drugsAPI } from '../api/drugs';

const DrugSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [availability, setAvailability] = useState([]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchDrugs();
    } else {
      setDrugs([]);
    }
  }, [searchTerm]);

  const searchDrugs = async () => {
    setLoading(true);
    try {
      const response = await drugsAPI.searchDrugs({ 
        search: searchTerm, 
        limit: 10 
      });
      setDrugs(response.data.drugs);
    } catch (error) {
      console.error('Failed to search drugs:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async (drugId) => {
    try {
      const response = await drugsAPI.getAvailability(drugId);
      setAvailability(response.data.availability);
    } catch (error) {
      console.error('Failed to check availability:', error);
    }
  };

  const handleDrugSelect = (drug) => {
    setSelectedDrug(drug);
    setAvailability([]);
    checkAvailability(drug._id);
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { text: 'Out of Stock', color: 'danger' };
    if (quantity < 10) return { text: 'Low Stock', color: 'warning' };
    return { text: 'In Stock', color: 'success' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Drug Search</h1>
        <p className="mt-2 text-secondary-600">
          Search for medications and check availability at nearby pharmacies
        </p>
      </div>

      {/* Search Bar */}
      <div className="card">
        <div className="card-body">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-secondary-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
              placeholder="Search for drugs by name, category, or active ingredient..."
            />
          </div>
        </div>
      </div>

      {/* Search Results */}
      {drugs.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-secondary-900">Search Results</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {drugs.map((drug) => (
                <div
                  key={drug._id}
                  className="border border-secondary-200 rounded-lg p-4 hover:bg-secondary-50 cursor-pointer transition-colors duration-200"
                  onClick={() => handleDrugSelect(drug)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <BeakerIcon className="h-5 w-5 text-primary-600" />
                        <h4 className="text-lg font-medium text-secondary-900">{drug.name}</h4>
                        <span className="badge badge-primary">{drug.category}</span>
                      </div>
                      <p className="text-sm text-secondary-600 mt-1">
                        {drug.description || 'No description available'}
                      </p>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-secondary-500">
                        <span>Strength: {drug.strength}</span>
                        <span>Form: {drug.form}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-secondary-600">Searching drugs...</p>
        </div>
      )}

      {/* Selected Drug Details */}
      {selectedDrug && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-secondary-900">
              {selectedDrug.name} - Availability
            </h3>
          </div>
          <div className="card-body">
            <div className="mb-4">
              <p className="text-sm text-secondary-600">
                Showing availability near your location
              </p>
            </div>

            {availability.length > 0 ? (
              <div className="space-y-4">
                {availability.map((item) => {
                  const stockStatus = getStockStatus(item.quantity);
                  return (
                    <div
                      key={item.pharmacy._id}
                      className="border border-secondary-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <BuildingOfficeIcon className="h-5 w-5 text-secondary-400" />
                            <h4 className="font-medium text-secondary-900">
                              {item.pharmacy.name}
                            </h4>
                            <div className="flex items-center">
                              <StarIcon className="h-4 w-4 text-warning-400" />
                              <span className="text-sm text-secondary-600 ml-1">
                                {item.pharmacy.rating?.toFixed(1) || 'N/A'}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-secondary-600 mt-1">
                            {item.pharmacy.address.street}, {item.pharmacy.address.city}
                          </p>
                          <div className="mt-2 flex items-center space-x-4">
                            <span className="text-sm text-secondary-500">
                              Distance: {item.distance || '2.5'} km
                            </span>
                            <span className="text-sm text-secondary-500">
                              Phone: {item.pharmacy.phone}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`badge badge-${stockStatus.color}`}>
                            {stockStatus.text}
                          </div>
                          <div className="mt-2">
                            <p className="text-lg font-semibold text-secondary-900">
                              ${item.price}
                            </p>
                            <p className="text-xs text-secondary-500">
                              {item.quantity} units available
                            </p>
                          </div>
                          <button
                            className="btn btn-primary mt-2"
                            disabled={item.quantity === 0}
                          >
                            {item.quantity === 0 ? 'Out of Stock' : 'Order Now'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <BuildingOfficeIcon className="h-12 w-12 text-secondary-400 mx-auto" />
                <p className="mt-2 text-secondary-600">
                  No availability information found for this drug
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && drugs.length === 0 && searchTerm.length >= 2 && (
        <div className="card">
          <div className="card-body text-center py-8">
            <BeakerIcon className="h-12 w-12 text-secondary-400 mx-auto" />
            <p className="mt-2 text-secondary-600">
              No drugs found matching "{searchTerm}"
            </p>
            <p className="text-sm text-secondary-500 mt-1">
              Try searching with different keywords or check the spelling
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrugSearch;
