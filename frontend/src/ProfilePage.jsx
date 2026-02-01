import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    // Pharmacy specific
    pharmacyName: '',
    licenseNumber: '',
    // Supplier specific
    company: '',
    // Delivery person specific
    vehicleType: '',
    licensePlate: '',
    // Common
    bio: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        email: user.email || '',
        phone: user.profile?.phone || '',
        address: user.profile?.address || '',
        pharmacyName: user.pharmacyName || '',
        licenseNumber: user.licenseNumber || '',
        company: user.profile?.company || '',
        vehicleType: user.profile?.vehicleType || '',
        licensePlate: user.profile?.licensePlate || '',
        bio: user.profile?.bio || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://tenamed-backend.onrender.com/api'}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();
      if (data.success) {
        // Update user context with new data
        updateUser(data.data);
        setIsEditing(false);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original data
    if (user) {
      setProfileData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        email: user.email || '',
        phone: user.profile?.phone || '',
        address: user.profile?.address || '',
        pharmacyName: user.pharmacyName || '',
        licenseNumber: user.licenseNumber || '',
        company: user.profile?.company || '',
        vehicleType: user.profile?.vehicleType || '',
        licensePlate: user.profile?.licensePlate || '',
        bio: user.profile?.bio || ''
      });
    }
  };

  const renderField = (name, label, type = 'text', required = false) => {
    const value = profileData[name];
    const showField = value !== undefined && value !== null;
    
    if (!showField && !isEditing) return null;

    return (
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '0.5rem', 
          fontWeight: '500',
          color: '#4a5568'
        }}>
          {label} {required && <span style={{ color: '#e53e3e' }}>*</span>}
        </label>
        {isEditing ? (
          <input
            type={type}
            name={name}
            value={value || ''}
            onChange={handleInputChange}
            required={required}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #cbd5e0',
              borderRadius: '0.375rem',
              fontSize: '1rem'
            }}
          />
        ) : (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f7fafc',
            borderRadius: '0.375rem',
            color: '#2d3748'
          }}>
            {value || 'Not specified'}
          </div>
        )}
      </div>
    );
  };

  const getRoleSpecificFields = () => {
    switch (user?.role) {
      case 'pharmacy':
        return (
          <>
            {renderField('pharmacyName', 'Pharmacy Name', 'text', true)}
            {renderField('licenseNumber', 'License Number', 'text', true)}
          </>
        );
      case 'supplier':
        return (
          <>
            {renderField('company', 'Company Name', 'text', true)}
          </>
        );
      case 'delivery_person':
        return (
          <>
            {renderField('vehicleType', 'Vehicle Type', 'text', true)}
            {renderField('licensePlate', 'License Plate', 'text', true)}
          </>
        );
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f7fafc'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f7fafc',
      padding: '2rem'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            marginBottom: '0.5rem',
            margin: 0
          }}>
            My Profile
          </h1>
          <p style={{ 
            opacity: 0.9,
            margin: 0,
            textTransform: 'capitalize'
          }}>
            {user.role?.replace('_', ' ')} Account
          </p>
        </div>

        {/* Profile Content */}
        <div style={{ padding: '2rem' }}>
          {/* Account Status */}
          <div style={{
            backgroundColor: user.isApproved ? '#f0fff4' : '#fff5f5',
            border: `1px solid ${user.isApproved ? '#9ae6b4' : '#feb2b2'}`,
            borderRadius: '0.375rem',
            padding: '1rem',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <span style={{
              color: user.isApproved ? '#22543d' : '#742a2a',
              fontWeight: '500'
            }}>
              Account Status: {user.isApproved ? '✅ Approved' : '⏳ Pending Approval'}
            </span>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit}>
            {/* Common Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {renderField('firstName', 'First Name', 'text', true)}
              {renderField('lastName', 'Last Name', 'text', true)}
            </div>
            
            {renderField('email', 'Email Address', 'email', true)}
            {renderField('phone', 'Phone Number', 'tel')}
            {renderField('address', 'Address', 'text')}

            {/* Role-specific Fields */}
            {getRoleSpecificFields()}

            {/* Bio */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                color: '#4a5568'
              }}>
                Bio / Additional Information
              </label>
              {isEditing ? (
                <textarea
                  name="bio"
                  value={profileData.bio || ''}
                  onChange={handleInputChange}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #cbd5e0',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                />
              ) : (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#f7fafc',
                  borderRadius: '0.375rem',
                  color: '#2d3748',
                  minHeight: '100px'
                }}>
                  {profileData.bio || 'No bio provided'}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'flex-end',
              marginTop: '2rem'
            }}>
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isLoading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#e2e8f0',
                      color: '#4a5568',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontWeight: '500',
                      cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#3182ce',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontWeight: '500',
                      cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#3182ce',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Edit Profile
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
