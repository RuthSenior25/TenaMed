import React, { Component } from 'react';
import { useNavigate } from 'react-router-dom';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-red-600 mb-4">
              Something went wrong
            </h2>
            <p className="mb-4">
              We're having trouble loading this page. Please try refreshing or log in again.
            </p>
            <button
              onClick={() => {
                window.location.href = '/login';
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
