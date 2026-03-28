import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { customerAPI, accountAPI, transactionAPI, fdAPI, employeeAPI, onDataChange, removeDataChangeListener  } from '../services/api';

const Dashboard = () => {
    const { user, hasRole } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalCustomers: 0,
        totalAccounts: 0,
        totalTransactions: 0,
        totalFDs: 0,
        totalEmployees: 0,
    });
    const [loading, setLoading] = useState(true);

    const formatLastLogin = (value) => {
        if (!value) return 'Not available';
        return new Date(value).toLocaleString();
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            // console.log('Fetching dashboard data...');

            const [customersRes, accountsRes, transactionsRes, fdsRes, employeesRes] = await Promise.all([
                customerAPI.getAll().catch(() => ({ data: { customers: [] } })),
                accountAPI.getAll().catch(() => ({ data: { accounts: [] } })),
                transactionAPI.getAll().catch(() => ({ data: { transactions: [] } })),
                fdAPI.getInvestments().catch(() => ({ data: { investments: [] } })),
                employeeAPI.getAll().catch(() => ({ data: { employees: [] } })),
            ]);

            // Log the responses to see the structure
            // console.log('Customers response:', customersRes);
            // console.log('Accounts response:', accountsRes);
            // console.log('Transactions response:', transactionsRes);
            // console.log('FDs response:', fdsRes);

            const employees = employeesRes.data?.employees || [];
            const employeeCount = Array.isArray(employees) ? employees.length : 0;

            // Handle different response structures
            const customers = customersRes.data?.customers || customersRes.data || [];
            const accounts = accountsRes.data?.accounts || accountsRes.data || [];
            const transactions = transactionsRes.data?.transactions || transactionsRes.data || [];
            const fds = fdsRes.data?.investments || fdsRes.data?.fds || fdsRes.data || [];

            setStats({
                totalCustomers: Array.isArray(customers) ? customers.length : 0,
                totalAccounts: Array.isArray(accounts) ? accounts.length : 0,
                totalTransactions: Array.isArray(transactions) ? transactions.length : 0,
                totalFDs: Array.isArray(fds) ? fds.length : 0,
                totalEmployees: employeeCount,
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();

        const refresh = () => fetchDashboardData();

        onDataChange('customers', refresh);
        onDataChange('accounts', refresh);
        onDataChange('transactions', refresh);
        onDataChange('fds', refresh);

        // Cleanup listeners on unmount
        return () => {
            removeDataChangeListener('customers', refresh);
            removeDataChangeListener('accounts', refresh);
            removeDataChangeListener('transactions', refresh);
            removeDataChangeListener('fds', refresh);
        };
    }, []);

    const StatCard = ({ title, value, icon, color, onClick }) => (
        <div
            onClick={onClick}
            className={`bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition transform hover:scale-105 border-l-4 ${color}`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{loading ? '...' : value}</p>
                </div>
                <div className="text-4xl">{icon}</div>
            </div>
        </div>
    );


    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg shadow-lg p-8 text-white">
                <h1 className="text-3xl font-bold">Welcome back, {user?.first_name || user?.name || 'User'}!</h1>
                <p className="text-indigo-200 mt-2">You are logged in as: <span className="font-semibold">{user?.position || user?.role}</span></p>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Customers"
                    value={stats.totalCustomers}
                    icon="👥"
                    color="border-blue-500"
                    onClick={() => hasRole(['Manager', 'Agent']) && navigate('/customers')}
                />
                <StatCard
                    title="Total Accounts"
                    value={stats.totalAccounts}
                    icon="🏦"
                    color="border-green-500"
                    onClick={() => hasRole(['Manager', 'Agent']) && navigate('/accounts')}
                />
                <StatCard
                    title="Total Transactions"
                    value={stats.totalTransactions}
                    icon="💸"
                    color="border-purple-500"
                    onClick={() => hasRole(['Manager', 'Agent']) && navigate('/transactions')}
                />
                <StatCard
                    title="Active FDs"
                    value={stats.totalFDs}
                    icon="📈"
                    color="border-orange-500"
                    onClick={() => hasRole(['Admin','Manager', 'Agent']) && navigate('/fd-portfolio')}
                />
                <StatCard
                    title="Total Employees"
                    value={stats.totalEmployees}
                    icon="👥"
                    color="border-red-500"
                    onClick={() => hasRole(['Manager', 'Admin']) && navigate('/employees')}
                />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* ========== AGENT & MANAGER ACTIONS ========== */}
                    {hasRole(['Manager', 'Agent']) && (
                        <button
                            onClick={() => navigate('/customers')}
                            className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 text-left transition"
                        >
                            <p className="font-semibold text-blue-900">View Customers</p>
                        <p className="text-sm text-blue-700">Manage customer records</p>
                    </button>
                    )}

                    {hasRole(['Agent']) && (
                        <button
                            onClick={() => navigate('/customers')}
                            className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-4 text-left transition"
                        >
                            <p className="font-semibold text-green-900">Create Customer</p>
                            <p className="text-sm text-green-700">Add new customer</p>
                        </button>
                    )}

                    {hasRole(['Agent']) && (
                        <button
                            onClick={() => navigate('/accounts')}
                            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg p-4 text-left transition"
                        >
                            <p className="font-semibold text-emerald-900">Open Account</p>
                            <p className="text-sm text-emerald-700">Open new bank account</p>
                        </button>
                    )}

                    {hasRole(['Agent']) && (
                        <button
                            onClick={() => navigate('/transactions')}
                            className="bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg p-4 text-left transition"
                        >
                            <p className="font-semibold text-yellow-900">Deposit/Withdraw</p>
                            <p className="text-sm text-yellow-700">Process transactions</p>
                        </button>
                    )}

                    {hasRole(['Manager', 'Agent']) && (
                        <button
                            onClick={() => navigate('/transactions')}
                            className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-4 text-left transition"
                        >
                            <p className="font-semibold text-purple-900">View Transactions</p>
                            <p className="text-sm text-purple-700">Transaction history</p>
                        </button>
                    )}

                    {hasRole(['Manager', 'Agent']) && (
                        <button
                            onClick={() => navigate('/accounts')}
                            className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg p-4 text-left transition"
                        >
                            <p className="font-semibold text-indigo-900">Manage Accounts</p>
                            <p className="text-sm text-indigo-700">View all accounts</p>
                        </button>
                    )}

                    {hasRole(['Manager', 'Agent']) && (
                        <button
                            onClick={() => navigate('/fd-portfolio')}
                            className="bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg p-4 text-left transition"
                        >
                            <p className="font-semibold text-orange-900">FD Portfolio</p>
                            <p className="text-sm text-orange-700">View fixed deposits</p>
                        </button>
                    )}

                    {hasRole(['Agent']) && (
                        <button
                            onClick={() => navigate('/fd-portfolio')}
                            className="bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg p-4 text-left transition"
                        >
                            <p className="font-semibold text-amber-900">Create FD</p>
                            <p className="text-sm text-amber-700">Open new fixed deposit</p>
                        </button>
                    )}

                    {hasRole(['Manager']) && (
                        <button
                            onClick={() => navigate('/reports')}
                            className="bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg p-4 text-left transition"
                        >
                            <p className="font-semibold text-orange-900">Generate Reports</p>
                            <p className="text-sm text-orange-700">View system reports</p>
                        </button>
                    )}



                    {/* ========== ADMIN ACTIONS ========== */}
                    {hasRole(['Admin']) && (
                        <button
                            onClick={() => navigate('/fd-plans')}
                            className="bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-lg p-4 text-left transition"
                        >
                            <p className="font-semibold text-pink-900">📋 Manage FD Plans</p>
                            <p className="text-sm text-pink-700">Create and edit FD products</p>
                        </button>
                    )}

                    {hasRole(['Admin']) && (
                        <button
                            onClick={() => navigate('/employees')}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg p-4 text-left transition"
                        >
                            <p className="font-semibold text-rose-900">👥 Manage Employees</p>
                            <p className="text-sm text-rose-700">Register and manage staff accounts</p>
                        </button>
                    )}
                </div>
            </div>

            {/* System Info */}
            <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">System Information</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-gray-600 text-sm">Your Role</p>
                        <p className="text-lg font-semibold text-gray-900">{user?.position || user?.role || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 text-sm">Username</p>
                        <p className="text-lg font-semibold text-gray-900">{user?.username || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 text-sm">Branch</p>
                        <p className="text-lg font-semibold text-gray-900">{user?.branch_name || 'Not assigned'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 text-sm">Last Login</p>
                        <p className="text-lg font-semibold text-gray-900">{formatLastLogin(user?.last_login)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
