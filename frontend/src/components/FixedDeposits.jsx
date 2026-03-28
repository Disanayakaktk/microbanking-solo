import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fdAPI, customerAPI, accountAPI } from '../services/api';

const FixedDeposits = () => {
    const { hasRole, user } = useAuth();
    const [activeTab, setActiveTab] = useState('portfolio');
    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState([]);
    const [fds, setFds] = useState([]);
    const [maturingFDs, setMaturingFDs] = useState([]);
    const [selectedFD, setSelectedFD] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [searchResult, setSearchResult] = useState(null);
    const [searchNIC, setSearchNIC] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [formData, setFormData] = useState({
        customer_id: '',
        account_id: '',
        fd_plan_id: '',
        fd_balance: '',
        auto_renewal: false
    });
    const [renewData, setRenewData] = useState({
        renew_option: 'same_plan',
        new_plan_id: ''
    });
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [interestHistory, setInterestHistory] = useState([]);

    const canCreateFD = hasRole(['Agent', 'Manager', 'Admin']);
    const canViewAll = hasRole(['Manager', 'Admin']);

    // Load FD plans on mount
    useEffect(() => {
        fetchFDPlans();
        fetchMaturingFDs();
    }, []);

    // Load customer accounts when customer is selected
    useEffect(() => {
        if (searchResult) {
            fetchCustomerAccounts(searchResult.customer_id);
        }
    }, [searchResult]);

    const fetchFDPlans = async () => {
        try {
            const response = await fdAPI.getPlans();
            setPlans(response.data.plans || []);
        } catch (error) {
            console.error('Error fetching FD plans:', error);
            // Fallback data if API not ready
            setPlans([
                { fd_plan_id: 1, fd_options: '6 months', interest: 7.5, min_amount: 10000, penalty_rate: 1.0 },
                { fd_plan_id: 2, fd_options: '1 year', interest: 8.5, min_amount: 25000, penalty_rate: 1.5 },
                { fd_plan_id: 3, fd_options: '3 years', interest: 9.5, min_amount: 50000, penalty_rate: 2.0 },
                { fd_plan_id: 4, fd_options: '5 years', interest: 10.5, min_amount: 100000, penalty_rate: 2.5 }
            ]);
        }
    };

    const fetchCustomerFDs = async (customerId) => {
        try {
            setLoading(true);
            const response = await fdAPI.getInvestmentsByCustomer(customerId);
            setFds(response.data.fds || []);
        } catch (error) {
            console.error('Error fetching FDs:', error);
            setFds([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchMaturingFDs = async () => {
        try {
            const response = await fdAPI.getMaturing(30);
            setMaturingFDs(response.data.fds || []);
        } catch (error) {
            console.error('Error fetching maturing FDs:', error);
        }
    };

    const fetchCustomerAccounts = async (customerId) => {
        try {
            const response = await accountAPI.getByCustomerId(customerId);
            setAccounts(response.data.accounts || []);
        } catch (error) {
            console.error('Error fetching accounts:', error);
            setAccounts([]);
        }
    };

    const searchCustomer = async () => {
        if (!searchNIC.trim()) {
            setSearchResult(null);
            setAccounts([]);
            setFds([]);
            return;
        }

        try {
            const response = await customerAPI.getByNIC(searchNIC);
            setSearchResult(response.data.customer);
            setFormError('');
            fetchCustomerFDs(response.data.customer.customer_id);
        } catch (error) {
            setSearchResult(null);
            setAccounts([]);
            setFds([]);
            setFormError('Customer not found with this NIC');
        }
    };

    const resetForm = () => {
        setFormData({
            customer_id: '',
            account_id: '',
            fd_plan_id: '',
            fd_balance: '',
            auto_renewal: false
        });
        setFormError('');
        setFormSuccess('');
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleCreateFD = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        setLoading(true);

        // Validation
        if (!searchResult) {
            setFormError('Please search for a customer first');
            setLoading(false);
            return;
        }

        if (!formData.account_id) {
            setFormError('Please select an account');
            setLoading(false);
            return;
        }

        if (!formData.fd_plan_id) {
            setFormError('Please select an FD plan');
            setLoading(false);
            return;
        }

        if (!formData.fd_balance || parseFloat(formData.fd_balance) <= 0) {
            setFormError('Please enter a valid FD amount');
            setLoading(false);
            return;
        }

        // Get selected plan's minimum amount
        const selectedPlan = plans.find(p => p.fd_plan_id === parseInt(formData.fd_plan_id));
        if (selectedPlan && parseFloat(formData.fd_balance) < selectedPlan.min_amount) {
            setFormError(`Minimum FD amount for ${selectedPlan.fd_options} plan is Rs. ${selectedPlan.min_amount.toLocaleString()}`);
            setLoading(false);
            return;
        }

        try {
            await fdAPI.createInvestment({
                customer_id: searchResult.customer_id,
                account_id: parseInt(formData.account_id),
                fd_plan_id: parseInt(formData.fd_plan_id),
                fd_balance: parseFloat(formData.fd_balance),
                auto_renewal: formData.auto_renewal
            });

            setFormSuccess('FD investment created successfully!');
            resetForm();
            fetchCustomerFDs(searchResult.customer_id);
            fetchMaturingFDs();
            
            setTimeout(() => {
                setShowModal(false);
                setFormSuccess('');
            }, 2000);
        } catch (error) {
            setFormError(error.response?.data?.message || 'Failed to create FD');
        } finally {
            setLoading(false);
        }
    };

    const handleViewFD = async (fdId) => {
        try {
            const response = await fdAPI.getInvestmentById(fdId);
            setSelectedFD(response.data.fd);
            
            // Fetch interest history
            const interestResponse = await fdAPI.getInterestHistory(fdId);
            setInterestHistory(interestResponse.data.interest_history || []);
            
            setShowDetailModal(true);
        } catch (error) {
            console.error('Error fetching FD details:', error);
            alert('Failed to load FD details');
        }
    };

    const handleRenewFD = async () => {
        setFormError('');
        setFormSuccess('');
        setLoading(true);

        try {
            const data = {
                renew_option: renewData.renew_option
            };
            
            if (renewData.renew_option === 'different_plan' && renewData.new_plan_id) {
                data.new_plan_id = parseInt(renewData.new_plan_id);
            }

            await fdAPI.renew(selectedFD.fd_id, data);
            
            setFormSuccess('FD renewed successfully!');
            fetchCustomerFDs(searchResult?.customer_id);
            fetchMaturingFDs();
            
            setTimeout(() => {
                setShowRenewModal(false);
                setShowDetailModal(false);
                setFormSuccess('');
                setSelectedFD(null);
            }, 2000);
        } catch (error) {
            setFormError(error.response?.data?.message || 'Failed to renew FD');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseEarly = async () => {
        if (!window.confirm('Are you sure you want to close this FD early? A penalty will apply.')) {
            return;
        }

        try {
            await fdAPI.closeEarly(selectedFD.fd_id, { reason: 'Early closure by customer request' });
            alert('FD closed early successfully');
            fetchCustomerFDs(searchResult?.customer_id);
            fetchMaturingFDs();
            setShowDetailModal(false);
            setSelectedFD(null);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to close FD');
        }
    };

    const formatCurrency = (amount) => {
        return `Rs. ${parseFloat(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Active</span>;
            case 'matured':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Matured</span>;
            case 'closed':
                return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Closed</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{status}</span>;
        }
    };

    const getDaysRemainingColor = (days) => {
        if (days <= 0) return 'text-red-600';
        if (days <= 7) return 'text-orange-600';
        return 'text-green-600';
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Fixed Deposits</h1>
                {canCreateFD && (
                    <button
                        onClick={() => {
                            resetForm();
                            setShowModal(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        + New Fixed Deposit
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="flex -mb-px space-x-8">
                    <button
                        onClick={() => setActiveTab('portfolio')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'portfolio'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        My Portfolio
                    </button>
                    <button
                        onClick={() => setActiveTab('maturing')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'maturing'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Maturing Soon
                        {maturingFDs.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                                {maturingFDs.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'plans'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        FD Plans
                    </button>
                </nav>
            </div>

            {/* Portfolio Tab */}
            {activeTab === 'portfolio' && (
                <div>
                    {/* Customer Search */}
                    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Find Customer Portfolio</h2>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder="Enter NIC (e.g., 123456789V)"
                                value={searchNIC}
                                onChange={(e) => setSearchNIC(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={searchCustomer}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            >
                                Search
                            </button>
                        </div>

                        {searchResult && (
                            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="font-semibold text-green-800">{searchResult.first_name} {searchResult.last_name}</p>
                                <p className="text-gray-600">NIC: {searchResult.nic}</p>
                                <p className="text-gray-600">Contact: {searchResult.contact_no_1}</p>
                            </div>
                        )}
                    </div>

                    {/* FD List */}
                    {searchResult && (
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-semibold">Fixed Deposit Portfolio</h2>
                            </div>

                            {loading ? (
                                <div className="p-6 text-center text-gray-500">Loading...</div>
                            ) : fds.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">No fixed deposits found</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FD ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Rate</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maturity Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {fds.map((fd) => (
                                                <tr key={fd.fd_id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        #{fd.fd_id}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {fd.fd_options}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        {formatCurrency(fd.fd_balance)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {fd.interest_rate}%
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {getStatusBadge(fd.fd_status)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <span className={getDaysRemainingColor(fd.days_remaining)}>
                                                            {formatDate(fd.maturity_date)}
                                                            {fd.days_remaining > 0 && ` (${fd.days_remaining} days)`}
                                                            {fd.days_remaining === 0 && ' (Today!)'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button
                                                            onClick={() => handleViewFD(fd.fd_id)}
                                                            className="text-blue-600 hover:text-blue-800"
                                                        >
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Maturing Soon Tab */}
            {activeTab === 'maturing' && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold">FDs Maturing in Next 30 Days</h2>
                    </div>

                    {maturingFDs.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No FDs maturing in the next 30 days</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FD ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maturity Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Left</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {maturingFDs.map((fd) => (
                                        <tr key={fd.fd_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                #{fd.fd_id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                Customer #{fd.customer_id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {fd.fd_options}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {formatCurrency(fd.fd_balance)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {formatDate(fd.maturity_date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <span className={getDaysRemainingColor(fd.days_remaining)}>
                                                    {fd.days_remaining} days
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* FD Plans Tab */}
            {activeTab === 'plans' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plans.map((plan) => (
                        <div key={plan.fd_plan_id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                                <h3 className="text-xl font-bold text-white">{plan.fd_options}</h3>
                            </div>
                            <div className="p-6">
                                <div className="mb-4">
                                    <p className="text-3xl font-bold text-blue-600">{plan.interest}%</p>
                                    <p className="text-sm text-gray-500">Interest Rate (p.a.)</p>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <p className="flex justify-between">
                                        <span className="text-gray-500">Minimum Amount:</span>
                                        <span className="font-semibold">{formatCurrency(plan.min_amount)}</span>
                                    </p>
                                    <p className="flex justify-between">
                                        <span className="text-gray-500">Early Withdrawal Penalty:</span>
                                        <span className="font-semibold text-red-600">{plan.penalty_rate}%</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create FD Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                            <h2 className="text-xl font-semibold">New Fixed Deposit</h2>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    resetForm();
                                }}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleCreateFD} className="p-6">
                            {formError && (
                                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                    {formError}
                                </div>
                            )}
                            {formSuccess && (
                                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                                    {formSuccess}
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="font-medium">{searchResult?.first_name} {searchResult?.last_name}</p>
                                    <p className="text-sm text-gray-500">NIC: {searchResult?.nic}</p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Account *</label>
                                <select
                                    name="account_id"
                                    value={formData.account_id}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select an account</option>
                                    {accounts.map(account => (
                                        <option key={account.account_id} value={account.account_id}>
                                            {account.account_number || `ACC-${account.account_id}`} - Balance: {formatCurrency(account.balance)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">FD Plan *</label>
                                <select
                                    name="fd_plan_id"
                                    value={formData.fd_plan_id}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select FD plan</option>
                                    {plans.map(plan => (
                                        <option key={plan.fd_plan_id} value={plan.fd_plan_id}>
                                            {plan.fd_options} - {plan.interest}% p.a. (Min: {formatCurrency(plan.min_amount)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">FD Amount *</label>
                                <input
                                    type="number"
                                    name="fd_balance"
                                    value={formData.fd_balance}
                                    onChange={handleInputChange}
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter amount"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="auto_renewal"
                                        checked={formData.auto_renewal}
                                        onChange={handleInputChange}
                                        className="mr-2"
                                    />
                                    <span className="text-sm text-gray-700">Auto-renew at maturity</span>
                                </label>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? 'Creating...' : 'Create FD'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* FD Details Modal */}
            {showDetailModal && selectedFD && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                            <h2 className="text-xl font-semibold">FD Details</h2>
                            <button
                                onClick={() => {
                                    setShowDetailModal(false);
                                    setSelectedFD(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">FD ID</p>
                                    <p className="font-semibold">#{selectedFD.fd_id}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Status</p>
                                    <p>{getStatusBadge(selectedFD.fd_status)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Principal Amount</p>
                                    <p className="font-semibold text-blue-600">{formatCurrency(selectedFD.fd_balance)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Total Interest Earned</p>
                                    <p className="font-semibold text-green-600">{formatCurrency(selectedFD.total_interest_earned || 0)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Total Value</p>
                                    <p className="font-semibold text-purple-600">{formatCurrency(selectedFD.total_value || selectedFD.fd_balance)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Plan Type</p>
                                    <p className="font-medium">{selectedFD.fd_options}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Interest Rate</p>
                                    <p className="font-medium">{selectedFD.interest_rate}% p.a.</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Penalty Rate</p>
                                    <p className="font-medium text-red-600">{selectedFD.penalty_rate}%</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Open Date</p>
                                    <p className="font-medium">{formatDate(selectedFD.open_date)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Maturity Date</p>
                                    <p className="font-medium">{formatDate(selectedFD.maturity_date)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Days Remaining</p>
                                    <p className={`font-medium ${getDaysRemainingColor(selectedFD.days_remaining)}`}>
                                        {selectedFD.days_remaining > 0 ? `${selectedFD.days_remaining} days` : 'Matured'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Auto Renewal</p>
                                    <p className="font-medium">{selectedFD.auto_renewal ? 'Yes' : 'No'}</p>
                                </div>
                            </div>

                            {/* Interest History */}
                            <div className="border-t border-gray-200 pt-4">
                                <h3 className="text-lg font-semibold mb-4">Interest History</h3>
                                {interestHistory.length === 0 ? (
                                    <p className="text-gray-500">No interest calculations yet</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Interest Amount</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Days in Period</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {interestHistory.map((record) => (
                                                    <tr key={record.fd_calculation_id}>
                                                        <td className="px-4 py-2 text-sm">{formatDate(record.calculation_date)}</td>
                                                        <td className="px-4 py-2 text-sm font-medium text-green-600">
                                                            {formatCurrency(record.interest_amount)}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm">{record.days_in_period} days</td>
                                                        <td className="px-4 py-2 text-sm">
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                                                {record.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {selectedFD.fd_status === 'active' && selectedFD.days_remaining <= 0 && (
                                <div className="mt-6 flex gap-3">
                                    <button
                                        onClick={() => setShowRenewModal(true)}
                                        className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                                    >
                                        Renew FD
                                    </button>
                                </div>
                            )}
                            {selectedFD.fd_status === 'active' && selectedFD.days_remaining > 0 && (
                                <div className="mt-6">
                                    <button
                                        onClick={handleCloseEarly}
                                        className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                                    >
                                        Close Early (Penalty: {selectedFD.penalty_rate}%)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Renew FD Modal */}
            {showRenewModal && selectedFD && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Renew Fixed Deposit</h2>
                            <button
                                onClick={() => {
                                    setShowRenewModal(false);
                                    setRenewData({ renew_option: 'same_plan', new_plan_id: '' });
                                }}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6">
                            {formError && (
                                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                    {formError}
                                </div>
                            )}
                            {formSuccess && (
                                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                                    {formSuccess}
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Renewal Option</label>
                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="renew_option"
                                            value="withdraw"
                                            checked={renewData.renew_option === 'withdraw'}
                                            onChange={(e) => setRenewData({ ...renewData, renew_option: e.target.value })}
                                            className="mr-2"
                                        />
                                        <span>Withdraw (Cash out principal + interest)</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="renew_option"
                                            value="same_plan"
                                            checked={renewData.renew_option === 'same_plan'}
                                            onChange={(e) => setRenewData({ ...renewData, renew_option: e.target.value })}
                                            className="mr-2"
                                        />
                                        <span>Renew with same plan</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="renew_option"
                                            value="different_plan"
                                            checked={renewData.renew_option === 'different_plan'}
                                            onChange={(e) => setRenewData({ ...renewData, renew_option: e.target.value })}
                                            className="mr-2"
                                        />
                                        <span>Renew with different plan</span>
                                    </label>
                                </div>
                            </div>

                            {renewData.renew_option === 'different_plan' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select New Plan</label>
                                    <select
                                        value={renewData.new_plan_id}
                                        onChange={(e) => setRenewData({ ...renewData, new_plan_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select plan</option>
                                        {plans.filter(p => p.fd_plan_id !== selectedFD.fd_plan_id).map(plan => (
                                            <option key={plan.fd_plan_id} value={plan.fd_plan_id}>
                                                {plan.fd_options} - {plan.interest}% p.a.
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">Current FD Value: <span className="font-semibold">{formatCurrency(selectedFD.total_value || selectedFD.fd_balance)}</span></p>
                            </div>

                            <button
                                onClick={handleRenewFD}
                                disabled={loading || (renewData.renew_option === 'different_plan' && !renewData.new_plan_id)}
                                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FixedDeposits;
