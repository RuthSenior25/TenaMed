import api from './auth';

export const pharmaciesAPI = {
  getAllPharmacies: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, params[key]);
      }
    });
    return api.get(`/pharmacies?${searchParams}`);
  },
  
  getPharmacyById: (pharmacyId) => api.get(`/pharmacies/${pharmacyId}`),
  
  registerPharmacy: (data) => api.post('/pharmacies', data),
  
  updatePharmacy: (pharmacyId, data) => api.put(`/pharmacies/${pharmacyId}`, data),
  
  deletePharmacy: (pharmacyId) => api.delete(`/pharmacies/${pharmacyId}`),
  
  getPharmacyInventory: (pharmacyId, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, params[key]);
      }
    });
    return api.get(`/pharmacies/${pharmacyId}/inventory?${searchParams}`);
  },
  
  getPharmacyReviews: (pharmacyId, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, params[key]);
      }
    });
    return api.get(`/pharmacies/${pharmacyId}/reviews?${searchParams}`);
  },
  
  getPharmacyStats: (pharmacyId) => api.get(`/pharmacies/${pharmacyId}/stats`),
  
  approvePharmacy: (pharmacyId) => api.patch(`/pharmacies/${pharmacyId}/approve`),
  
  rejectPharmacy: (pharmacyId, reason) => api.patch(`/pharmacies/${pharmacyId}/reject`, { reason }),
  
  searchNearby: (params) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, params[key]);
      }
    });
    console.log('Searching nearby pharmacies with params:', searchParams.toString());
    return api.get(`/pharmacies/nearby?${searchParams}`);
  },
};
