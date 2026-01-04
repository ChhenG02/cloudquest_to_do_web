// src/App.tsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './src/stores/useAuthStore';
import LoadingSpinner from './src/components/LoadingSpinner';
import Login from './src/pages/p1-auth/Login';
import Register from './src/pages/p1-auth/Register';
import Dashboard from './src/components/Dashboard';


const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    if (!checkedAuth) {
      checkAuth().finally(() => {
        setCheckedAuth(true);
      });
    }
  }, [checkAuth, checkedAuth]);

  if (isLoading || !checkedAuth) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    if (!checkedAuth) {
      checkAuth().finally(() => {
        setCheckedAuth(true);
      });
    }
  }, [checkAuth, checkedAuth]);

  if (isLoading || !checkedAuth) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { checkAuth } = useAuthStore();
  
  useEffect(() => {
    // Initial auth check
    checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } 
        />
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;