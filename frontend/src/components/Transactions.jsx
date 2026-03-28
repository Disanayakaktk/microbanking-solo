import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { transactionAPI, accountAPI, customerAPI } from '../services/api';

const Transactions = () => {
    const { hasRole, user } = useAuth();
    const [activeTab, setActiveTab] = useState('deposit');
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [transactionHistory, setTransactionHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [formData, setFormData] = useState({
        account_id: '',
        amount: '',
        description: '',
        to_account_id: '',
        from_account_id: ''
    });
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [searchNIC, setSearchNIC] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [balance, setBalance] = useState(null);
    const [pagination, setPagination] = useState({ limit: 20, offset: 0, total: 0 });

    const canPerformTransactions = hasRole(['Agent', 'Manager', 'Admin']);

    // Load accounts when a customer is selected
    useEffect(() => {
        if (searchResult) {
            fetchCustomerAccounts(searchResult.customer_id);
        }
    }, [searchResult]);

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
            return;
        }

        try {
            const response = await customerAPI.getByNIC(searchNIC);
            setSearchResult(response.data.customer);
            setFormError('');
        } catch (error) {
            setSearchResult(null);
            setAccounts([]);
            setFormError('Customer not found with this NIC');
        }
    };

    const handleAccountSelect = async (accountId) => {
        setFormData({ ...formData, account_id: accountId });
        setSelectedAccount(accounts.find(acc => acc.account_id === parseInt(accountId)));
        
        // Fetch balance
        try {
            const response = await accountAPI.getBalance(accountId);
            setBalance(response.data.balance);
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
        
        // Fetch transaction history
        fetchTransactionHistory(accountId);
    };

    const fetchTransactionHistory = async (accountId, resetOffset = true) => {
        try {
            setHistoryLoading(true);
            const offset = resetOffset ? 0 : pagination.offset;
            const response = await transactionAPI.getAccountTransactions(accountId, pagination.limit, offset);
            setTransactionHistory(response.data.transactions || []);
            setPagination({
                ...pagination,
                total: response.data.summary?.transaction_count || 0,
                offset: offset
            });
        } catch (error) {
            console.error('Error fetching transaction history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const loadMore = () => {
        const newOffset = pagination.offset + pagination.limit;
        if (newOffset < pagination.total) {
            fetchTransactionHistory(formData.account_id, false);
        }
    };

    const loadLess = () => {
        const newOffset = Math.max(0, pagination.offset - pagination.limit);
        if (newOffset < pagination.offset) {
            fetchTransactionHistory(formData.account_id, false);
        }
    };

    const resetForm = () => {
        setFormData({
            account_id: '',
            amount: '',
            description: '',
            to_account_id: '',
            from_account_id: ''
        });
        setFormError('');
        setFormSuccess('');
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleDeposit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        setLoading(true);

        // Validation
        if (!formData.account_id) {
            setFormError('Please select an account');
            setLoading(false);
            return;
        }

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setFormError('Please enter a valid amount greater than 0');
            setLoading(false);
            return;
        }

        if (parseFloat(formData.amount) > 1000000) {
            setFormError('Maximum deposit amount is Rs. 1,000,000');
            setLoading(false);
            return;
        }

        try {
            await transactionAPI.deposit({
                account_id: parseInt(formData.account_id),
                amount: parseFloat(formData.amount),
                description: formData.description || 'Cash deposit'
            });

            setFormSuccess(`Successfully deposited Rs. ${parseFloat(formData.amount).toLocaleString()}`);
            resetForm();
            
            // Refresh balance and history
            if (formData.account_id) {
                const balanceResponse = await accountAPI.getBalance(formData.account_id);
                setBalance(balanceResponse.data.balance);
                fetchTransactionHistory(formData.account_id);
            }
        } catch (error) {
            setFormError(error.response?.data?.message || 'Deposit failed');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        setLoading(true);

        // Validation
        if (!formData.account_id) {
            setFormError('Please select an account');
            setLoading(false);
            return;
        }

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setFormError('Please enter a valid amount greater than 0');
            setLoading(false);
            return;
        }

        if (parseFloat(formData.amount) > 500000) {
            setFormError('Maximum withdrawal amount is Rs. 500,000');
            setLoading(false);
            return;
        }

        try {
            await transactionAPI.withdraw({
                account_id: parseInt(formData.account_id),
                amount: parseFloat(formData.amount),
                description: formData.description || 'Cash withdrawal'
            });

            setFormSuccess(`Successfully withdrew Rs. ${parseFloat(formData.amount).toLocaleString()}`);
            resetForm();
            
            // Refresh balance and history
            if (formData.account_id) {
                const balanceResponse = await accountAPI.getBalance(formData.account_id);
                setBalance(balanceResponse.data.balance);
                fetchTransactionHistory(formData.account_id);
            }
        } catch (error) {
            setFormError(error.response?.data?.message || 'Withdrawal failed');
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        setLoading(true);

        // Validation
        if (!formData.from_account_id) {
            setFormError('Please select source account');
            setLoading(false);
            return;
        }

        if (!formData.to_account_id) {
            setFormError('Please select destination account');
            setLoading(false);
            return;
        }

        if (formData.from_account_id === formData.to_account_id) {
            setFormError('Cannot transfer to the same account');
            setLoading(false);
            return;
        }

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setFormError('Please enter a valid amount greater than 0');
            setLoading(false);
            return;
        }

        if (parseFloat(formData.amount) > 500000) {
            setFormError('Maximum transfer amount is Rs. 500,000');
            setLoading(false);
            return;
        }

        try {
            await transactionAPI.transfer({
                from_account_id: parseInt(formData.from_account_id),
                to_account_id: parseInt(formData.to_account_id),
                amount: parseFloat(formData.amount),
                description: formData.description || 'Transfer between accounts'
            });

            setFormSuccess(`Successfully transferred Rs. ${parseFloat(formData.amount).toLocaleString()}`);
            resetForm();
            
            // Refresh balance for source account
            if (formData.from_account_id) {
                const balanceResponse = await accountAPI.getBalance(formData.from_account_id);
                setBalance(balanceResponse.data.balance);
                fetchTransactionHistory(formData.from_account_id);
            }
        } catch (error) {
            setFormError(error.response?.data?.message || 'Transfer failed');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return `Rs. ${parseFloat(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const getTransactionTypeColor = (type) => {
        switch (type) {
            case 'Deposit':
                return 'text-green-600 bg-green-50';
            case 'Withdrawal':
                return 'text-red-600 bg-red-50';
            case 'Transfer':
                return 'text-blue-600 bg-blue-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Transactions</h1>

            {/* Customer Search */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <h2 className="text-lg font-semibold mb-4">Find Customer Account</h2>
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
                        <p className="font-semibold text-green-800">Customer: {searchResult.first_name} {searchResult.last_name}</p>
                        <p className="text-gray-600">NIC: {searchResult.nic}</p>
                        <p className="text-gray-600">Contact: {searchResult.contact_no_1}</p>
                    </div>
                )}
            </div>

            {/* Account Selection */}
            {searchResult && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Select Account</h2>
                    {accounts.length === 0 ? (
                        <p className="text-gray-500">No accounts found for this customer</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {accounts.map((account) => (
                                <div
                                    key={account.account_id}
                                    onClick={() => handleAccountSelect(account.account_id)}
                                    className={`p-4 border rounded-lg cursor-pointer transition ${
                                        selectedAccount?.account_id === account.account_id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <p className="font-semibold">Account: {account.account_number || `ACC-${account.account_id}`}</p>
                                    <p className="text-2xl font-bold text-blue-600 mt-2">
                                        {formatCurrency(account.balance)}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Status: {account.account_status === 'active' ? 'Active' : 'Closed'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Balance Display */}
            {selectedAccount && balance !== null && (
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-md p-6 mb-6 text-white">
                    <p className="text-sm opacity-90">Current Balance</p>
                    <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
                    <p className="text-sm opacity-80 mt-2">Account: {selectedAccount.account_number || `ACC-${selectedAccount.account_id}`}</p>
                </div>
            )}

            {/* Transaction Tabs */}
            {selectedAccount && selectedAccount.account_status === 'active' && canPerformTransactions && (
                <div className="bg-white rounded-lg shadow-md mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex -mb-px">
                            <button
                                onClick={() => setActiveTab('deposit')}
                                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                                    activeTab === 'deposit'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Deposit
                            </button>
                            <button
                                onClick={() => setActiveTab('withdraw')}
                                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                                    activeTab === 'withdraw'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Withdraw
                            </button>
                            <button
                                onClick={() => setActiveTab('transfer')}
                                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                                    activeTab === 'transfer'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Transfer
                            </button>
                        </nav>
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

                        {/* Deposit Form */}
                        {activeTab === 'deposit' && (
                            <form onSubmit={handleDeposit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter amount"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Maximum deposit: Rs. 1,000,000</p>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                    <input
                                        type="text"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Cash deposit, Salary, etc."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Deposit Money'}
                                </button>
                            </form>
                        )}

                        {/* Withdraw Form */}
                        {activeTab === 'withdraw' && (
                            <form onSubmit={handleWithdraw}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter amount"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Maximum withdrawal: Rs. 500,000</p>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                    <input
                                        type="text"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., ATM withdrawal, Cheque, etc."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Withdraw Money'}
                                </button>
                            </form>
                        )}

                        {/* Transfer Form */}
                        {activeTab === 'transfer' && (
                            <form onSubmit={handleTransfer}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">From Account (Current)</label>
                                    <input
                                        type="text"
                                        value={selectedAccount.account_number || `ACC-${selectedAccount.account_id}`}
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                    />
                                    <input
                                        type="hidden"
                                        name="from_account_id"
                                        value={selectedAccount.account_id}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">To Account Number *</label>
                                    <input
                                        type="text"
                                        name="to_account_id"
                                        value={formData.to_account_id}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter destination account number"
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter amount"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Maximum transfer: Rs. 500,000</p>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                    <input
                                        type="text"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Transfer to savings, Payment, etc."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Transfer Money'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Transaction History */}
            {selectedAccount && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Transaction History</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={loadLess}
                                disabled={pagination.offset === 0}
                                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            >
                                ← Previous
                            </button>
                            <span className="text-sm text-gray-500">
                                Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
                            </span>
                            <button
                                onClick={loadMore}
                                disabled={pagination.offset + pagination.limit >= pagination.total}
                                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            >
                                Next →
                            </button>
                        </div>
                    </div>

                    {historyLoading ? (
                        <div className="p-6 text-center text-gray-500">Loading...</div>
                    ) : transactionHistory.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No transactions found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {transactionHistory.map((transaction) => (
                                        <tr key={transaction.transaction_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(transaction.timestamp)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(transaction.type)}`}>
                                                    {transaction.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium">
                                                <span className={transaction.type === 'Deposit' ? 'text-green-600' : transaction.type === 'Withdrawal' ? 'text-red-600' : 'text-blue-600'}>
                                                    {formatCurrency(transaction.amount)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                {transaction.description || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {transaction.employee || 'System'}
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
    );
};

export default Transactions;