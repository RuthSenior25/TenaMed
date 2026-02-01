import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const LandingPage = () => {
  const { user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f7fafc' }}>
      {/* Navigation */}
      <nav style={{ 
        backgroundColor: '#ffffff', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <h1 style={{ 
              color: '#2d3748', 
              fontSize: '1.5rem', 
              fontWeight: 'bold',
              margin: 0 
            }}>
              TenaMed
            </h1>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <Link to="/" style={{ 
                color: '#4a5568', 
                textDecoration: 'none',
                fontWeight: '500'
              }}>
                Home
              </Link>
              <Link to="/about" style={{ 
                color: '#4a5568', 
                textDecoration: 'none',
                fontWeight: '500'
              }}>
                About Us
              </Link>
              <Link to="/contact" style={{ 
                color: '#4a5568', 
                textDecoration: 'none',
                fontWeight: '500'
              }}>
                Contact Us
              </Link>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link 
              to="/login" 
              style={{ 
                backgroundColor: 'transparent',
                color: '#3182ce',
                border: '1px solid #3182ce',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Login
            </Link>
            <Link 
              to="/register" 
              style={{ 
                backgroundColor: '#3182ce',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    </div>
  );
};

const HomePage = () => {
  return (
    <div>
      {/* Hero Section */}
      <section style={{ 
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: 'bold', 
            marginBottom: '1rem',
            lineHeight: '1.2'
          }}>
            Welcome to TenaMed
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            marginBottom: '2rem',
            opacity: 0.9
          }}>
            Your trusted pharmaceutical supply chain management platform. Connecting pharmacies, 
            suppliers, and patients for seamless healthcare delivery in Ethiopia.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link 
              to="/register" 
              style={{ 
                backgroundColor: 'white',
                color: '#667eea',
                padding: '1rem 2rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '1.1rem'
              }}
            >
              Get Started
            </Link>
            <Link 
              to="/about" 
              style={{ 
                backgroundColor: 'transparent',
                color: 'white',
                border: '2px solid white',
                padding: '1rem 2rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '1.1rem'
              }}
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '4rem 2rem', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ 
            textAlign: 'center', 
            fontSize: '2.5rem', 
            fontWeight: 'bold',
            marginBottom: '3rem',
            color: '#2d3748'
          }}>
            Why Choose TenaMed?
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem' 
          }}>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ 
                backgroundColor: '#e6fffa', 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                fontSize: '2rem'
              }}>
                🏥
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2d3748' }}>
                For Pharmacies
              </h3>
              <p style={{ color: '#718096', lineHeight: '1.6' }}>
                Manage inventory, track orders, and connect with reliable suppliers. 
                Streamline your pharmacy operations with our comprehensive platform.
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ 
                backgroundColor: '#f0fff4', 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                fontSize: '2rem'
              }}>
                🚚
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2d3748' }}>
                For Suppliers
              </h3>
              <p style={{ color: '#718096', lineHeight: '1.6' }}>
                Reach more pharmacies, manage orders efficiently, and grow your business 
                with our digital supply chain solutions.
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ 
                backgroundColor: '#fef5e7', 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                fontSize: '2rem'
              }}>
                👤
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2d3748' }}>
                For Patients
              </h3>
              <p style={{ color: '#718096', lineHeight: '1.6' }}>
                Order medications online, track deliveries, and access healthcare 
                services from the comfort of your home.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ 
        backgroundColor: '#f7fafc', 
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '2rem' 
          }}>
            <div>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3182ce', margin: 0 }}>
                500+
              </h3>
              <p style={{ color: '#718096', fontSize: '1.1rem' }}>Active Pharmacies</p>
            </div>
            <div>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#48bb78', margin: 0 }}>
                50+
              </h3>
              <p style={{ color: '#718096', fontSize: '1.1rem' }}>Verified Suppliers</p>
            </div>
            <div>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ed8936', margin: 0 }}>
                10K+
              </h3>
              <p style={{ color: '#718096', fontSize: '1.1rem' }}>Monthly Orders</p>
            </div>
            <div>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#9f7aea', margin: 0 }}>
                99.9%
              </h3>
              <p style={{ color: '#718096', fontSize: '1.1rem' }}>Uptime</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const AboutPage = () => {
  return (
    <div style={{ padding: '4rem 2rem', backgroundColor: 'white' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          marginBottom: '2rem',
          color: '#2d3748',
          textAlign: 'center'
        }}>
          About TenaMed
        </h1>
        
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#4a5568' }}>
            Our Mission
          </h2>
          <p style={{ 
            fontSize: '1.1rem', 
            lineHeight: '1.8', 
            color: '#718096',
            textAlign: 'justify'
          }}>
            TenaMed is revolutionizing Ethiopia's pharmaceutical supply chain by connecting 
            pharmacies, suppliers, and patients through a unified digital platform. Our mission 
            is to ensure that every Ethiopian has access to quality medications when they need them, 
            while streamlining operations for healthcare providers and suppliers.
          </p>
        </div>

        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#4a5568' }}>
            Our Vision
          </h2>
          <p style={{ 
            fontSize: '1.1rem', 
            lineHeight: '1.8', 
            color: '#718096',
            textAlign: 'justify'
          }}>
            To become the leading pharmaceutical supply chain management platform in Africa, 
            leveraging technology to improve healthcare accessibility, reduce costs, and ensure 
            medication availability across all communities.
          </p>
        </div>

        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#4a5568' }}>
            Our Values
          </h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
              <div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#2d3748' }}>Quality</h3>
                <p style={{ margin: 0, color: '#718096', lineHeight: '1.6' }}>
                  We ensure the highest standards in pharmaceutical supply chain management.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🤝</span>
              <div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#2d3748' }}>Partnership</h3>
                <p style={{ margin: 0, color: '#718096', lineHeight: '1.6' }}>
                  We build strong relationships with pharmacies, suppliers, and healthcare providers.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>💡</span>
              <div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#2d3748' }}>Innovation</h3>
                <p style={{ margin: 0, color: '#718096', lineHeight: '1.6' }}>
                  We continuously improve our platform with cutting-edge technology solutions.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>❤️</span>
              <div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#2d3748' }}>Care</h3>
                <p style={{ margin: 0, color: '#718096', lineHeight: '1.6' }}>
                  We prioritize patient health and wellbeing in everything we do.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#f7fafc', 
          padding: '2rem', 
          borderRadius: '0.5rem',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#4a5568' }}>
            Join Us Today
          </h2>
          <p style={{ color: '#718096', marginBottom: '2rem' }}>
            Be part of Ethiopia's healthcare revolution. Whether you're a pharmacy, supplier, 
            or healthcare provider, TenaMed has solutions for you.
          </p>
          <Link 
            to="/register" 
            style={{ 
              backgroundColor: '#3182ce',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              display: 'inline-block'
            }}
          >
            Get Started Now
          </Link>
        </div>
      </div>
    </div>
  );
};

const ContactPage = () => {
  return (
    <div style={{ padding: '4rem 2rem', backgroundColor: 'white' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          marginBottom: '2rem',
          color: '#2d3748',
          textAlign: 'center'
        }}>
          Contact Us
        </h1>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '3rem',
          marginBottom: '3rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#4a5568' }}>
              Get in Touch
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📍</span>
                <div>
                  <strong>Address:</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#718096' }}>
                    Bole, Addis Ababa, Ethiopia
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📞</span>
                <div>
                  <strong>Phone:</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#718096' }}>
                    +251 911 234 567
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.2rem' }}>✉️</span>
                <div>
                  <strong>Email:</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#718096' }}>
                    info@tenamed.com
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🌐</span>
                <div>
                  <strong>Website:</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#718096' }}>
                    www.tenamed.com
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#4a5568' }}>
              Business Hours
            </h2>
            <div style={{ backgroundColor: '#f7fafc', padding: '1.5rem', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#4a5568' }}>Monday - Friday</span>
                <span style={{ color: '#2d3748', fontWeight: '500' }}>8:00 AM - 6:00 PM</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#4a5568' }}>Saturday</span>
                <span style={{ color: '#2d3748', fontWeight: '500' }}>9:00 AM - 4:00 PM</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4a5568' }}>Sunday</span>
                <span style={{ color: '#2d3748', fontWeight: '500' }}>Closed</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#f7fafc', 
          padding: '2rem', 
          borderRadius: '0.5rem',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#4a5568' }}>
            Need Support?
          </h2>
          <p style={{ color: '#718096', marginBottom: '2rem' }}>
            Our customer support team is here to help you with any questions or concerns. 
            Whether you're a pharmacy, supplier, or patient, we're ready to assist you.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a 
              href="mailto:support@tenamed.com" 
              style={{ 
                backgroundColor: '#3182ce',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              📧 Email Support
            </a>
            <a 
              href="tel:+251911234567" 
              style={{ 
                backgroundColor: '#48bb78',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              📞 Call Us
            </a>
          </div>
        </div>

        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#4a5568' }}>
            Follow Us
          </h2>
          <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
            Stay connected with us on social media for updates and news.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="#" style={{ 
              backgroundColor: '#3b5998', 
              color: 'white', 
              padding: '0.75rem', 
              borderRadius: '50%',
              textDecoration: 'none',
              fontSize: '1.2rem',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              f
            </a>
            <a href="#" style={{ 
              backgroundColor: '#1da1f2', 
              color: 'white', 
              padding: '0.75rem', 
              borderRadius: '50%',
              textDecoration: 'none',
              fontSize: '1.2rem',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              𝕏
            </a>
            <a href="#" style={{ 
              backgroundColor: '#0077b5', 
              color: 'white', 
              padding: '0.75rem', 
              borderRadius: '50%',
              textDecoration: 'none',
              fontSize: '1.2rem',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
