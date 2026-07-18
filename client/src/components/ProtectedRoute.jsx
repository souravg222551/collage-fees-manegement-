import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui/Primitives';

const ProtectedRoute = ({ children }) => {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner className="w-8 h-8 text-brand-600" />
      </div>
    );
  }

  if (!admin) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;
