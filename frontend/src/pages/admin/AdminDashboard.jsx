import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../api/axiosConfig';

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pharmacyRequests, setPharmacyRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch pending pharmacy requests with retry logic
  const fetchPharmacyRequests = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    
    try {
      console.log(`[${new Date().toISOString()}] Fetching pending pharmacy requests...`);
      setIsLoading(true);
      
      const response = await api.get('/auth/pending-pharmacies', {
        timeout: 15000, // 15 second timeout
      });
      
      console.log('Received pharmacy requests:', response.data);
      
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format from server');
      }
      
      setPharmacyRequests(response.data);
      
      if (retryCount > 0) {
        toast.success('Pharmacy requests loaded successfully');
      }
      
    } catch (error) {
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
          return fetchPharmacyRequests(retryCount + 1);
        }
      }
      
      // Handle specific error cases
      if (error.response) {
        const { status, data } = error.response;
        console.error('Response error:', data);
        
        if (status === 401) {
          toast.error('Your session has expired. Please log in again.');
          // Auth context will handle the redirect
          return;
        }
        
        const errorMessage = data?.message || 'Failed to load pharmacy requests';
        toast.error(`Error: ${errorMessage}`);
      } else if (error.code === 'ECONNABORTED') {
        toast.error('Request timed out. Please check your connection.');
      } else {
        toast.error('Failed to load pharmacy requests. Please try again later.');
      }
      
      setPharmacyRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Load pharmacy requests on component mount
  useEffect(() => {
    fetchPharmacyRequests();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
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
              <h2 className="text-xl font-semibold text-gray-900">
                Pharmacy Registration Requests
                {pharmacyRequests.length > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                    {pharmacyRequests.length} Pending
                  </span>
                )}
              </h2>
              <button
                onClick={fetchPharmacyRequests}
                disabled={isLoading || isProcessing}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refresh
              </button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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