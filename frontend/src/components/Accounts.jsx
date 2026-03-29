import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { accountAPI, customerAPI } from '../services/api';

const Accounts = () => {
    const { hasRole, user } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showJointModal, setShowJointModal] = useState(false);
    const [formData, setFormData] = useState({
        customer_id: '',
        joint_holder_ids: [],
        branch_id: '',
        saving_plan_id: '',
        initial_deposit: '',
        open_date: new Date().toISOString().split('T')[0]
    });
    const [jointCustomerId, setJointCustomerId] = useState('');
    const [customers, setCustomers] = useState([]);
    const [savingPlans, setSavingPlans] = useState([]);
    const [branches, setBranches] = useState([]);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        branch_id: ''
    });
    const [jointSearch, setJointSearch] = useState('');
    const [jointSearchResult, setJointSearchResult] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerBranchFilter, setCustomerBranchFilter] = useState('');
    const [accountType, setAccountType] = useState('single');
    const [searchNIC, setSearchNIC] = useState('');
    const [nicSearchLoading, setNicSearchLoading] = useState(false);
    const [nicSearchResult, setNicSearchResult] = useState(null);
    const [searchAccountNumber, setSearchAccountNumber] = useState('');
    const [accountSearchLoading, setAccountSearchLoading] = useState(false);
    const [accountSearchResult, setAccountSearchResult] = useState(null);
    const [searchError, setSearchError] = useState('');
    const [updateSearchAccountNumber, setUpdateSearchAccountNumber] = useState('');
    const [updateLoading, setUpdateLoading] = useState(false);
    const [updateTargetAccount, setUpdateTargetAccount] = useState(null);
    const [updateForm, setUpdateForm] = useState({
        saving_plan_id: '',
        status: 'active',
        holder_ids: []
    });

    const canViewAll = hasRole(['Manager']);
    const canCreate = hasRole(['Agent']);

    // Load data on mount
    useEffect(() => {
        fetchAccounts();
        fetchReferenceData();
    }, [filters]);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            let response;
            if (canViewAll) {
                const params = {};
                if (filters.status) params.status = filters.status;
                if (filters.branch_id) params.branch_id = filters.branch_id;
                response = await accountAPI.getAll(params);
            } else {
                // For agents, get accounts they have access to (by customer search)
                response = { data: { accounts: [] } };
            }
            setAccounts(response.data.accounts || []);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReferenceData = async () => {
        try {
            setFormError(''); // Clear previous errors
            const [customersRes, plansRes, branchesRes] = await Promise.all([
                customerAPI.getAll(),
                accountAPI.getSavingPlans(),
                accountAPI.getBranches()
            ]);

            setCustomers(customersRes.data.customers || []);

            // Parse saving plans - handle multiple response formats
            const plansData = plansRes.data?.plans || [];
            if (plansData.length > 0) {
                setSavingPlans(plansData);
            } else {
                console.warn('No saving plans loaded from API');
                setSavingPlans([]);
            }

            // Parse branches - handle multiple response formats
            const branchesData = branchesRes.data?.branches || branchesRes.data || [];
            setBranches(branchesData.length > 0 ? branchesData : []);
        } catch (error) {
            console.error('Error fetching reference data:', error);
            setFormError('Failed to load data. Please refresh the page.');
            setSavingPlans([]);
            setBranches([]);
        }
    };

    const resetForm = () => {
        setFormData({
            customer_id: '',
            joint_holder_ids: [],
            branch_id: '',
            saving_plan_id: '',
            initial_deposit: '',
            open_date: new Date().toISOString().split('T')[0]
        });
        setCustomerSearch('');
        setCustomerBranchFilter('');
        setAccountType('single');
        setFormError('');
        setFormSuccess('');
    };

    const handleInputChange = (e) => {
        if (e.target.name === 'customer_id') {
            const selectedCustomer = customers.find(
                (customer) => customer.customer_id === Number(e.target.value)
            );

            setFormData({
                ...formData,
                customer_id: e.target.value,
                branch_id: selectedCustomer?.branch_id ? String(selectedCustomer.branch_id) : ''
            });
            return;
        }

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const searchableCustomers = customers.filter((customer) => {
        if (!customerSearch.trim()) {
            return true;
        }

        const keyword = customerSearch.toLowerCase();
        const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
        return fullName.includes(keyword) || (customer.nic || '').toLowerCase().includes(keyword);
    });

    const branchFilteredCustomers = searchableCustomers.filter((customer) => {
        if (!customerBranchFilter) {
            return true;
        }

        return String(customer.branch_name || '').toLowerCase() === String(customerBranchFilter).toLowerCase();
    });

    // If branch filter yields nothing, fall back to search-only so customer selection never gets stuck.
    const filteredCustomers = branchFilteredCustomers.length > 0
        ? branchFilteredCustomers
        : searchableCustomers;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        // Validation
        if (!savingPlans || savingPlans.length === 0) {
            setFormError('Saving plans not loaded. Please refresh the page.');
            return;
        }

        if (!formData.customer_id || !formData.branch_id || 
            !formData.saving_plan_id || !formData.initial_deposit) {
            setFormError('All required fields must be filled');
            return;
        }

        if (parseFloat(formData.initial_deposit) < 0) {
            setFormError('Initial deposit cannot be negative');
            return;
        }

        if (accountType === 'joint' && formData.joint_holder_ids.length === 0) {
            setFormError('Select at least one joint holder for a joint account');
            return;
        }

        try {
            const response = await accountAPI.create({
                customer_id: parseInt(formData.customer_id),
                joint_holder_ids: accountType === 'joint'
                    ? formData.joint_holder_ids.map(id => parseInt(id))
                    : [],
                branch_id: parseInt(formData.branch_id),
                saving_plan_id: parseInt(formData.saving_plan_id),
                initial_deposit: parseFloat(formData.initial_deposit),
                open_date: formData.open_date
            });

            setFormSuccess('Account created successfully!');
            resetForm();
            fetchAccounts();
            
            setTimeout(() => {
                setShowModal(false);
                setFormSuccess('');
            }, 2000);
            
        } catch (error) {
            setFormError(error.response?.data?.message || 'Failed to create account');
        }
    };

    const handleSearchByNIC = async () => {
        const nic = searchNIC.trim();
        if (!nic) {
            setSearchError('Enter a NIC to search accounts');
            setNicSearchResult(null);
            return;
        }

        try {
            setSearchError('');
            setNicSearchLoading(true);
            const customerRes = await customerAPI.getByNIC(nic);
            const customer = customerRes.data?.customer;

            if (!customer?.customer_id) {
                setNicSearchResult(null);
                setSearchError('Customer not found for this NIC');
                return;
            }

            const accountsRes = await accountAPI.getByCustomerId(customer.customer_id);
            setNicSearchResult({
                customer,
                accounts: accountsRes.data?.accounts || []
            });
        } catch (error) {
            setNicSearchResult(null);
            setSearchError(error.response?.data?.message || 'Failed to search by NIC');
        } finally {
            setNicSearchLoading(false);
        }
    };

    const handleSearchByAccountNumber = async () => {
        const accountNo = searchAccountNumber.trim();
        if (!accountNo) {
            setSearchError('Enter an account number to search');
            setAccountSearchResult(null);
            return;
        }

        try {
            setSearchError('');
            setAccountSearchLoading(true);
            const response = await accountAPI.getByAccountNumber(accountNo);
            setAccountSearchResult(response.data?.account || null);
        } catch (error) {
            setAccountSearchResult(null);
            setSearchError(error.response?.data?.message || 'Failed to search by account number');
        } finally {
            setAccountSearchLoading(false);
        }
    };

    const toggleCreateJointHolder = (customerId) => {
        const id = String(customerId);
        setFormData((prev) => {
            const exists = prev.joint_holder_ids.includes(id);
            return {
                ...prev,
                joint_holder_ids: exists
                    ? prev.joint_holder_ids.filter((holderId) => holderId !== id)
                    : [...prev.joint_holder_ids, id]
            };
        });
    };

    const toggleUpdateHolder = (customerId) => {
        const id = String(customerId);
        setUpdateForm((prev) => {
            const exists = prev.holder_ids.includes(id);
            return {
                ...prev,
                holder_ids: exists
                    ? prev.holder_ids.filter((holderId) => holderId !== id)
                    : [...prev.holder_ids, id]
            };
        });
    };

    const loadAccountForUpdate = async () => {
        const accountNo = updateSearchAccountNumber.trim();
        if (!accountNo) {
            setFormError('Enter account number to load account for update');
            return;
        }

        try {
            setFormError('');
            setUpdateLoading(true);
            const response = await accountAPI.getByAccountNumber(accountNo);
            const account = response.data?.account;

            if (!account) {
                setFormError('Account not found');
                setUpdateTargetAccount(null);
                return;
            }

            setUpdateTargetAccount(account);
            setUpdateForm({
                saving_plan_id: String(account.saving_plan_id || ''),
                status: account.account_status === 'closed' ? 'inactive' : 'active',
                holder_ids: (account.holders || []).map((holder) => String(holder.customer_id))
            });
        } catch (error) {
            setUpdateTargetAccount(null);
            setFormError(error.response?.data?.message || 'Failed to load account');
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleUpdateAccount = async (e) => {
        e.preventDefault();
        if (!updateTargetAccount?.account_id) {
            setFormError('Load an account first');
            return;
        }

        if (!updateForm.saving_plan_id) {
            setFormError('Saving plan is required');
            return;
        }

        if (!updateForm.holder_ids || updateForm.holder_ids.length === 0) {
            setFormError('At least one holder is required');
            return;
        }

        try {
            setFormError('');
            setFormSuccess('');

            const payload = {
                saving_plan_id: Number(updateForm.saving_plan_id),
                status: updateForm.status,
                holder_ids: updateForm.holder_ids.map((id) => Number(id))
            };

            const response = await accountAPI.manage(updateTargetAccount.account_id, payload);
            setFormSuccess('Account updated successfully');
            setUpdateTargetAccount(response.data?.account || null);

            fetchAccounts();
        } catch (error) {
            setFormError(error.response?.data?.message || 'Failed to update account');
        }
    };

    const handleViewAccount = async (accountId) => {
        try {
            const response = await accountAPI.getById(accountId);
            setSelectedAccount(response.data.account);
            setShowDetailModal(true);
        } catch (error) {
            console.error('Error fetching account details:', error);
            alert('Failed to load account details');
        }
    };

    const handleCloseAccount = async (accountId, currentBalance) => {
        if (currentBalance > 0) {
            alert('Cannot close account with positive balance. Please withdraw all funds first.');
            return;
        }
        
        if (!window.confirm('Are you sure you want to close this account?')) {
            return;
        }

        try {
            await accountAPI.updateStatus(accountId, 'closed');
            fetchAccounts();
            alert('Account closed successfully');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to close account');
        }
    };

    const handleActivateAccount = async (accountId) => {
        if (!window.confirm('Are you sure you want to activate this account?')) {
            return;
        }

        try {
            await accountAPI.updateStatus(accountId, 'active');
            fetchAccounts();
            alert('Account activated successfully');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to activate account');
        }
    };

    const handleAddJointHolder = async () => {
        if (!selectedAccount) return;
        
        if (!jointCustomerId) {
            setFormError('Please enter a customer ID');
            return;
        }

        try {
            await accountAPI.addJointHolder(selectedAccount.account_id, parseInt(jointCustomerId));
            setFormSuccess('Joint holder added successfully!');
            setJointCustomerId('');
            setJointSearchResult(null);
            
            // Refresh account details
            const response = await accountAPI.getById(selectedAccount.account_id);
            setSelectedAccount(response.data.account);
            
            setTimeout(() => {
                setShowJointModal(false);
                setFormSuccess('');
            }, 2000);
            
        } catch (error) {
            setFormError(error.response?.data?.message || 'Failed to add joint holder');
        }
    };

    const searchCustomerForJoint = async () => {
        if (!jointSearch.trim()) {
            setJointSearchResult(null);
            return;
        }

        try {
            const response = await customerAPI.getByNIC(jointSearch);
            setJointSearchResult(response.data.customer);
            setJointCustomerId(response.data.customer.customer_id);
            setFormError('');
        } catch (error) {
            setJointSearchResult(null);
            setFormError('Customer not found with this NIC');
        }
    };

    const formatCurrency = (amount) => {
        return `Rs. ${parseFloat(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getAccountTypeLabel = (account) => {
        if (account?.account_type) {
            return account.account_type;
        }

        return Number(account?.holder_count || 1) > 1 ? 'Joint' : 'Single';
    };

    const getStatusBadge = (status) => {
        if (status === 'active') {
            return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Active</span>;
        }
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Closed</span>;
    };

    return (
        <div className="p-6">
            {/* Account Search Tools */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <h2 className="text-lg font-semibold mb-4">Search Accounts</h2>

                {searchError && (
                    <div className="mb-3 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
                        {searchError}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border border-gray-200 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search by Customer NIC</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchNIC}
                                onChange={(e) => setSearchNIC(e.target.value)}
                                placeholder="Enter NIC"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleSearchByNIC}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                {nicSearchLoading ? 'Searching...' : 'Search'}
                            </button>
                        </div>

                        {nicSearchResult && (
                            <div className="mt-3 text-sm text-gray-700">
                                <p className="font-medium">
                                    {nicSearchResult.customer.first_name} {nicSearchResult.customer.last_name} ({nicSearchResult.customer.nic})
                                </p>
                                <p className="text-gray-600">Branch: {nicSearchResult.customer.branch_name || 'Not assigned'}</p>
                                <p className="mt-1">Accounts found: {nicSearchResult.accounts.length}</p>
                                {nicSearchResult.accounts.length > 0 && (
                                    <ul className="mt-2 space-y-1">
                                        {nicSearchResult.accounts.map((acc) => (
                                            <li key={acc.account_id} className="text-gray-600">
                                                {(acc.account_number || String(acc.account_id))} | {getAccountTypeLabel(acc)} | {acc.plan_type || '-'} | {formatCurrency(acc.balance)} | {acc.account_status}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-3 border border-gray-200 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search by Account Number</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchAccountNumber}
                                onChange={(e) => setSearchAccountNumber(e.target.value)}
                                placeholder="Enter account number"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleSearchByAccountNumber}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                                {accountSearchLoading ? 'Searching...' : 'Search'}
                            </button>
                        </div>

                        {accountSearchResult && (
                            <div className="mt-3 text-sm text-gray-700">
                                <p><span className="font-medium">Account:</span> {accountSearchResult.account_number || String(accountSearchResult.account_id)}</p>
                                <p><span className="font-medium">Type:</span> {getAccountTypeLabel(accountSearchResult)}</p>
                                <p><span className="font-medium">Branch:</span> {accountSearchResult.branch_name || '-'}</p>
                                <p><span className="font-medium">Plan:</span> {accountSearchResult.plan_type || '-'}</p>
                                <p><span className="font-medium">Status:</span> {accountSearchResult.account_status}</p>
                                <p><span className="font-medium">Balance:</span> {formatCurrency(accountSearchResult.balance)}</p>
                                <div className="mt-2">
                                    <p className="font-medium">Account Holders:</p>
                                    {accountSearchResult.holders?.length > 0 ? (
                                        <ul className="mt-1 space-y-1">
                                            {accountSearchResult.holders.map((holder) => (
                                                <li key={holder.customer_id} className="text-gray-600">
                                                    {holder.first_name} {holder.last_name} ({holder.nic})
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-600">No holders found</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                {canCreate && (
                    <div className="flex flex-col items-end gap-2">
                        <button
                            onClick={() => {
                                resetForm();
                                setShowModal(true);
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            + Open New Account
                        </button>
                        <button
                            onClick={() => {
                                setFormError('');
                                setFormSuccess('');
                                setUpdateSearchAccountNumber('');
                                setUpdateTargetAccount(null);
                                setShowUpdateModal(true);
                            }}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Update Existing Account
                        </button>
                    </div>
                )}
            </div>

            {/* Filters (Manager/Admin only) */}
            {canViewAll && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All</option>
                                <option value="active">Active</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                            <select
                                value={filters.branch_id}
                                onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Branches</option>
                                {branches.map(branch => (
                                    <option key={branch.branch_id} value={branch.branch_id}>
                                        {branch.branch_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => setFilters({ status: '', branch_id: '' })}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Accounts Table (Manager only) */}
            {canViewAll && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold">All Accounts</h2>
                    </div>

                    {loading ? (
                        <div className="p-6 text-center text-gray-500">Loading...</div>
                    ) : accounts.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No accounts found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account No.</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holders</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {accounts.map((account) => (
                                        <tr key={account.account_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                {account.account_number || String(account.account_id)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {getAccountTypeLabel(account)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {formatCurrency(account.balance)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(account.account_status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {account.branch_name || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {account.plan_type || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {account.holder_count || 1}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleViewAccount(account.account_id)}
                                                    className="text-blue-600 hover:text-blue-800 mr-3"
                                                >
                                                    View
                                                </button>
                                                {account.account_status === 'active' && canCreate && (
                                                    <button
                                                        onClick={() => handleCloseAccount(account.account_id, account.balance)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        Close
                                                    </button>
                                                )}
                                                {account.account_status === 'closed' && canCreate && (
                                                    <button
                                                        onClick={() => handleActivateAccount(account.account_id)}
                                                        className="text-green-600 hover:text-green-800"
                                                    >
                                                        Activate
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Create Account Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                            <h2 className="text-xl font-semibold">Open New Account</h2>
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

                        <form onSubmit={handleSubmit} className="p-6">
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Account Type *</label>
                                <div className="flex gap-6">
                                    <label className="inline-flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="account_type"
                                            value="single"
                                            checked={accountType === 'single'}
                                            onChange={() => {
                                                setAccountType('single');
                                                setFormData((prev) => ({ ...prev, joint_holder_ids: [] }));
                                            }}
                                        />
                                        <span>Single Account</span>
                                    </label>
                                    <label className="inline-flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="account_type"
                                            value="joint"
                                            checked={accountType === 'joint'}
                                            onChange={() => setAccountType('joint')}
                                        />
                                        <span>Joint Account</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={customerSearch}
                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                            placeholder="Search by name or NIC"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <select
                                            value={customerBranchFilter}
                                            onChange={(e) => setCustomerBranchFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">All Branches</option>
                                            {branches.map((branch) => (
                                                <option key={branch.branch_id} value={branch.branch_name}>
                                                    {branch.branch_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {customerBranchFilter && branchFilteredCustomers.length === 0 && (
                                        <p className="text-xs text-amber-600 mb-2">
                                            No customers found in selected branch. Showing all matching customers.
                                        </p>
                                    )}
                                    <select
                                        name="customer_id"
                                        value={formData.customer_id}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Select Customer</option>
                                        {filteredCustomers.map(customer => (
                                            <option key={customer.customer_id} value={customer.customer_id}>
                                                {customer.first_name} {customer.last_name} - {customer.nic} ({customer.branch_name || 'No Branch'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                                    <select
                                        name="branch_id"
                                        value={formData.branch_id}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={!!formData.customer_id}
                                        required
                                    >
                                        <option value="">Select Branch</option>
                                        {branches.map(branch => (
                                            <option key={branch.branch_id} value={branch.branch_id}>
                                                {branch.branch_name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Branch is locked to the selected customer's registered branch.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Saving Plan *</label>
                                    <select
                                        name="saving_plan_id"
                                        value={formData.saving_plan_id}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Select Plan</option>
                                        {savingPlans.map(plan => (
                                            <option key={plan.saving_plan_id} value={plan.saving_plan_id}>
                                                {plan.plan_type} - {plan.interest}% (Min: {formatCurrency(plan.min_balance)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Initial Deposit *</label>
                                    <input
                                        type="number"
                                        name="initial_deposit"
                                        value={formData.initial_deposit}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Joint Holders (Optional)</label>
                                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2 bg-white">
                                    {customers
                                        .filter(c => c.customer_id !== parseInt(formData.customer_id) && (!formData.branch_id || String(c.branch_id) === String(formData.branch_id)))
                                        .map((customer) => {
                                            const id = String(customer.customer_id);
                                            return (
                                                <label key={customer.customer_id} className="flex items-center gap-2 text-sm text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.joint_holder_ids.includes(id)}
                                                        onChange={() => toggleCreateJointHolder(customer.customer_id)}
                                                        disabled={accountType !== 'joint'}
                                                    />
                                                    <span>{customer.first_name} {customer.last_name} - {customer.nic}</span>
                                                </label>
                                            );
                                        })}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {accountType === 'joint'
                                        ? 'Tick multiple customers to create a joint account'
                                        : 'Switch to Joint Account to select additional holders'}
                                </p>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Open Date</label>
                                <input
                                    type="date"
                                    name="open_date"
                                    value={formData.open_date}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
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
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Account Details Modal */}
            {showDetailModal && selectedAccount && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                            <h2 className="text-xl font-semibold">Account Details</h2>
                            <button
                                onClick={() => {
                                    setShowDetailModal(false);
                                    setSelectedAccount(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Account Number</p>
                                    <p className="font-semibold text-lg">{selectedAccount.account_number || String(selectedAccount.account_id)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Account Type</p>
                                    <p className="font-medium">{getAccountTypeLabel(selectedAccount)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Balance</p>
                                    <p className="font-semibold text-2xl text-blue-600">{formatCurrency(selectedAccount.balance)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Status</p>
                                    <p>{getStatusBadge(selectedAccount.account_status)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Branch</p>
                                    <p className="font-medium">{selectedAccount.branch_name || '-'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Plan Type</p>
                                    <p className="font-medium">{selectedAccount.plan_type || '-'} ({selectedAccount.interest_rate}%)</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Minimum Balance</p>
                                    <p className="font-medium">{formatCurrency(selectedAccount.min_balance || 0)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Open Date</p>
                                    <p className="font-medium">{new Date(selectedAccount.open_date).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Created At</p>
                                    <p className="font-medium">{new Date(selectedAccount.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">Account Holders</h3>
                                    {selectedAccount.account_status === 'active' && (
                                        <button
                                            onClick={() => setShowJointModal(true)}
                                            className="text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            + Add Joint Holder
                                        </button>
                                    )}
                                </div>
                                {selectedAccount.holders && selectedAccount.holders.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedAccount.holders.map((holder, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <p className="font-medium">{holder.first_name} {holder.last_name}</p>
                                                    <p className="text-sm text-gray-500">NIC: {holder.nic}</p>
                                                </div>
                                                {index === 0 && (
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Primary</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500">No holders found</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Update Existing Account Modal */}
            {showUpdateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                            <h2 className="text-xl font-semibold">Update Existing Account</h2>
                            <button
                                onClick={() => {
                                    setShowUpdateModal(false);
                                    setUpdateTargetAccount(null);
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={updateSearchAccountNumber}
                                        onChange={(e) => setUpdateSearchAccountNumber(e.target.value)}
                                        placeholder="Enter account number"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={loadAccountForUpdate}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                        {updateLoading ? 'Loading...' : 'Load'}
                                    </button>
                                </div>
                            </div>

                            {updateTargetAccount && (
                                <form onSubmit={handleUpdateAccount}>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-sm text-gray-500">Account Number</p>
                                            <p className="font-semibold">{updateTargetAccount.account_number || String(updateTargetAccount.account_id)}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-sm text-gray-500">Current Type</p>
                                            <p className="font-semibold">{getAccountTypeLabel(updateTargetAccount)}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Saving Plan</label>
                                            <select
                                                value={updateForm.saving_plan_id}
                                                onChange={(e) => setUpdateForm({ ...updateForm, saving_plan_id: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                required
                                            >
                                                <option value="">Select Plan</option>
                                                {savingPlans.map((plan) => (
                                                    <option key={plan.saving_plan_id} value={plan.saving_plan_id}>
                                                        {plan.plan_type} - {plan.interest}%
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                            <select
                                                value={updateForm.status}
                                                onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Holders (Single/Joint)</label>
                                        <div className="max-h-56 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2 bg-white">
                                            {customers
                                                .filter((customer) => String(customer.branch_id) === String(updateTargetAccount.branch_id))
                                                .map((customer) => {
                                                    const id = String(customer.customer_id);
                                                    return (
                                                        <label key={customer.customer_id} className="flex items-center gap-2 text-sm text-gray-700">
                                                            <input
                                                                type="checkbox"
                                                                checked={updateForm.holder_ids.includes(id)}
                                                                onChange={() => toggleUpdateHolder(customer.customer_id)}
                                                            />
                                                            <span>{customer.first_name} {customer.last_name} - {customer.nic}</span>
                                                        </label>
                                                    );
                                                })}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Select one holder for Single account, multiple holders for Joint account.</p>
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowUpdateModal(false);
                                                setUpdateTargetAccount(null);
                                            }}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Joint Holder Modal */}
            {showJointModal && selectedAccount && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Add Joint Holder</h2>
                            <button
                                onClick={() => {
                                    setShowJointModal(false);
                                    setJointCustomerId('');
                                    setJointSearch('');
                                    setJointSearchResult(null);
                                    setFormError('');
                                }}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6">
                            {formError && (
                                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                                    {formError}
                                </div>
                            )}
                            {formSuccess && (
                                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
                                    {formSuccess}
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Search by NIC</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={jointSearch}
                                        onChange={(e) => setJointSearch(e.target.value)}
                                        placeholder="Enter NIC (e.g., 123456789V)"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={searchCustomerForJoint}
                                        className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700"
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>

                            {jointSearchResult && (
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="font-semibold text-green-800">Customer Found:</p>
                                    <p className="text-gray-700">{jointSearchResult.first_name} {jointSearchResult.last_name}</p>
                                    <p className="text-sm text-gray-500">NIC: {jointSearchResult.nic}</p>
                                </div>
                            )}

                            <button
                                onClick={handleAddJointHolder}
                                disabled={!jointCustomerId}
                                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add as Joint Holder
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Accounts;