import api from './auth';

export const drugsAPI = {
  searchDrugs: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, params[key]);
      }
    });
    return api.get(`/drugs/search?${searchParams}`);
  },
  
  getAllDrugs: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, params[key]);
      }
    });
    return api.get(`/drugs?${searchParams}`);
  },
  
  getDrugById: (drugId) => api.get(`/drugs/${drugId}`),
  
  createDrug: (data) => api.post('/drugs', data),
  
  updateDrug: (drugId, data) => api.put(`/drugs/${drugId}`, data),
  
  deleteDrug: (drugId) => api.delete(`/drugs/${drugId}`),
  
  getAvailability: (drugId, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, params[key]);
      }
    });
    return api.get(`/drugs/${drugId}/availability?${searchParams}`);
  },
  
  getCategories: () => api.get('/drugs/categories'),
  
  getDrugsByCategory: (category, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, params[key]);
      }
    });
    return api.get(`/drugs/category/${category}?${searchParams}`);
  },
};
