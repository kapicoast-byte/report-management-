import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Outlets from './pages/Outlets';
import Users from './pages/Users';
import Vendors from './pages/Vendors';
import Bills from './pages/Bills';
import Settlements from './pages/Settlements';
import Reports from './pages/Reports';
import Layout from './components/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string; permission?: string }> = ({ 
  children, 
  requiredRole,
  permission 
}) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  if (requiredRole && profile?.role !== requiredRole && profile?.role !== 'owner') {
    return <Navigate to="/" />;
  }

  if (permission && profile?.role !== 'owner' && profile?.role !== 'manager' && !profile?.permissions?.[permission as keyof typeof profile.permissions]) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="outlets" element={<ProtectedRoute requiredRole="owner"><Outlets /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute requiredRole="owner"><Users /></ProtectedRoute>} />
        <Route path="vendors" element={<ProtectedRoute permission="manage_vendors"><Vendors /></ProtectedRoute>} />
        <Route path="bills" element={<ProtectedRoute permission="upload_bills"><Bills /></ProtectedRoute>} />
        <Route path="settlements" element={<ProtectedRoute permission="view_settlements"><Settlements /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute requiredRole="manager"><Reports /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}
