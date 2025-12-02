import api from './auth';

export const notificationsAPI = {
  getNotifications: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, params[key]);
      }
    });
    return api.get(`/notifications?${searchParams}`);
  },
  
  getUnreadCount: () => api.get('/notifications/unread/count'),
  
  markAsRead: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
  
  markAllAsRead: () => api.patch('/notifications/read-all'),
  
  deleteNotification: (notificationId) => api.delete(`/notifications/${notificationId}`),
  
  createNotification: (data) => api.post('/notifications', data),
  
  bulkSend: (data) => api.post('/notifications/bulk', data),
  
  getStatistics: () => api.get('/notifications/statistics'),
};
