import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';

const Layout = () => {
    const { user, logout, hasRole } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinks = [
        { to: '/dashboard', label: 'Dashboard', roles: ['Admin', 'Manager', 'Agent'] },
        { to: '/customers', label: 'Customers', roles: ['Manager', 'Agent'] },
        { to: '/accounts', label: 'Accounts', roles: ['Manager', 'Agent'] },
        { to: '/transactions', label: 'Transactions', roles: ['Manager', 'Agent'] },
        { to: '/fd-portfolio', label: 'FD Portfolio', roles: ['Manager', 'Agent'] },
        { to: '/fd-plans', label: 'FD Plans', roles: ['Admin'] },
        { to: '/reports', label: 'Reports', roles: ['Manager'] },
        { to: '/employees', label: 'Employees', roles: ['Admin'] },
    ];

    const visibleLinks = navLinks.filter(link => hasRole(link.roles));

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Navigation Bar */}
            <nav className="bg-white shadow-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            {/* Logo Link */}
                            <Link to="/dashboard" className="flex items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <span className="font-bold text-gray-800">Microbanking</span>
                                </div>
                            </Link>
                            
                            {/* Navigation Links */}
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                {visibleLinks.map((link) => (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            {/* User Info */}
                            <div className="text-sm text-gray-700">
                                <span className="font-medium">{user?.first_name} {user?.last_name}</span>
                                <span className="ml-2 px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                                    {user?.position}
                                </span>
                            </div>
                            
                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="bg-red-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-600 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;