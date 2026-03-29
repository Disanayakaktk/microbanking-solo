import accountModel from '../models/accountModel.js';
import customerModel from '../models/customerModel.js';

const accountController = {
    // Create a new account
    createAccount: async (req, res) => {
        try {
            const {
                customer_id,
                joint_holder_ids,    // Optional array of joint holder customer IDs
                branch_id,
                saving_plan_id,
                initial_deposit,
                open_date = new Date().toISOString().split('T')[0]  
            } = req.body;

            // ==== Validatation ==== //
            if (!customer_id) {
                return res.status(400).json({
                    success:false,
                    message: 'Customer ID is required'
                });
            }

            if(!branch_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Branch ID is required'
                });
            }

            if (!saving_plan_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Saving plan ID is required'
                });
            }

            if (initial_deposit === undefined || initial_deposit === null) {
                return res.status(400).json({
                    success: false,
                    message: 'Initial deposit amount is required'
                });
            }
            
            if (initial_deposit < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Initial deposit cannot be negative'
                });
            }

            // ==== Business rules ==== //
            // Check if main customer exists
            const mainCustomer = await customerModel.findById(customer_id);
            if (!mainCustomer) {
                return res.status(400).json({
                    success: false,
                    message: 'Main customer not found'
                });
            }

            if (!mainCustomer.branch_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer branch is not set. Update customer profile before opening an account.'
                });
            }

            if (Number(mainCustomer.branch_id) !== Number(branch_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer can only open an account in the registered branch'
                });
            }

            // ==== create account ==== //
            const accountData = {
                open_date,
                account_status: 'active',
                balance: initial_deposit,
                fd_id: null, // Not a fixed deposit account
                branch_id,
                saving_plan_id,
                customer_id
            };
            // create the new account
            const newAccount = await accountModel.create(accountData);

            // Add joint holders if provided
            if (joint_holder_ids && Array.isArray(joint_holder_ids) && joint_holder_ids.length > 0) {
                for (const joint_id of joint_holder_ids) {
                    // Check if joint holder customer exists
                    const jointCustomer = await customerModel.findById(joint_id);
                    if (jointCustomer) {
                        await accountModel.addJointHolder(newAccount.account_id, joint_id);
                    }
                }
            }

            // Fetch the complete account details to return
            const completeAccount = await accountModel.findById(newAccount.account_id);
            const accountHolders = await accountModel.getAccountHolders(newAccount.account_id);

            res.status(201).json({
                success: true,
                message: 'Account created successfully',
                account: {
                    ...completeAccount,
                    account_number: newAccount.account_number,
                    holders: accountHolders
                }
            });
        } catch (error) {
            console.error('Create account error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while creating account',
                error: error.message
            });
        }
    },

    // Get account details by ID
    getAccountById: async (req, res) => {
        try {
            const { id } = req.params;

            // Validate account ID
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid account ID is required'
                });
            }

            const account = await accountModel.findById(id);

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Account not found'
                });
            }

            // Get account holders
            const holders = await accountModel.getAccountHolders(id);

            res.json({
                success: true,
                account: {
                    ...account,
                    holders,
                    account_type: holders.length > 1 ? 'Joint' : 'Single'
                }
            });
        } catch (error) {
            console.error('Get account error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching account',
            }); 
        }
    },

    // Get account details by account number
    getAccountByNumber: async (req, res) => {
        try {
            const { accountNumber } = req.params;

            if (!accountNumber) {
                return res.status(400).json({
                    success: false,
                    message: 'Account number is required'
                });
            }

            const account = await accountModel.findByAccountNumber(accountNumber);

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Account not found'
                });
            }

            // Get account holders
            const holders = await accountModel.getAccountHolders(account.account_id);

            res.json({
                success: true,
                account: {
                    ...account,
                    holders,
                    account_type: holders.length > 1 ? 'Joint' : 'Single'
                }
            });
        } catch (error) {
            console.error('Get account by number error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching account'
            });
        }
    },

    // Get all accounts for a customer
    getCustomerAccounts: async (req, res) => {
        try {
            const { customerId } = req.params;

            if (!customerId || isNaN(customerId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid customer ID is required'
                });
            }

            // Check if customer exists
            const customer = await customerModel.findById(customerId);
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found'
                });
            }

            const accounts = await accountModel.findByCustomerId(customerId);
            const accountsWithType = accounts.map((account) => ({
                ...account,
                account_type: Number(account.holder_count) > 1 ? 'Joint' : 'Single'
            }));

            res.json({
                success: true,
                count: accounts.length,
                customer: {
                    id: customer.customer_id,
                    name: `${customer.first_name} ${customer.last_name}`
                },
                accounts: accountsWithType
            });
        } catch (error) {
            console.error('Get customer accounts error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching customer accounts'
            });
        }
    },

    // check account balance
    getBalance: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid account ID is required'
                });
            }

            // check if account exists
            const account = await accountModel.findById(id);
            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Account not found'
                });
            }

            const balance = await accountModel.getBalance(id);

            res.json({
                success: true,
                account_id: parseInt(id),
                account_number: account.account_number,
                balance: parseFloat(balance),
                formatted_balance: `Rs. ${parseFloat(balance).toFixed(2)}`,
                as_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('Get balance error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching account balance'
            });
        }
    },

    // update account status (active, closed)
    updateAccountStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid account ID is required'
                });
            }

            if (!status || !['active', 'closed'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid status (active/closed) is required'
                });
            }

            // Check if account exists
            const existingAccount = await accountModel.findById(id);
            if (!existingAccount) {
                return res.status(404).json({
                    success: false,
                    message: 'Account not found'
                });
            }

            // Business rule: Can't close account with non-zero balance?
            if (status === 'closed' && existingAccount.balance > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot close account with positive balance. Please withdraw all funds first.'
                });
            }

            // Set closed_at timestamp if closing
            const closed_at = status === 'closed' ? new Date() : null;

            const updatedAccount = await accountModel.updateStatus(id, status, closed_at);

            res.json({
                success: true,
                message: `Account ${status === 'active' ? 'activated' : 'closed'} successfully`,
                account: updatedAccount
            });

        } catch (error) {
            console.error('Update account status error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while updating account status'
            });
        }
    },

    // add joint holder to an existing account
    addJointHolder: async (req, res) => {
        try {
            const { id } = req.params;
            const { customer_id } = req.body;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid account ID is required'
                });
            }

            if (!customer_id || isNaN(customer_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid customer ID is required'
                });
            }

            // Check if account exists
            const account = await accountModel.findById(id);
            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Account not found'
                });
            }

            // Check if customer exists
            const customer = await customerModel.findById(customer_id);
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found'
                });
            }

            // Check if already a holder
            const isAlreadyHolder = await accountModel.isAccountHolder(id, customer_id);
            if (isAlreadyHolder) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer is already an account holder'
                });
            }

            // Add joint holder
            const result = await accountModel.addJointHolder(id, customer_id);

            // Get updated holders list
            const holders = await accountModel.getAccountHolders(id);

            res.status(201).json({
                success: true,
                message: 'Joint holder added successfully',
                account_id: parseInt(id),
                new_holder: {
                    customer_id,
                    name: `${customer.first_name} ${customer.last_name}`
                },
                all_holders: holders
            });

        } catch (error) {
            console.error('Add joint holder error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while adding joint holder'
            });
        }
    },

    // get account summary (balance, recent transactions, etc.)
    getAccountSummary: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid account ID is required'
                });
            }
        
            const summary = await accountModel.getAccountSummary(id);
            
            if (!summary) {
                return res.status(404).json({
                    success: false,
                    message: 'Account not found'
                });
            }

            // Get holders for additional info
            const holders = await accountModel.getAccountHolders(id);

            res.json({
                success: true,
                account_summary: {
                    ...summary,
                    holders,
                    formatted_balance: `Rs. ${parseFloat(summary.balance).toFixed(2)}`,
                    total_deposits: parseFloat(summary.total_deposits || 0),
                    total_withdrawals: parseFloat(summary.total_withdrawals || 0),
                    net_flow: parseFloat((summary.total_deposits || 0) - (summary.total_withdrawals || 0))
                }
            });

        } catch (error) {
            console.error('Get account summary error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching account summary',
                error: error.message
            });
        }
    },

    // list all accounts with optional filters (status, branch, saving plan)
    getAllAccounts: async (req, res) => {
        try {
            const { status, branch_id, saving_plan_id } = req.query;
            
            // Build filters object from query params
            const filters = {};
            if (status) filters.status = status;
            if (branch_id) filters.branch_id = parseInt(branch_id);
            if (saving_plan_id) filters.saving_plan_id = parseInt(saving_plan_id);

            const accounts = await accountModel.findAll(filters);

            // For each account, get holders count
            const accountsWithDetails = await Promise.all(
                accounts.map(async (account) => {
                    const holders = await accountModel.getAccountHolders(account.account_id);
                    return {
                        ...account,
                        holder_count: holders.length,
                        account_type: holders.length > 1 ? 'Joint' : 'Single',
                        formatted_balance: `Rs. ${parseFloat(account.balance).toFixed(2)}`
                    };
                })
            );

            res.json({
                success: true,
                count: accounts.length,
                filters: Object.keys(filters).length > 0 ? filters : 'none',
                accounts: accountsWithDetails
            });

        } catch (error) {
            console.error('Get all accounts error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching accounts'
            });
        }
    },

    // manage account settings (plan, status, holders)
    manageAccount: async (req, res) => {
        try {
            const { id } = req.params;
            const { saving_plan_id, status, holder_ids } = req.body;

            if (!id || Number.isNaN(Number(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid account ID is required'
                });
            }

            const existingAccount = await accountModel.findById(id);
            if (!existingAccount) {
                return res.status(404).json({
                    success: false,
                    message: 'Account not found'
                });
            }

            if (saving_plan_id !== undefined && Number.isNaN(Number(saving_plan_id))) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid saving plan ID is required'
                });
            }

            let normalizedStatus;
            if (status !== undefined) {
                const lowered = String(status).toLowerCase();
                if (!['active', 'inactive', 'closed'].includes(lowered)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Status must be active or inactive'
                    });
                }

                normalizedStatus = lowered === 'inactive' ? 'closed' : lowered;

                if (normalizedStatus === 'closed' && Number(existingAccount.balance) > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot set account inactive with positive balance. Withdraw all funds first.'
                    });
                }
            }

            // Update saving plan if provided
            if (saving_plan_id !== undefined) {
                await accountModel.updateSavingPlan(id, Number(saving_plan_id));
            }

            // Update status if provided
            if (normalizedStatus !== undefined) {
                const closedAt = normalizedStatus === 'closed' ? new Date() : null;
                await accountModel.updateStatus(id, normalizedStatus, closedAt);
            }

            // Replace account holders if provided
            if (holder_ids !== undefined) {
                if (!Array.isArray(holder_ids)) {
                    return res.status(400).json({
                        success: false,
                        message: 'holder_ids must be an array of customer IDs'
                    });
                }

                const normalizedHolderIds = [...new Set(holder_ids.map((value) => Number(value)).filter((value) => !Number.isNaN(value)))];

                if (normalizedHolderIds.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'At least one account holder is required'
                    });
                }

                // Validate holder customer records and branch consistency
                for (const holderId of normalizedHolderIds) {
                    const customer = await customerModel.findById(holderId);
                    if (!customer) {
                        return res.status(400).json({
                            success: false,
                            message: `Customer ${holderId} not found`
                        });
                    }

                    if (Number(customer.branch_id) !== Number(existingAccount.branch_id)) {
                        return res.status(400).json({
                            success: false,
                            message: 'All holders must belong to the same branch as the account'
                        });
                    }
                }

                const currentHolders = await accountModel.getAccountHolders(id);
                const currentIds = currentHolders.map((holder) => Number(holder.customer_id));

                const toAdd = normalizedHolderIds.filter((holderId) => !currentIds.includes(holderId));
                const toRemove = currentIds.filter((holderId) => !normalizedHolderIds.includes(holderId));

                for (const holderId of toAdd) {
                    await accountModel.addJointHolder(id, holderId);
                }

                for (const holderId of toRemove) {
                    await accountModel.removeAccountHolder(id, holderId);
                }
            }

            const updatedAccount = await accountModel.findById(id);
            const updatedHolders = await accountModel.getAccountHolders(id);

            return res.json({
                success: true,
                message: 'Account updated successfully',
                account: {
                    ...updatedAccount,
                    holders: updatedHolders,
                    account_type: updatedHolders.length > 1 ? 'Joint' : 'Single'
                }
            });
        } catch (error) {
            console.error('Manage account error:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error while updating account'
            });
        }
    }
};

export default accountController;