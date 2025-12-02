import React, { useState, useEffect } from 'react';
import { BuildingOfficeIcon, StarIcon, PhoneIcon, MapPinIcon, ClockIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { pharmaciesAPI } from '../api/pharmacies';

const PharmacyList = () => {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    fetchPharmacies();
  }, [searchTerm, selectedCategory, sortBy]);

  const fetchPharmacies = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        sort: sortBy,
        limit: 20
      };
      const response = await pharmaciesAPI.getAllPharmacies(params);
      setPharmacies(response.data.pharmacies);
    } catch (error) {
      console.error('Failed to fetch pharmacies:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOperatingStatus = (operatingHours) => {
    if (!operatingHours) return { status: 'unknown', text: 'Hours not available' };
    
    const now = new Date();
    const currentDay = now.toLocaleLowerCase().split(',')[0];
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
      return { status: 'open', text: `Open until ${todayHours.close}` };
    } else if (currentTime < openTime) {
      return { status: 'closed', text: `Opens at ${todayHours.open}` };
    } else {
      return { status: 'closed', text: 'Closed for today' };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'success';
      case 'closed': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Pharmacies</h1>
        <p className="mt-2 text-secondary-600">
          Find and connect with pharmacies in your area
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-secondary-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
                placeholder="Search pharmacies..."
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input"
            >
              <option value="all">All Categories</option>
              <option value="24-hour">24 Hour</option>
              <option value="hospital">Hospital Pharmacy</option>
              <option value="community">Community Pharmacy</option>
              <option value="compounding">Compounding</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input"
            >
              <option value="rating">Sort by Rating</option>
              <option value="distance">Sort by Distance</option>
              <option value="name">Sort by Name</option>
              <option value="reviews">Sort by Reviews</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-secondary-600">Loading pharmacies...</p>
        </div>
      )}

      {/* Pharmacy List */}
      {!loading && pharmacies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pharmacies.map((pharmacy) => {
            const operatingStatus = getOperatingStatus(pharmacy.operatingHours);
            return (
              <div key={pharmacy._id} className="card">
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <BuildingOfficeIcon className="h-5 w-5 text-primary-600" />
                        <h3 className="text-lg font-medium text-secondary-900">
                          {pharmacy.name}
                        </h3>
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-2">
                        <StarIcon className="h-4 w-4 text-warning-400" />
                        <span className="text-sm text-secondary-600">
                          {pharmacy.rating?.toFixed(1) || 'N/A'}
                        </span>
                        <span className="text-sm text-secondary-500">
                          ({pharmacy.totalReviews || 0} reviews)
                        </span>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="flex items-center text-sm text-secondary-600">
                          <MapPinIcon className="h-4 w-4 mr-2 text-secondary-400" />
                          {pharmacy.address.street}, {pharmacy.address.city}
                        </div>
                        
                        <div className="flex items-center text-sm text-secondary-600">
                          <PhoneIcon className="h-4 w-4 mr-2 text-secondary-400" />
                          {pharmacy.phone}
                        </div>
                        
                        <div className="flex items-center text-sm text-secondary-600">
                          <ClockIcon className="h-4 w-4 mr-2 text-secondary-400" />
                          <span className={`badge badge-${getStatusColor(operatingStatus.status)}`}>
                            {operatingStatus.text}
                          </span>
                        </div>
                      </div>

                      {pharmacy.categories && pharmacy.categories.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {pharmacy.categories.slice(0, 3).map((category, index) => (
                            <span key={index} className="badge badge-secondary text-xs">
                              {category}
                            </span>
                          ))}
                          {pharmacy.categories.length > 3 && (
                            <span className="badge badge-secondary text-xs">
                              +{pharmacy.categories.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <button className="btn btn-primary flex-1">
                      View Details
                    </button>
                    <button className="btn btn-secondary">
                      Call
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && pharmacies.length === 0 && (
        <div className="card">
          <div className="card-body text-center py-8">
            <BuildingOfficeIcon className="h-12 w-12 text-secondary-400 mx-auto" />
            <p className="mt-2 text-secondary-600">
              No pharmacies found matching your criteria
            </p>
            <p className="text-sm text-secondary-500 mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyList;
