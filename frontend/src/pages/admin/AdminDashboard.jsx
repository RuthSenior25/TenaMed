import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../api/axiosConfig';
import auth from '../../utils/auth';

// Rejection Modal Component
const RejectionModal = ({ isOpen, onClose, onConfirm, pharmacy, isLoading }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Reject Pharmacy Registration
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Please provide a reason for rejecting {pharmacy?.pharmacyName || 'this pharmacy'}.
          This will be sent to the pharmacy owner.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border border-gray-300 rounded-md p-2 mb-4 h-32"
          placeholder="Enter reason for rejection..."
        />
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Pharmacy Request Item Component
const PharmacyRequestItem = ({ pharmacy, onApprove, onReject }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const handleApprove = async () => {
    try {
      setIsLoading(true);
      await onApprove(pharmacy._id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (reason) => {
    try {
      setIsLoading(true);
      await onReject(pharmacy._id, reason);
      setShowRejectModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {pharmacy.pharmacyName || 'N/A'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {pharmacy.profile?.firstName} {pharmacy.profile?.lastName}
        </div>
        <div className="text-sm text-gray-500">{pharmacy.email}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {pharmacy.profile?.phone || 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(pharmacy.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Approve'}
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={isLoading}
          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reject
        </button>
      </td>
      {showRejectModal && (
        <RejectionModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleReject}
          pharmacy={pharmacy}
          isLoading={isLoading}
        />
      )}
    </tr>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [pharmacyRequests, setPharmacyRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const refreshInterval = useRef(null);
  const isActiveRef = useRef(true);
  const abortControllerRef = useRef(null);
  const user = auth.getCurrentUser();

  // Fetch pending pharmacy requests with retry logic
  const fetchPharmacyRequests = useCallback(async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    
    try {
      if (!isActiveRef.current) return;
      console.log(`[${new Date().toISOString()}] Fetching pending pharmacy requests...`);
      setError(null);
      setIsLoading(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      const response = await api.get('/auth/pending-pharmacies', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: abortControllerRef.current.signal,
        suppressToast: true
      });
      
      console.log('Received pharmacy requests:', response.data);
      
      if (!response.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid response format from server');
      }
      
      if (!isActiveRef.current) return;
      setPharmacyRequests(response.data.data);
      setLastUpdated(new Date());
      
      if (retryCount > 0) {
        toast.success('Pharmacy requests loaded successfully');
      }
      
    } catch (error) {
      if (!isActiveRef.current) return;

      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        return;
      }

      console.error('Error fetching pharmacy requests:', error);
      
      // If we have retries left and it's a network error, retry
      if (retryCount < MAX_RETRIES) {
        const isNetworkError = !error.response || 
                             error.code === 'ECONNABORTED' || 
                             error.code === 'ERR_NETWORK';
        
        if (isNetworkError) {
          const delay = RETRY_DELAY * (retryCount + 1);
          console.log(`Retrying in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          if (!isActiveRef.current) return;
          return fetchPharmacyRequests(retryCount + 1);
        }
      }
      
      // Handle specific error cases
      if (error.response) {
        const { status, data } = error.response;
        console.error('Response error:', data);
        
        if (status === 401) {
          setError('Your session has expired. Please log in again.');
          toast.error('Your session has expired. Please log in again.');
          auth.clearAuthData();
          navigate('/login');
          return;
        }
        
        if (status === 403) {
          setError('You do not have permission to view this page.');
          toast.error('Insufficient permissions to access this page.');
          return;
        }
        
        const errorMessage = data?.message || 'Failed to load pharmacy requests';
        setError(errorMessage);
        toast.error(`Error: ${errorMessage}`);
      } else if (error.code === 'ECONNABORTED') {
        const errorMsg = 'Request timed out. Please check your connection.';
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        const errorMsg = 'Failed to load pharmacy requests. Please try again later.';
        setError(errorMsg);
        toast.error(errorMsg);
      }
      
      setPharmacyRequests([]);
    } finally {
      if (!isActiveRef.current) return;
      setIsLoading(false);
    }
  }, [navigate]);

  // Handle pharmacy approval
  const handleApprovePharmacy = async (pharmacyId) => {
    try {
      setIsProcessing(true);
      await api.patch(`/auth/pharmacy/${pharmacyId}/status`, { status: 'approved' });
      toast.success('Pharmacy approved successfully');
      await fetchPharmacyRequests(); // Refresh the list
    } catch (error) {
      console.error('Error approving pharmacy:', error);
      toast.error(error.response?.data?.message || 'Failed to approve pharmacy');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle pharmacy rejection
  const handleRejectPharmacy = async (pharmacyId, reason) => {
    try {
      setIsProcessing(true);
      await api.patch(`/auth/pharmacy/${pharmacyId}/status`, { 
        status: 'rejected',
        rejectionReason: reason
      });
      toast.success('Pharmacy rejected successfully');
      await fetchPharmacyRequests(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting pharmacy:', error);
      toast.error(error.response?.data?.message || 'Failed to reject pharmacy');
    } finally {
      setIsProcessing(false);
    }
  };

  // Set up auto-refresh
  useEffect(() => {
    // Initial fetch
    fetchPharmacyRequests();
    
    // Set up auto-refresh every 30 seconds
    refreshInterval.current = setInterval(() => {
      fetchPharmacyRequests();
    }, 30000);
    
    // Clean up interval on unmount
    return () => {
      isActiveRef.current = false;
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPharmacyRequests]);

  const handleLogout = () => {
    isActiveRef.current = false;
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
      refreshInterval.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    auth.clearAuthData();
    navigate('/login');
  };
  
  const handleRefresh = () => {
    fetchPharmacyRequests();
  };
  
  const formatTimeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return interval === 1 ? `${interval} ${unit} ago` : `${interval} ${unit}s ago`;
      }
    }
    
    return 'just now';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, {user?.profile?.firstName || 'Admin'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={isProcessing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Logout'}
          </button>
        </div>

        {/* Pharmacy Approval Section */}
        <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Pharmacy Registration Requests
                  {pharmacyRequests.length > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      {pharmacyRequests.length} Pending
                    </span>
                  )}
                </h2>
                {lastUpdated && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last updated: {formatTimeAgo(lastUpdated)}
                  </p>
                )}
              </div>
              <button
                onClick={fetchPharmacyRequests}
                disabled={isLoading || isProcessing}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refresh
              </button>
            </div>
            
            {error ? (
              <div className="text-center py-12 px-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mt-3 text-sm font-medium text-gray-900">Error loading pharmacy requests</h3>
                <p className="mt-1 text-sm text-gray-500">{error}</p>
                <div className="mt-6">
                  <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Try Again
                  </button>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-sm text-gray-500">Loading pharmacy requests...</p>
              </div>
            ) : pharmacyRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pharmacy Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Owner
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registration Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pharmacyRequests.map((pharmacy) => (
                      <PharmacyRequestItem
                        key={pharmacy._id}
                        pharmacy={pharmacy}
                        onApprove={handleApprovePharmacy}
                        onReject={handleRejectPharmacy}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pending pharmacy registrations</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All pharmacy registration requests have been processed.
                </p>
                <div className="mt-6">
                  <button
                    onClick={fetchPharmacyRequests}
                    disabled={isLoading || isProcessing}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="-ml-1 mr-2 h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;