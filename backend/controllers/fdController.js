import fdModel from '../models/fdModel.js';
import accountModel from '../models/accountModel.js';

const fdController = {
    // =============================================
    // FD PLAN MANAGEMENT (Admin only)
    // =============================================

    // Create FD plan (Admin only)
    createPlan: async (req, res) => {
        try {
            const { fd_options, interest, min_amount, penalty_rate } = req.body;
            const parsedInterest = parseFloat(interest);
            const parsedMinAmount = parseFloat(min_amount);
            const parsedPenaltyRate = parseFloat(penalty_rate);

            // Validation
            if (!fd_options || !interest || !min_amount || !penalty_rate) {
                return res.status(400).json({
                    success: false,
                    message: 'FD options, interest rate, minimum amount, and penalty rate are required'
                });
            }

            const validOptions = ['6 months', '1 year', '3 years', '5 years'];
            if (!validOptions.includes(fd_options)) {
                return res.status(400).json({
                    success: false,
                    message: 'FD options must be: 6 months, 1 year, 3 years, or 5 years'
                });
            }

            if (Number.isNaN(parsedInterest) || parsedInterest <= 0 || parsedInterest > 20) {
                return res.status(400).json({
                    success: false,
                    message: 'Interest rate must be between 0 and 20%'
                });
            }

            if (Number.isNaN(parsedMinAmount) || parsedMinAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Minimum amount must be greater than 0'
                });
            }

            if (Number.isNaN(parsedPenaltyRate) || parsedPenaltyRate < 0 || parsedPenaltyRate > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Penalty rate must be between 0 and 100%'
                });
            }

            const plan = await fdModel.createPlan({
                fd_options,
                interest: parsedInterest,
                min_amount: parsedMinAmount,
                penalty_rate: parsedPenaltyRate
            });

            res.status(201).json({
                success: true,
                message: 'FD plan created successfully',
                plan
            });

        } catch (error) {
            console.error('Create FD plan error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while creating FD plan'
            });
        }
    },

    // Get all FD plans (All roles)
    getAllPlans: async (req, res) => {
        try {
            const plans = await fdModel.getAllPlans();
            
            res.json({
                success: true,
                count: plans.length,
                plans
            });

        } catch (error) {
            console.error('Get FD plans error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching FD plans'
            });
        }
    },

    // Get FD plan by ID (All roles)
    getPlanById: async (req, res) => {
        try {
            const { id } = req.params;

            const plan = await fdModel.getPlanById(id);
            
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'FD plan not found'
                });
            }

            res.json({
                success: true,
                plan
            });

        } catch (error) {
            console.error('Get FD plan error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching FD plan'
            });
        }
    },

    // Update FD plan (Admin only)
    updatePlan: async (req, res) => {
        try {
            const { id } = req.params;
            const { fd_options, interest, min_amount, penalty_rate } = req.body;
            const parsedInterest = interest !== undefined ? parseFloat(interest) : undefined;
            const parsedMinAmount = min_amount !== undefined ? parseFloat(min_amount) : undefined;
            const parsedPenaltyRate = penalty_rate !== undefined ? parseFloat(penalty_rate) : undefined;

            // Check if plan exists
            const existingPlan = await fdModel.getPlanById(id);
            if (!existingPlan) {
                return res.status(404).json({
                    success: false,
                    message: 'FD plan not found'
                });
            }

            if (parsedInterest !== undefined && (Number.isNaN(parsedInterest) || parsedInterest <= 0 || parsedInterest > 20)) {
                return res.status(400).json({
                    success: false,
                    message: 'Interest rate must be between 0 and 20%'
                });
            }

            if (parsedMinAmount !== undefined && (Number.isNaN(parsedMinAmount) || parsedMinAmount <= 0)) {
                return res.status(400).json({
                    success: false,
                    message: 'Minimum amount must be greater than 0'
                });
            }

            if (parsedPenaltyRate !== undefined && (Number.isNaN(parsedPenaltyRate) || parsedPenaltyRate < 0 || parsedPenaltyRate > 100)) {
                return res.status(400).json({
                    success: false,
                    message: 'Penalty rate must be between 0 and 100%'
                });
            }

            const updatedPlan = await fdModel.updatePlan(id, {
                fd_options,
                interest: parsedInterest,
                min_amount: parsedMinAmount,
                penalty_rate: parsedPenaltyRate
            });

            res.json({
                success: true,
                message: 'FD plan updated successfully',
                plan: updatedPlan
            });

        } catch (error) {
            console.error('Update FD plan error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while updating FD plan'
            });
        }
    },

    // =============================================
    // FD INVESTMENT MANAGEMENT
    // =============================================

    // Create new FD investment (Agent only)
    createInvestment: async (req, res) => {
        try {
            const { customer_id, account_id, fd_plan_id, fd_balance, auto_renewal } = req.body;

            // Validation
            if (!customer_id || !account_id || !fd_plan_id || !fd_balance) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer ID, Account ID, FD Plan ID, and FD Balance are required'
                });
            }

            if (fd_balance <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'FD balance must be greater than zero'
                });
            }

            // Check if account belongs to customer
            const account = await accountModel.findById(account_id);
            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Account not found'
                });
            }

            // Check account holders
            const holders = await accountModel.getAccountHolders(account_id);
            const isHolder = holders.some(h => h.customer_id == customer_id);
            if (!isHolder) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer is not an account holder'
                });
            }

            const result = await fdModel.createInvestment({
                customer_id,
                account_id,
                fd_plan_id,
                fd_balance,
                auto_renewal: auto_renewal || false
            });

            // Get created FD details
            const newFD = await fdModel.getFDById(result.fd_id);

            res.status(201).json({
                success: true,
                message: 'FD investment created successfully',
                fd: newFD
            });

        } catch (error) {
            console.error('Create FD investment error:', error);
            
            let message = 'Server error while creating FD investment';
            if (error.message === 'Source account not found') {
                message = 'Source account not found';
            } else if (error.message === 'Insufficient balance in source account') {
                message = 'Insufficient balance in source account';
            } else if (error.message.includes('Minimum FD amount')) {
                message = error.message;
            }

            res.status(500).json({
                success: false,
                message,
                error: error.message
            });
        }
    },

    // Get FD by ID (Agent/Manager)
    getFDById: async (req, res) => {
        try {
            const { id } = req.params;

            const fd = await fdModel.getFDById(id);
            
            if (!fd) {
                return res.status(404).json({
                    success: false,
                    message: 'FD not found'
                });
            }

            // Calculate maturity date
            const openDate = new Date(fd.open_date);
            let maturityDate = new Date(openDate);
            
            if (fd.fd_options === '6 months') {
                maturityDate.setMonth(openDate.getMonth() + 6);
            } else if (fd.fd_options === '1 year') {
                maturityDate.setFullYear(openDate.getFullYear() + 1);
            } else if (fd.fd_options === '3 years') {
                maturityDate.setFullYear(openDate.getFullYear() + 3);
            } else if (fd.fd_options === '5 years') {
                maturityDate.setFullYear(openDate.getFullYear() + 5);
            }

            // Calculate days remaining
            const today = new Date();
            const daysRemaining = Math.ceil((maturityDate - today) / (1000 * 60 * 60 * 24));

            // Get interest history
            const interestHistory = await fdModel.getInterestHistory(id);

            res.json({
                success: true,
                fd: {
                    ...fd,
                    maturity_date: maturityDate.toISOString().split('T')[0],
                    days_remaining: daysRemaining > 0 ? daysRemaining : 0,
                    is_matured: daysRemaining <= 0 && fd.fd_status === 'active',
                    total_value: parseFloat(fd.fd_balance) + parseFloat(fd.total_interest_earned || 0),
                    interest_history: interestHistory
                }
            });

        } catch (error) {
            console.error('Get FD error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching FD'
            });
        }
    },

    // Get FDs by customer ID (Agent/Manager)
    getFDsByCustomerId: async (req, res) => {
        try {
            const { customerId } = req.params;

            const fds = await fdModel.getFDsByCustomerId(customerId);

            // Enhance with maturity info
            const enhancedFDs = fds.map(fd => {
                const openDate = new Date(fd.open_date);
                let maturityDate = new Date(openDate);
                
                if (fd.fd_options === '6 months') {
                    maturityDate.setMonth(openDate.getMonth() + 6);
                } else if (fd.fd_options === '1 year') {
                    maturityDate.setFullYear(openDate.getFullYear() + 1);
                } else if (fd.fd_options === '3 years') {
                    maturityDate.setFullYear(openDate.getFullYear() + 3);
                } else if (fd.fd_options === '5 years') {
                    maturityDate.setFullYear(openDate.getFullYear() + 5);
                }

                const today = new Date();
                const daysRemaining = Math.ceil((maturityDate - today) / (1000 * 60 * 60 * 24));

                return {
                    ...fd,
                    maturity_date: maturityDate.toISOString().split('T')[0],
                    days_remaining: daysRemaining > 0 ? daysRemaining : 0,
                    is_matured: daysRemaining <= 0 && fd.fd_status === 'active',
                    total_value: parseFloat(fd.fd_balance) + parseFloat(fd.total_interest_earned || 0)
                };
            });

            res.json({
                success: true,
                count: enhancedFDs.length,
                fds: enhancedFDs
            });

        } catch (error) {
            console.error('Get customer FDs error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching customer FDs'
            });
        }
    },

    // Get maturing FDs (Manager only)
    getMaturingFDs: async (req, res) => {
        try {
            const { days = 30 } = req.query;

            const fds = await fdModel.getMaturingFDs(days);

            res.json({
                success: true,
                count: fds.length,
                days_range: parseInt(days),
                fds
            });

        } catch (error) {
            console.error('Get maturing FDs error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching maturing FDs'
            });
        }
    },

    // =============================================
    // FD ACTIONS (Agent only - MANUAL)
    // =============================================

    // Renew matured FD (Agent only - Manual)
    renewFD: async (req, res) => {
        try {
            const { id } = req.params;
            const { renew_option, new_plan_id } = req.body;
            const employee_id = req.user.id;

            // Get FD details
            const fd = await fdModel.getFDById(id);
            
            if (!fd) {
                return res.status(404).json({
                    success: false,
                    message: 'FD not found'
                });
            }

            if (fd.fd_status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: `FD is already ${fd.fd_status}`
                });
            }

            // Calculate maturity date
            const openDate = new Date(fd.open_date);
            let maturityDate = new Date(openDate);
            
            if (fd.fd_options === '6 months') {
                maturityDate.setMonth(openDate.getMonth() + 6);
            } else if (fd.fd_options === '1 year') {
                maturityDate.setFullYear(openDate.getFullYear() + 1);
            } else if (fd.fd_options === '3 years') {
                maturityDate.setFullYear(openDate.getFullYear() + 3);
            } else if (fd.fd_options === '5 years') {
                maturityDate.setFullYear(openDate.getFullYear() + 5);
            }

            const today = new Date();
            const daysRemaining = Math.ceil((maturityDate - today) / (1000 * 60 * 60 * 24));

            if (daysRemaining > 0) {
                return res.status(400).json({
                    success: false,
                    message: `FD not yet matured. ${daysRemaining} days remaining. Maturity date: ${maturityDate.toISOString().split('T')[0]}`
                });
            }

            const totalAmount = parseFloat(fd.fd_balance) + parseFloat(fd.total_interest_earned || 0);
            let result;

            if (renew_option === 'withdraw') {
                // Withdraw to savings account
                await fdModel.withdrawFD(id, fd.account_id, totalAmount, employee_id);
                
                return res.json({
                    success: true,
                    message: 'FD withdrawn successfully',
                    data: {
                        fd_id: id,
                        principal: parseFloat(fd.fd_balance),
                        interest_earned: parseFloat(fd.total_interest_earned || 0),
                        total_amount: totalAmount,
                        credited_to_account: fd.account_id
                    }
                });
                
            } else if (renew_option === 'same_plan') {
                // Renew with same plan
                result = await fdModel.renewFD(id, totalAmount, fd.fd_plan_id, employee_id);
                
                const newFD = await fdModel.getFDById(result.new_fd_id);
                
                res.json({
                    success: true,
                    message: 'FD renewed successfully with same plan',
                    data: {
                        old_fd_id: id,
                        old_principal: parseFloat(fd.fd_balance),
                        rolled_over_amount: totalAmount,
                        new_fd: newFD
                    }
                });
                
            } else if (renew_option === 'different_plan') {
                if (!new_plan_id) {
                    return res.status(400).json({
                        success: false,
                        message: 'New plan ID required for different plan renewal'
                    });
                }
                
                const newPlan = await fdModel.getPlanById(new_plan_id);
                if (!newPlan) {
                    return res.status(404).json({
                        success: false,
                        message: 'New FD plan not found'
                    });
                }
                
                result = await fdModel.renewFD(id, totalAmount, new_plan_id, employee_id);
                
                const newFD = await fdModel.getFDById(result.new_fd_id);
                
                res.json({
                    success: true,
                    message: 'FD renewed successfully with new plan',
                    data: {
                        old_fd_id: id,
                        old_principal: parseFloat(fd.fd_balance),
                        rolled_over_amount: totalAmount,
                        old_plan: fd.fd_options,
                        new_plan: newPlan.fd_options,
                        new_fd: newFD
                    }
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid renew option. Use: withdraw, same_plan, or different_plan'
                });
            }

        } catch (error) {
            console.error('Renew FD error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while renewing FD'
            });
        }
    },

    // Close FD early (Agent only - Manual, with penalty)
    closeFDEarly: async (req, res) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const employee_id = req.user.id;

            const fd = await fdModel.getFDById(id);
            
            if (!fd) {
                return res.status(404).json({
                    success: false,
                    message: 'FD not found'
                });
            }

            if (fd.fd_status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: `FD is already ${fd.fd_status}`
                });
            }

            // Calculate penalty (using plan's penalty rate)
            const penaltyRate = parseFloat(fd.penalty_rate || 1.0);
            const penalty = (parseFloat(fd.fd_balance) * penaltyRate) / 100;
            
            // Calculate interest earned with reduced rate (half of normal rate)
            const openDate = new Date(fd.open_date);
            const today = new Date();
            const daysHeld = Math.ceil((today - openDate) / (1000 * 60 * 60 * 24));
            
            // Reduced rate for early withdrawal (50% of normal rate)
            const reducedRate = parseFloat(fd.interest_rate) * 0.5;
            const interestEarned = (parseFloat(fd.fd_balance) * reducedRate * daysHeld) / (100 * 365);
            
            // Final amount after penalty
            const finalAmount = parseFloat(fd.fd_balance) + interestEarned - penalty;

            // Process early closure
            await fdModel.closeFDEarly(id, fd.account_id, finalAmount, penalty, employee_id);

            res.json({
                success: true,
                message: 'FD closed early successfully',
                data: {
                    fd_id: id,
                    principal: parseFloat(fd.fd_balance),
                    interest_earned: interestEarned,
                    penalty: penalty,
                    penalty_rate: penaltyRate + '%',
                    final_amount: finalAmount,
                    credited_to_account: fd.account_id,
                    days_held: daysHeld,
                    reason: reason || 'Not specified'
                }
            });

        } catch (error) {
            console.error('Close FD early error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while closing FD'
            });
        }
    },

    // Get interest history for an FD
    getInterestHistory: async (req, res) => {
        try {
            const { id } = req.params;

            const fd = await fdModel.getFDById(id);
            if (!fd) {
                return res.status(404).json({
                    success: false,
                    message: 'FD not found'
                });
            }

            const history = await fdModel.getInterestHistory(id);

            res.json({
                success: true,
                fd_id: id,
                count: history.length,
                interest_history: history
            });

        } catch (error) {
            console.error('Get interest history error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching interest history'
            });
        }
    }
};

export default fdController;