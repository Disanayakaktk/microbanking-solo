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
                    holders
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
                    holders
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

            res.json({
                success: true,
                count: accounts.length,
                customer: {
                    id: customer.customer_id,
                    name: `${customer.first_name} ${customer.last_name}`
                },
                accounts
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
    }
};

export default accountController;