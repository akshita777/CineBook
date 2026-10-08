import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading authentication state...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login while saving the current intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
