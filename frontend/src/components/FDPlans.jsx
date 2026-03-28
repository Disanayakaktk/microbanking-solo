import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fdAPI } from '../services/api';

const FDPlans = () => {
    const { hasRole, user } = useAuth();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [formData, setFormData] = useState({
        fd_options: '6 months',
        interest: '',
        min_amount: '',
        penalty_rate: ''
    });
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const isAdmin = hasRole(['Admin']);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const response = await fdAPI.getPlans();
            setPlans(response.data.plans || []);
        } catch (error) {
            console.error('Error fetching FD plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            fd_options: '6 months',
            interest: '',
            min_amount: '',
            penalty_rate: ''
        });
        setEditingPlan(null);
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
        setLoading(true);

        // Validation
        if (!formData.interest || !formData.min_amount || !formData.penalty_rate) {
            setFormError('All fields are required');
            setLoading(false);
            return;
        }

        if (parseFloat(formData.interest) <= 0 || parseFloat(formData.interest) > 20) {
            setFormError('Interest rate must be between 0 and 20%');
            setLoading(false);
            return;
        }

        try {
            if (editingPlan) {
                await fdAPI.updatePlan(editingPlan.fd_plan_id, formData);
                setFormSuccess('FD plan updated successfully!');
            } else {
                await fdAPI.createPlan(formData);
                setFormSuccess('FD plan created successfully!');
            }
            resetForm();
            fetchPlans();
            
            setTimeout(() => {
                setShowModal(false);
                setFormSuccess('');
            }, 2000);
        } catch (error) {
            setFormError(error.response?.data?.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (plan) => {
        setEditingPlan(plan);
        setFormData({
            fd_options: plan.fd_options,
            interest: plan.interest,
            min_amount: plan.min_amount,
            penalty_rate: plan.penalty_rate
        });
        setShowModal(true);
    };

    const formatCurrency = (amount) => {
        return `Rs. ${parseFloat(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (!isAdmin) {
        return (
            <div className="p-6 text-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p className="font-semibold">Access Denied</p>
                    <p className="text-sm">Only Administrators can manage FD plans.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">FD Plans Management</h1>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    + New FD Plan
                </button>
            </div>

            {/* FD Plans Grid */}
            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : plans.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No FD plans found</div>
            ) : (
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
                                <button
                                    onClick={() => handleEdit(plan)}
                                    className="mt-4 w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition"
                                >
                                    Edit Plan
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* FD Plan Form Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-semibold">
                                {editingPlan ? 'Edit FD Plan' : 'New FD Plan'}
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

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type *</label>
                                <select
                                    name="fd_options"
                                    value={formData.fd_options}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="6 months">6 months</option>
                                    <option value="1 year">1 year</option>
                                    <option value="3 years">3 years</option>
                                    <option value="5 years">5 years</option>
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%) *</label>
                                <input
                                    type="number"
                                    name="interest"
                                    value={formData.interest}
                                    onChange={handleInputChange}
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 8.5"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Amount (Rs.) *</label>
                                <input
                                    type="number"
                                    name="min_amount"
                                    value={formData.min_amount}
                                    onChange={handleInputChange}
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 10000"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Early Withdrawal Penalty (%) *</label>
                                <input
                                    type="number"
                                    name="penalty_rate"
                                    value={formData.penalty_rate}
                                    onChange={handleInputChange}
                                    step="0.1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 1.0"
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
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : editingPlan ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FDPlans;



