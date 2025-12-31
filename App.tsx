
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import { AuthState, User } from './types';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    token: null
  });

  // Load from local storage on mount (simulating persistence)
  useEffect(() => {
    const savedAuth = localStorage.getItem('cloudquest_auth');
    if (savedAuth) {
      setAuth(JSON.parse(savedAuth));
    }
  }, []);

  const handleLogin = (user: User, token: string) => {
    const newAuth = { user, isAuthenticated: true, token };
    setAuth(newAuth);
    localStorage.setItem('cloudquest_auth', JSON.stringify(newAuth));
  };

  const handleLogout = () => {
    setAuth({ user: null, isAuthenticated: false, token: null });
    localStorage.removeItem('cloudquest_auth');
  };

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow">
          <Routes>
            <Route 
              path="/login" 
              element={!auth.isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/register" 
              element={!auth.isAuthenticated ? <Register onLogin={handleLogin} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/" 
              element={auth.isAuthenticated ? <Dashboard currentUser={auth.user!} onLogout={handleLogout} /> : <Navigate to="/login" />} 
            />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
