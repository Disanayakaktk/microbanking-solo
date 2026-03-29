import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { accountAPI, customerAPI } from '../services/api';

const Customers = () => {
    const { hasRole, user } = useAuth();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchNIC, setSearchNIC] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        gender: 'male',
        nic: '',
        date_of_birth: '',
        branch_id: '',
        contact_no_1: '',
        contact_no_2: '',
        address: '',
        email: ''
    });
    const [branches, setBranches] = useState([]);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Only manager can view all customers, agents can only search and edit
    const canViewAll = hasRole(['Manager']);
    const canEdit = hasRole(['Agent']);

    // Load all customers if Manager
    useEffect(() => {
        fetchBranches();
        if (canViewAll) {
            fetchAllCustomers();
        }
    }, []);

    const fetchBranches = async () => {
        try {
            const response = await accountAPI.getBranches();
            const data = Array.isArray(response.data) ? response.data : response.data?.branches || [];
            setBranches(data);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const fetchAllCustomers = async () => {
        try {
            setLoading(true);
            const response = await customerAPI.getAll();
            setCustomers(response.data.customers || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchNIC.trim()) {
            setSearchResult(null);
            return;
        }

        try {
            const response = await customerAPI.getByNIC(searchNIC);
            setSearchResult(response.data.customer);
        } catch (error) {
            setSearchResult(null);
            alert('Customer not found with this NIC');
        }
    };

    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            gender: 'male',
            nic: '',
            date_of_birth: '',
            branch_id: '',
            contact_no_1: '',
            contact_no_2: '',
            address: '',
            email: ''
        });
        setEditingCustomer(null);
        setFormError('');
        setFormSuccess('');
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        // Validate required fields
        if (!formData.first_name || !formData.last_name || !formData.gender || 
            !formData.nic || !formData.date_of_birth || !formData.contact_no_1 || 
            !formData.address || !formData.email || !formData.branch_id) {
            setFormError('All required fields must be filled');
            return;
        }

        try {
            const payload = {
                ...formData,
                branch_id: parseInt(formData.branch_id)
            };

            if (editingCustomer) {
                // Update existing customer
                await customerAPI.update(editingCustomer.customer_id, payload);
                setFormSuccess('Customer updated successfully!');
            } else {
                // Create new customer
                await customerAPI.create(payload);
                setFormSuccess('Customer created successfully!');
            }

            // Refresh lists
            if (canViewAll) fetchAllCustomers();
            resetForm();
            
            // Close modal after 2 seconds
            setTimeout(() => {
                setShowModal(false);
                setFormSuccess('');
            }, 2000);
            
        } catch (error) {
            setFormError(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            first_name: customer.first_name,
            last_name: customer.last_name,
            gender: customer.gender,
            nic: customer.nic,
            date_of_birth: customer.date_of_birth.split('T')[0],
            branch_id: customer.branch_id ? String(customer.branch_id) : '',
            contact_no_1: customer.contact_no_1 || '',
            contact_no_2: customer.contact_no_2 || '',
            address: customer.address || '',
            email: customer.email || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (customer) => {
        if (!window.confirm(`Are you sure you want to delete ${customer.first_name} ${customer.last_name}?`)) {
            return;
        }

        try {
            await customerAPI.delete(customer.customer_id);
            fetchAllCustomers();
            alert('Customer deleted successfully');
        } catch (error) {
            alert(error.response?.data?.message || 'Delete failed');
        }
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
                {canEdit && (
                    <button
                        onClick={() => {
                            resetForm();
                            setShowModal(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        + New Customer
                    </button>
                )}
            </div>

            {/* Search by NIC (Quick lookup) */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search by NIC (e.g., 123456789V)"
                        value={searchNIC}
                        onChange={(e) => setSearchNIC(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleSearch}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                    >
                        Search
                    </button>
                </div>

                {/* Search Result */}
                {searchResult && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="font-semibold text-green-800">Customer Found:</p>
                        <p className="text-gray-700">
                            {searchResult.first_name} {searchResult.last_name} - NIC: {searchResult.nic}
                        </p>
                        <p className="text-gray-600 text-sm">Branch: {searchResult.branch_name || 'Not assigned'}</p>
                        <p className="text-gray-600 text-sm">Contact: {searchResult.contact_no_1}</p>
                    </div>
                )}
            </div>

            {/* Customer List (Manager only) */}
            {canViewAll && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold">All Customers</h2>
                    </div>
                    
                    {loading ? (
                        <div className="p-6 text-center text-gray-500">Loading...</div>
                    ) : customers.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No customers found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIC</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {customers.map((customer) => (
                                        <tr key={customer.customer_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">
                                                    {customer.first_name} {customer.last_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {customer.nic}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {customer.branch_name || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {customer.contact_no_1}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {customer.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleEdit(customer)}
                                                    className="text-blue-600 hover:text-blue-800 mr-3"
                                                >
                                                    Edit
                                                </button>
                                                {hasRole(['Admin']) && (
                                                    <button
                                                        onClick={() => handleDelete(customer)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        Delete
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

            {/* Customer Form Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-semibold">
                                {editingCustomer ? 'Edit Customer' : 'New Customer'}
                            </h2>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">NIC *</label>
                                    <input
                                        type="text"
                                        name="nic"
                                        value={formData.nic}
                                        onChange={handleInputChange}
                                        placeholder="123456789V or 123456789012"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Registered Branch *</label>
                                <select
                                    name="branch_id"
                                    value={formData.branch_id}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map((branch) => (
                                        <option key={branch.branch_id} value={branch.branch_id}>
                                            {branch.branch_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                                <input
                                    type="date"
                                    name="date_of_birth"
                                    value={formData.date_of_birth}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact No. 1 *</label>
                                    <input
                                        type="tel"
                                        name="contact_no_1"
                                        value={formData.contact_no_1}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact No. 2</label>
                                    <input
                                        type="tel"
                                        name="contact_no_2"
                                        value={formData.contact_no_2}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    rows="2"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
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
                                    {editingCustomer ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;