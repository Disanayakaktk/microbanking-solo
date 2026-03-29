import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { savingPlanAPI } from '../services/api';

const SavingsPlans = () => {
    const { hasRole } = useAuth();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [deletingPlan, setDeletingPlan] = useState(null);
    const [replacementPlanId, setReplacementPlanId] = useState('');
    const [formData, setFormData] = useState({
        plan_type: 'Adult',
        interest: '',
        min_balance: ''
    });
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const isAdmin = hasRole(['Admin']);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const response = await savingPlanAPI.getPlans();
            setPlans(response.data.plans || []);
        } catch (error) {
            console.error('Error fetching saving plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            plan_type: 'Adult',
            interest: '',
            min_balance: ''
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

        if (!formData.plan_type || !formData.interest || !formData.min_balance) {
            setFormError('All fields are required');
            setLoading(false);
            return;
        }

        if (parseFloat(formData.interest) <= 0 || parseFloat(formData.interest) > 25) {
            setFormError('Interest rate must be between 0 and 25%');
            setLoading(false);
            return;
        }

        if (parseFloat(formData.min_balance) < 0) {
            setFormError('Minimum balance cannot be negative');
            setLoading(false);
            return;
        }

        try {
            if (editingPlan) {
                await savingPlanAPI.updatePlan(editingPlan.saving_plan_id, formData);
                setFormSuccess('Saving plan updated successfully!');
            } else {
                await savingPlanAPI.createPlan(formData);
                setFormSuccess('Saving plan created successfully!');
            }

            resetForm();
            fetchPlans();

            setTimeout(() => {
                setShowModal(false);
                setFormSuccess('');
            }, 1200);
        } catch (error) {
            setFormError(error.response?.data?.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (plan) => {
        setEditingPlan(plan);
        setFormData({
            plan_type: plan.plan_type,
            interest: plan.interest,
            min_balance: plan.min_balance
        });
        setShowModal(true);
    };

    const handleDeleteClick = (plan) => {
        setDeletingPlan(plan);
        const replacement = plans.find((p) => p.saving_plan_id !== plan.saving_plan_id);
        setReplacementPlanId(replacement ? String(replacement.saving_plan_id) : '');
        setFormError('');
        setFormSuccess('');
        setShowDeleteModal(true);
    };

    const handleDeletePlan = async () => {
        if (!deletingPlan) return;

        if (plans.length <= 1) {
            setFormError('At least one saving plan must remain. Create another plan before deleting this one.');
            return;
        }

        if (!replacementPlanId) {
            setFormError('Please select a replacement saving plan.');
            return;
        }

        if (parseInt(replacementPlanId) === deletingPlan.saving_plan_id) {
            setFormError('Replacement saving plan must be different from the plan being deleted.');
            return;
        }

        try {
            setLoading(true);
            setFormError('');
            await savingPlanAPI.deletePlan(deletingPlan.saving_plan_id, parseInt(replacementPlanId));
            setFormSuccess('Saving plan deleted successfully. Related accounts were reassigned when needed.');
            setShowDeleteModal(false);
            setDeletingPlan(null);
            setReplacementPlanId('');
            fetchPlans();
        } catch (error) {
            setFormError(error.response?.data?.message || 'Failed to delete saving plan');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return `Rs. ${parseFloat(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (!isAdmin) {
        return (
            <div className="p-6 text-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p className="font-semibold">Access Denied</p>
                    <p className="text-sm">Only Administrators can manage saving plans.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Savings Plans Management</h1>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    + New Savings Plan
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : plans.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No saving plans found</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plans.map((plan) => (
                        <div key={plan.saving_plan_id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4">
                                <h3 className="text-xl font-bold text-white">{plan.plan_type}</h3>
                            </div>
                            <div className="p-6">
                                <div className="mb-4">
                                    <p className="text-3xl font-bold text-cyan-600">{plan.interest}%</p>
                                    <p className="text-sm text-gray-500">Interest Rate (p.a.)</p>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <p className="flex justify-between">
                                        <span className="text-gray-500">Minimum Balance:</span>
                                        <span className="font-semibold">{formatCurrency(plan.min_balance)}</span>
                                    </p>
                                    <p className="flex justify-between">
                                        <span className="text-gray-500">Plan ID:</span>
                                        <span className="font-semibold text-gray-700">#{plan.saving_plan_id}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleEdit(plan)}
                                    className="mt-4 w-full px-4 py-2 border border-cyan-600 text-cyan-700 rounded-lg hover:bg-cyan-50 transition"
                                >
                                    Edit Plan
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(plan)}
                                    className="mt-2 w-full px-4 py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition"
                                >
                                    Delete Plan
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-semibold">{editingPlan ? 'Edit Savings Plan' : 'New Savings Plan'}</h2>
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
                                    name="plan_type"
                                    value={formData.plan_type}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="Children">Children</option>
                                    <option value="Teen">Teen</option>
                                    <option value="Adult">Adult</option>
                                    <option value="Senior">Senior</option>
                                    <option value="Joint">Joint</option>
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
                                    placeholder="e.g., 5.5"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Balance (Rs.) *</label>
                                <input
                                    type="number"
                                    name="min_balance"
                                    value={formData.min_balance}
                                    onChange={handleInputChange}
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 5000"
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

            {showDeleteModal && deletingPlan && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Delete Saving Plan</h2>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeletingPlan(null);
                                    setReplacementPlanId('');
                                    setFormError('');
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

                            <p className="text-sm text-gray-700 mb-4">
                                You are deleting <span className="font-semibold">{deletingPlan.plan_type}</span>. If this plan is used by existing accounts, they will be reassigned to the replacement plan below.
                            </p>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Replacement Saving Plan *</label>
                                <select
                                    value={replacementPlanId}
                                    onChange={(e) => setReplacementPlanId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select replacement plan</option>
                                    {plans
                                        .filter((p) => p.saving_plan_id !== deletingPlan.saving_plan_id)
                                        .map((plan) => (
                                            <option key={plan.saving_plan_id} value={plan.saving_plan_id}>
                                                {plan.plan_type} - {plan.interest}% (Min: {formatCurrency(plan.min_balance)})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDeletingPlan(null);
                                        setReplacementPlanId('');
                                        setFormError('');
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeletePlan}
                                    disabled={loading}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                >
                                    {loading ? 'Deleting...' : 'Delete Plan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SavingsPlans;
