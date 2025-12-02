import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BuildingOfficeIcon,
  BeakerIcon,
  StarIcon,
  TruckIcon,
  BellIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuth();

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleSpecificStats = () => {
    switch (user?.role) {
      case 'patient':
        return [
          { name: 'Active Orders', value: '3', icon: TruckIcon, color: 'primary' },
          { name: 'Saved Pharmacies', value: '12', icon: BuildingOfficeIcon, color: 'secondary' },
          { name: 'Reviews Written', value: '8', icon: StarIcon, color: 'warning' },
          { name: 'Notifications', value: '2', icon: BellIcon, color: 'success' },
        ];
      case 'pharmacy':
        return [
          { name: 'Total Drugs', value: '156', icon: BeakerIcon, color: 'primary' },
          { name: 'Low Stock Items', value: '4', icon: BellIcon, color: 'danger' },
          { name: 'Pending Orders', value: '8', icon: TruckIcon, color: 'warning' },
          { name: 'Average Rating', value: '4.5', icon: StarIcon, color: 'success' },
        ];
      case 'delivery':
        return [
          { name: 'Active Deliveries', value: '5', icon: TruckIcon, color: 'primary' },
          { name: 'Completed Today', value: '12', icon: ChartBarIcon, color: 'success' },
          { name: 'Pending Assignments', value: '3', icon: BellIcon, color: 'warning' },
          { name: 'Average Time', value: '25m', icon: ChartBarIcon, color: 'secondary' },
        ];
      case 'admin':
        return [
          { name: 'Total Users', value: '1,234', icon: BuildingOfficeIcon, color: 'primary' },
          { name: 'Active Pharmacies', value: '89', icon: BuildingOfficeIcon, color: 'secondary' },
          { name: 'System Alerts', value: '7', icon: BellIcon, color: 'danger' },
          { name: 'Total Orders', value: '456', icon: TruckIcon, color: 'success' },
        ];
      default:
        return [];
    }
  };

  const stats = getRoleSpecificStats();

  const getRecentActivity = () => {
    switch (user?.role) {
      case 'patient':
        return [
          'Order #1234 delivered successfully',
          'New pharmacy "MedPlus" registered nearby',
          'Your review for "City Pharmacy" was helpful',
        ];
      case 'pharmacy':
        return [
          'Low stock alert: Paracetamol (500mg)',
          'New order received from John Doe',
          'Expiry alert: Amoxicillin expires in 30 days',
        ];
      case 'delivery':
        return [
          'New delivery assignment: Order #5678',
          'Delivery #1234 completed',
          'Route optimization available for next delivery',
        ];
      case 'admin':
        return [
          'New pharmacy registration pending approval',
          'System backup completed successfully',
          'User reported issue with order tracking',
        ];
      default:
        return [];
    }
  };

  const recentActivity = getRecentActivity();

  const getQuickActions = () => {
    switch (user?.role) {
      case 'patient':
        return [
          { name: 'Search Drugs', href: '/drugs', color: 'primary' },
          { name: 'Find Pharmacies', href: '/pharmacies', color: 'secondary' },
          { name: 'Track Orders', href: '/delivery', color: 'success' },
          { name: 'Write Review', href: '/reviews', color: 'warning' },
        ];
      case 'pharmacy':
        return [
          { name: 'Manage Inventory', href: '/inventory', color: 'primary' },
          { name: 'View Orders', href: '/delivery', color: 'secondary' },
          { name: 'Update Profile', href: '/profile', color: 'success' },
          { name: 'View Reviews', href: '/reviews', color: 'warning' },
        ];
      case 'delivery':
        return [
          { name: 'View Deliveries', href: '/delivery', color: 'primary' },
          { name: 'Update Status', href: '/delivery', color: 'secondary' },
          { name: 'View Map', href: '/delivery', color: 'success' },
          { name: 'Profile', href: '/profile', color: 'warning' },
        ];
      case 'admin':
        return [
          { name: 'Manage Users', href: '/admin', color: 'primary' },
          { name: 'System Stats', href: '/admin', color: 'secondary' },
          { name: 'Approve Pharmacies', href: '/admin', color: 'success' },
          { name: 'View Logs', href: '/admin', color: 'warning' },
        ];
      default:
        return [];
    }
  };

  const quickActions = getQuickActions();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">
          {getWelcomeMessage()}, {user?.firstName}!
        </h1>
        <p className="mt-2 text-secondary-600">
          Here's what's happening with your {user?.role === 'patient' ? 'healthcare' : 'business'} today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-3 bg-${stat.color}-100 rounded-lg`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-secondary-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-semibold text-secondary-900">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-secondary-900">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <a
                key={action.name}
                href={action.href}
                className={`btn btn-${action.color} text-center`}
              >
                {action.name}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-secondary-900">Recent Activity</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-primary-600 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-secondary-600">{activity}</p>
                </div>
                <div className="flex-shrink-0 text-xs text-secondary-500">
                  {index === 0 ? 'Just now' : index === 1 ? '5 min ago' : '1 hour ago'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status (Admin only) */}
      {user?.role === 'admin' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-secondary-900">System Status</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-success-600">Operational</div>
                <p className="text-sm text-secondary-600 mt-1">Backend Services</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success-600">98.5%</div>
                <p className="text-sm text-secondary-600 mt-1">Uptime (30 days)</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning-600">2.3s</div>
                <p className="text-sm text-secondary-600 mt-1">Avg Response Time</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
