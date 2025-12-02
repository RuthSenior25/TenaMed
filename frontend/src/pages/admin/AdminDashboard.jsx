import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pharmacyRequests, setPharmacyRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for pharmacy requests
  useEffect(() => {
    const fetchPharmacyRequests = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data
        const mockRequests = [
          {
            id: 'ph1',
            name: 'Bole City Pharmacy',
            owner: 'John Doe',
            email: 'john@bolepharmacy.com',
            phone: '+251911223344',
            status: 'pending',
            registrationDate: '2025-11-20',
          },
          {
            id: 'ph2',
            name: 'Gerji Health Hub',
            owner: 'Jane Smith',
            email: 'jane@gerjipharmacy.com',
            phone: '+251911556677',
            status: 'pending',
            registrationDate: '2025-11-19',
          },
        ];
        
        setPharmacyRequests(mockRequests);
      } catch (error) {
        console.error('Error fetching pharmacy requests:', error);
        toast.error('Failed to load pharmacy requests');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPharmacyRequests();
  }, []);

  const handleApprove = (pharmacyId) => {
    // In a real app, this would be an API call
    setPharmacyRequests(prev => 
      prev.map(pharmacy => 
        pharmacy.id === pharmacyId 
          ? { ...pharmacy, status: 'approved' } 
          : pharmacy
      )
    );
    toast.success('Pharmacy approved successfully');
  };

  const handleReject = (pharmacyId) => {
    // In a real app, this would be an API call
    setPharmacyRequests(prev => 
      prev.map(pharmacy => 
        pharmacy.id === pharmacyId 
          ? { ...pharmacy, status: 'rejected' } 
          : pharmacy
      )
    );
    toast.success('Pharmacy rejected');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Welcome back, {user?.firstName}!
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 md:mt-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Users</div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">1,248</div>
            <div className="mt-2 text-sm text-green-600 dark:text-green-400">+12% from last month</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">Active Pharmacies</div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">156</div>
            <div className="mt-2 text-sm text-green-600 dark:text-green-400">+5 new this week</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">Pending Approvals</div>
            <div className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">
              {pharmacyRequests.filter(ph => ph.status === 'pending').length}
            </div>
            <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">Needs your attention</div>
          </div>
        </div>

        {/* Pharmacy Approval Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Pharmacy Registration Requests</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Review and approve new pharmacy registration requests
            </p>
          </div>
          
          {isLoading ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              Loading pharmacy requests...
            </div>
          ) : pharmacyRequests.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No pending pharmacy requests
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pharmacy Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {pharmacyRequests.map((pharmacy) => (
                    <tr key={pharmacy.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {pharmacy.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Registered on {pharmacy.registrationDate}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{pharmacy.owner}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{pharmacy.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {pharmacy.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            pharmacy.status === 'approved' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : pharmacy.status === 'rejected'
                                ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                          }`}
                        >
                          {pharmacy.status.charAt(0).toUpperCase() + pharmacy.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {pharmacy.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(pharmacy.id)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-4"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(pharmacy.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {pharmacy.status === 'approved' && (
                          <span className="text-green-600 dark:text-green-400">Approved</span>
                        )}
                        {pharmacy.status === 'rejected' && (
                          <span className="text-red-600 dark:text-red-400">Rejected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* System Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">System Version</h3>
              <p className="text-gray-900 dark:text-white">TenaMed v2.1.0</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Last Updated</h3>
              <p className="text-gray-900 dark:text-white">November 20, 2025</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Server Status</h3>
              <div className="flex items-center">
                <span className="h-2.5 w-2.5 bg-green-500 rounded-full mr-2"></span>
                <span className="text-gray-900 dark:text-white">All systems operational</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Database</h3>
              <p className="text-gray-900 dark:text-white">MongoDB v5.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
