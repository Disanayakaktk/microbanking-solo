import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import Accounts from './components/Accounts';
import Transactions from './components/Transactions';
import FDPortfolio from './components/FDPortfolio';  // For Manager/Agent
import FDPlans from './components/FDPlans';          // For Admin only
import Reports from './components/Reports';
import Employees from './components/Employees';    // For Admin only


// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }
    
    if (!user) return <Navigate to="/login" replace />;
    
    return children;
};

// Role-based route wrapper
const RoleRoute = ({ children, roles }) => {
    const { user, hasRole } = useAuth();
    
    if (!hasRole(roles)) {
        return (
            <div className="p-6 text-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p className="font-semibold">Access Denied</p>
                    <p className="text-sm">You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }
    
    return children;
};

// App Routes Component
function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<RoleRoute roles={['Manager', 'Agent']}><Customers /></RoleRoute>} />
                <Route path="/accounts" element={<RoleRoute roles={['Manager', 'Agent']}><Accounts /></RoleRoute>} />
                <Route path="/transactions" element={<RoleRoute roles={['Manager', 'Agent']}><Transactions /></RoleRoute>} />
                <Route path="/fd-portfolio" element={<RoleRoute roles={['Manager', 'Agent']}><FDPortfolio /></RoleRoute>} />
                <Route path="/fd-plans" element={<RoleRoute roles={['Admin']}><FDPlans /></RoleRoute>} />
                <Route path="/reports" element={<RoleRoute roles={['Manager']}><Reports /></RoleRoute>} />
                <Route path="/employees" element={<RoleRoute roles={['Admin']}><Employees /></RoleRoute>} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
        </Routes>
    );
}

// Main App Component
function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;