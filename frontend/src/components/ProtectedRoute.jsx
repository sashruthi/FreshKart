import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';

export function ProtectedRoute({ children, requiredRole }) {
  const { user, isLoggedIn } = useAuth();

  if (!isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function CustomerRoute({ children }) {
  return <ProtectedRoute requiredRole="customer">{children}</ProtectedRoute>;
}

export function MerchantRoute({ children }) {
  return <ProtectedRoute requiredRole="merchant">{children}</ProtectedRoute>;
}

export function OwnerRoute({ children }) {
  const { user, isLoggedIn } = useAuth();

  if (!isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

  if (user?.role !== 'owner' && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
