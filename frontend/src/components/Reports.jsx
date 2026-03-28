import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { transactionAPI, fdAPI, accountAPI } from '../services/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Reports = () => {
    const { hasRole, user } = useAuth();
    const [activeReport, setActiveReport] = useState('daily');
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [monthlyData, setMonthlyData] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
    });
    const [dailyReport, setDailyReport] = useState(null);
    const [monthlyReport, setMonthlyReport] = useState(null);
    const [fdReport, setFdReport] = useState([]);
    const [accountStats, setAccountStats] = useState(null);
    const [transactionTrends, setTransactionTrends] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [branches, setBranches] = useState([]);

    const isManager = hasRole(['Manager']);

    // Redirect if not authorized
    if (!isManager) {
        return (
            <div className="p-6 text-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p className="font-semibold">Access Denied</p>
                    <p className="text-sm">Only Managers can view reports.</p>
                </div>
            </div>
        );
    }

    // Load reports on mount and when filters change
    useEffect(() => {
        fetchDailyReport();
        fetchMonthlyReport();
        fetchFDReport();
        fetchAccountStats();
        fetchTransactionTrends();
    }, [dateRange, monthlyData, selectedBranch]);

    const fetchDailyReport = async () => {
        try {
            setLoading(true);
            const response = await transactionAPI.getDailyReport(dateRange.startDate);
            setDailyReport(response.data);
        } catch (error) {
            console.error('Error fetching daily report:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthlyReport = async () => {
        try {
            const response = await transactionAPI.getMonthlyReport(monthlyData.year, monthlyData.month);
            setMonthlyReport(response.data);
        } catch (error) {
            console.error('Error fetching monthly report:', error);
        }
    };

    const fetchFDReport = async () => {
        try {
            const response = await fdAPI.getMaturing(90);
            setFdReport(response.data.fds || []);
        } catch (error) {
            console.error('Error fetching FD report:', error);
            setFdReport([]);
        }
    };

    const fetchAccountStats = async () => {
        try {
            const response = await accountAPI.getAll();
            const accounts = response.data.accounts || [];
            
            const stats = {
                totalAccounts: accounts.length,
                activeAccounts: accounts.filter(a => a.account_status === 'active').length,
                closedAccounts: accounts.filter(a => a.account_status === 'closed').length,
                totalBalance: accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0),
                avgBalance: accounts.length > 0 ? accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0) / accounts.length : 0,
                accountsByBranch: {},
                accountsByPlan: {}
            };
            
            // Group by branch
            accounts.forEach(acc => {
                const branch = acc.branch_name || 'Unknown';
                stats.accountsByBranch[branch] = (stats.accountsByBranch[branch] || 0) + 1;
                
                const plan = acc.plan_type || 'Unknown';
                stats.accountsByPlan[plan] = (stats.accountsByPlan[plan] || 0) + 1;
            });
            
            setAccountStats(stats);
        } catch (error) {
            console.error('Error fetching account stats:', error);
        }
    };

    const fetchTransactionTrends = async () => {
        // Generate mock trend data for the last 7 days
        const trends = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            try {
                const response = await transactionAPI.getDailyReport(dateStr);
                if (response.data && response.data.summary) {
                    trends.push({
                        date: dateStr,
                        deposits: response.data.summary.deposits?.total || 0,
                        withdrawals: response.data.summary.withdrawals?.total || 0,
                        transfers: response.data.summary.transfers?.total || 0,
                        count: response.data.summary.total_transactions || 0
                    });
                } else {
                    trends.push({ date: dateStr, deposits: 0, withdrawals: 0, transfers: 0, count: 0 });
                }
            } catch (error) {
                trends.push({ date: dateStr, deposits: 0, withdrawals: 0, transfers: 0, count: 0 });
            }
        }
        setTransactionTrends(trends);
    };

    const formatCurrency = (amount) => {
        return `Rs. ${parseFloat(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    // Prepare data for charts
    const preparePieData = (data) => {
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    };

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    // Daily Report Component
    const DailyReportView = () => (
        <div className="space-y-6">
            {/* Date Selector */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value, endDate: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : dailyReport ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <p className="text-sm text-gray-500">Total Transactions</p>
                            <p className="text-2xl font-bold text-blue-600">{dailyReport.summary?.total_transactions || 0}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <p className="text-sm text-gray-500">Total Deposits</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(dailyReport.summary?.deposits?.total)}</p>
                            <p className="text-xs text-gray-500">{dailyReport.summary?.deposits?.count || 0} transactions</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <p className="text-sm text-gray-500">Total Withdrawals</p>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(dailyReport.summary?.withdrawals?.total)}</p>
                            <p className="text-xs text-gray-500">{dailyReport.summary?.withdrawals?.count || 0} transactions</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <p className="text-sm text-gray-500">Net Flow</p>
                            <p className={`text-2xl font-bold ${(dailyReport.summary?.deposits?.total || 0) - (dailyReport.summary?.withdrawals?.total || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency((dailyReport.summary?.deposits?.total || 0) - (dailyReport.summary?.withdrawals?.total || 0))}
                            </p>
                        </div>
                    </div>

                    {/* Transactions List */}
                    {dailyReport.transactions && dailyReport.transactions.length > 0 && (
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-semibold">Transactions</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Time</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Account</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Branch</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Employee</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {dailyReport.transactions.map((tx, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm">{formatDate(tx.time)}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        tx.type === 'Deposit' ? 'bg-green-100 text-green-800' :
                                                        tx.type === 'Withdrawal' ? 'bg-red-100 text-red-800' :
                                                        'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {tx.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium">{formatCurrency(tx.amount)}</td>
                                                <td className="px-6 py-4 text-sm">{tx.account_number}</td>
                                                <td className="px-6 py-4 text-sm">{tx.branch || '-'}</td>
                                                <td className="px-6 py-4 text-sm">{tx.employee || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-12 text-gray-500">No data available</div>
            )}
        </div>
    );

    // Monthly Report Component
    const MonthlyReportView = () => (
        <div className="space-y-6">
            {/* Month Selector */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                        <input
                            type="number"
                            value={monthlyData.year}
                            onChange={(e) => setMonthlyData({ ...monthlyData, year: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                        <select
                            value={monthlyData.month}
                            onChange={(e) => setMonthlyData({ ...monthlyData, month: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={1}>January</option>
                            <option value={2}>February</option>
                            <option value={3}>March</option>
                            <option value={4}>April</option>
                            <option value={5}>May</option>
                            <option value={6}>June</option>
                            <option value={7}>July</option>
                            <option value={8}>August</option>
                            <option value={9}>September</option>
                            <option value={10}>October</option>
                            <option value={11}>November</option>
                            <option value={12}>December</option>
                        </select>
                    </div>
                </div>
            </div>

            {monthlyReport ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <p className="text-sm text-gray-500">Total Transactions</p>
                            <p className="text-2xl font-bold text-blue-600">{monthlyReport.summary?.total_transactions || 0}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <p className="text-sm text-gray-500">Total Deposits</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(monthlyReport.summary?.deposits?.total)}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <p className="text-sm text-gray-500">Total Withdrawals</p>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(monthlyReport.summary?.withdrawals?.total)}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <p className="text-sm text-gray-500">Net Flow</p>
                            <p className={`text-2xl font-bold ${monthlyReport.summary?.net_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(monthlyReport.summary?.net_flow)}
                            </p>
                        </div>
                    </div>

                    {/* Daily Breakdown Chart */}
                    {monthlyReport.daily_breakdown && monthlyReport.daily_breakdown.length > 0 && (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Daily Transaction Volume</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={monthlyReport.daily_breakdown}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" label={{ value: 'Day of Month', position: 'insideBottom', offset: -5 }} />
                                    <YAxis label={{ value: 'Amount (Rs.)', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend />
                                    <Bar dataKey="deposits" name="Deposits" fill="#10B981" />
                                    <Bar dataKey="withdrawals" name="Withdrawals" fill="#EF4444" />
                                    <Bar dataKey="transfers" name="Transfers" fill="#3B82F6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Transaction Type Distribution */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4">Transaction Distribution</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Deposits', value: monthlyReport.summary?.deposits?.total || 0 },
                                            { name: 'Withdrawals', value: monthlyReport.summary?.withdrawals?.total || 0 },
                                            { name: 'Transfers', value: monthlyReport.summary?.transfers?.total || 0 }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {[0, 1, 2].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col justify-center">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                        <div>
                                            <p className="font-semibold text-green-800">Total Deposits</p>
                                            <p className="text-2xl font-bold text-green-600">{formatCurrency(monthlyReport.summary?.deposits?.total)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-green-600">{monthlyReport.summary?.deposits?.count || 0} transactions</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                        <div>
                                            <p className="font-semibold text-red-800">Total Withdrawals</p>
                                            <p className="text-2xl font-bold text-red-600">{formatCurrency(monthlyReport.summary?.withdrawals?.total)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-red-600">{monthlyReport.summary?.withdrawals?.count || 0} transactions</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                        <div>
                                            <p className="font-semibold text-blue-800">Total Transfers</p>
                                            <p className="text-2xl font-bold text-blue-600">{formatCurrency(monthlyReport.summary?.transfers?.total)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-blue-600">{monthlyReport.summary?.transfers?.count || 0} transactions</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-12 text-gray-500">No data available</div>
            )}
        </div>
    );

    // Account Analytics Component
    const AccountAnalyticsView = () => (
        <div className="space-y-6">
            {accountStats && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <p className="text-sm text-gray-500">Total Accounts</p>
                            <p className="text-2xl font-bold text-blue-600">{accountStats.totalAccounts}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <p className="text-sm text-gray-500">Active Accounts</p>
                            <p className="text-2xl font-bold text-green-600">{accountStats.activeAccounts}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <p className="text-sm text-gray-500">Total Balance</p>
                            <p className="text-2xl font-bold text-purple-600">{formatCurrency(accountStats.totalBalance)}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <p className="text-sm text-gray-500">Average Balance</p>
                            <p className="text-2xl font-bold text-orange-600">{formatCurrency(accountStats.avgBalance)}</p>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Accounts by Branch */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Accounts by Branch</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={preparePieData(accountStats.accountsByBranch)}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {Object.keys(accountStats.accountsByBranch).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Accounts by Plan Type */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Accounts by Plan Type</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={preparePieData(accountStats.accountsByPlan)}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {Object.keys(accountStats.accountsByPlan).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Transaction Trends */}
                    {transactionTrends.length > 0 && (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4">7-Day Transaction Trends</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <AreaChart data={transactionTrends}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis label={{ value: 'Amount (Rs.)', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend />
                                    <Area type="monotone" dataKey="deposits" name="Deposits" stackId="1" fill="#10B981" stroke="#059669" />
                                    <Area type="monotone" dataKey="withdrawals" name="Withdrawals" stackId="1" fill="#EF4444" stroke="#DC2626" />
                                    <Area type="monotone" dataKey="transfers" name="Transfers" stackId="1" fill="#3B82F6" stroke="#2563EB" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    // FD Report Component
    const FDReportView = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Fixed Deposits Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600">Total Active FDs</p>
                        <p className="text-2xl font-bold text-blue-800">{fdReport.filter(f => f.fd_status === 'active').length}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                        <p className="text-sm text-yellow-600">Maturing Next 30 Days</p>
                        <p className="text-2xl font-bold text-yellow-800">{fdReport.filter(f => f.days_remaining <= 30 && f.days_remaining > 0).length}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600">Total FD Value</p>
                        <p className="text-2xl font-bold text-green-800">
                            {formatCurrency(fdReport.reduce((sum, f) => sum + parseFloat(f.fd_balance), 0))}
                        </p>
                    </div>
                </div>

                {fdReport.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">FD ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Plan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Interest Rate</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Maturity Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Days Left</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {fdReport.map((fd) => (
                                    <tr key={fd.fd_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium">#{fd.fd_id}</td>
                                        <td className="px-6 py-4 text-sm">Customer #{fd.customer_id}</td>
                                        <td className="px-6 py-4 text-sm">{fd.fd_options}</td>
                                        <td className="px-6 py-4 text-sm font-medium">{formatCurrency(fd.fd_balance)}</td>
                                        <td className="px-6 py-4 text-sm">{fd.interest_rate}%</td>
                                        <td className="px-6 py-4 text-sm">{formatDate(fd.maturity_date)}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={fd.days_remaining <= 7 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                                                {fd.days_remaining > 0 ? `${fd.days_remaining} days` : 'Matured'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                fd.fd_status === 'active' ? 'bg-green-100 text-green-800' :
                                                fd.fd_status === 'matured' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {fd.fd_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">No FD data available</div>
                )}
            </div>
        </div>
    );

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                <p className="text-gray-600 mt-1">View transaction reports, account analytics, and FD summaries</p>
            </div>

            {/* Report Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="flex -mb-px space-x-8">
                    <button
                        onClick={() => setActiveReport('daily')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeReport === 'daily'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Daily Report
                    </button>
                    <button
                        onClick={() => setActiveReport('monthly')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeReport === 'monthly'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Monthly Report
                    </button>
                    <button
                        onClick={() => setActiveReport('accounts')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeReport === 'accounts'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Account Analytics
                    </button>
                    <button
                        onClick={() => setActiveReport('fd')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeReport === 'fd'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        FD Report
                    </button>
                </nav>
            </div>

            {/* Report Content */}
            {activeReport === 'daily' && <DailyReportView />}
            {activeReport === 'monthly' && <MonthlyReportView />}
            {activeReport === 'accounts' && <AccountAnalyticsView />}
            {activeReport === 'fd' && <FDReportView />}
        </div>
    );
};

export default Reports;