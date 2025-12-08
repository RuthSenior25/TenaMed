import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const GovernmentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">92%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overall Compliance Rate</p>
            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: '92%' }}></div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h3 className="font-medium text-lg text-gray-900 dark:text-white mb-2">Active Pharmacies</h3>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">156</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Registered & Active</p>
            <div className="mt-4">
              <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                +12 this month
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h3 className="font-medium text-lg text-gray-900 dark:text-white mb-2">Pending Inspections</h3>
            <p className="text-4xl font-bold text-amber-600 dark:text-amber-400">8</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Due this week</p>
            <button className="mt-4 px-3 py-1 text-sm bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors">
              View Schedule
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Inspections</h2>
              <div className="space-y-4">
                {[
                  { id: 1, name: 'Bole City Pharmacy', date: '2025-03-15', status: 'Compliant', score: 94 },
                  { id: 2, name: 'CMC Community', date: '2025-03-14', status: 'Minor Issues', score: 82 },
                  { id: 3, name: 'Gerji Health Hub', date: '2025-03-12', status: 'Compliant', score: 97 },
                  { id: 4, name: 'Lafto Prime', date: '2025-03-10', status: 'Follow-up Required', score: 65 },
                ].map((inspection) => (
                  <div key={inspection.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{inspection.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{inspection.date}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        inspection.status === 'Compliant' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                          : inspection.status === 'Minor Issues'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}>
                        {inspection.status}
                      </span>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">Score: {inspection.score}/100</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full py-2 text-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                View All Inspections
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Regulatory Alerts</h2>
                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full">
                  3 New
                </span>
              </div>
              <div className="space-y-4">
                {[
                  {
                    id: 1,
                    type: 'Policy Update',
                    title: 'New Storage Requirements',
                    message: 'Updated guidelines for temperature-sensitive medications storage',
                    date: '2 hours ago',
                    priority: 'high',
                  },
                  {
                    id: 2,
                    type: 'Inspection',
                    title: 'Upcoming Audit',
                    message: 'Quarterly compliance audit scheduled for next month',
                    date: '1 day ago',
                    priority: 'medium',
                  },
                  {
                    id: 3,
                    type: 'Regulation',
                    title: 'Documentation Changes',
                    message: 'New documentation requirements for controlled substances',
                    date: '3 days ago',
                    priority: 'high',
                  },
                ].map((alert) => (
                  <div key={alert.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                        alert.priority === 'high' 
                          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {alert.type.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{alert.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{alert.message}</p>
                        <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <span>{alert.date}</span>
                          {alert.priority === 'high' && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              High Priority
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full py-2 text-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                View All Alerts
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GovernmentDashboard;