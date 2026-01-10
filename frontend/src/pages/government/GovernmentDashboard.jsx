import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const GovernmentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    complianceRate: 0,
    activePharmacies: 0,
    monthlyGrowth: 0,
    totalInspections: 0,
    pendingInspections: 0,
    violationsReported: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGovernmentStats();
  }, []);

  const fetchGovernmentStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/government/stats`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching government stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-500">Loading government dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Government Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back, {user?.firstName || 'Government Official'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h3 className="font-medium text-lg text-gray-900 dark:text-white mb-2">Pharmacy Compliance</h3>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{stats.complianceRate}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overall Compliance Rate</p>
            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${stats.complianceRate}%` }}></div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h3 className="font-medium text-lg text-gray-900 dark:text-white mb-2">Active Pharmacies</h3>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">{stats.activePharmacies}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Registered & Active</p>
            <div className="mt-4">
              <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                +{stats.monthlyGrowth} this month
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h3 className="font-medium text-lg text-gray-900 dark:text-white mb-2">Pending Inspections</h3>
            <p className="text-4xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingInspections}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Due this week</p>
            <button className="mt-4 px-3 py-1 text-sm bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors">
              View Schedule
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Inspection Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalInspections}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Inspections</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.violationsReported}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Violations Reported</p>
                </div>
              </div>
              <button className="mt-4 w-full py-2 text-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                View Detailed Reports
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Regulatory Actions</h2>
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                  Active
                </span>
              </div>
              <div className="space-y-4">
                <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      R
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Regulatory Monitoring</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">System monitoring pharmacy compliance in real-time</p>
                      <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <span>Live monitoring active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button className="mt-4 w-full py-2 text-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                Manage Regulatory Actions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GovernmentDashboard;