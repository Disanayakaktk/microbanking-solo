import transactionModel from '../models/transactionModel.js';
import accountModel from '../models/accountModel.js';

const transactionController = {
    // =============================================
    // 1️⃣ DEPOSIT MONEY
    // =============================================
    deposit: async (req, res) => {
        try {
            const { account_id, amount, description } = req.body;
            const employee_id = req.user.id; // From auth middleware

            // ===== VALIDATION =====
            if (!account_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Account ID is required'
                });
            }

            if (!amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount is required'
                });
            }

            // Check if amount is a positive number
            if (amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount must be greater than zero'
                });
            }

            // Check if amount is not too large (optional safety)
            if (amount > 1000000) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount exceeds maximum deposit limit (1,000,000)'
                });
            }

            // ===== PROCESS DEPOSIT =====
            const result = await transactionModel.deposit({
                account_id,
                amount: parseFloat(amount),
                description: description || 'Cash deposit',
                employee_id
            });

            // Get updated account details for response
            const updatedAccount = await accountModel.findById(account_id);

            res.status(201).json({
                success: true,
                message: 'Deposit successful',
                transaction: {
                    transaction_id: result.transaction_id,
                    reference: result.reference,
                    type: result.type,
                    amount: parseFloat(amount),
                    account_id,
                    new_balance: parseFloat(result.new_balance),
                    timestamp: result.timestamp
                },
                account: {
                    account_id: updatedAccount.account_id,
                    account_number: updatedAccount.account_number,
                    balance: parseFloat(updatedAccount.balance)
                }
            });

        } catch (error) {
            console.error('Deposit error:', error);
            
            // Handle specific error messages
            let message = 'Server error while processing deposit';
            if (error.message === 'Account not found') {
                message = 'Account not found';
            } else if (error.message === 'Cannot deposit to a closed account') {
                message = 'Cannot deposit to a closed account';
            }

            res.status(500).json({
                success: false,
                message,
                error: error.message
            });
        }
    },

    // =============================================
    // 2️⃣ WITHDRAW MONEY
    // =============================================
    withdraw: async (req, res) => {
        try {
            const { account_id, amount, description } = req.body;
            const employee_id = req.user.id;

            // ===== VALIDATION =====
            if (!account_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Account ID is required'
                });
            }

            if (!amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount is required'
                });
            }

            if (amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount must be greater than zero'
                });
            }

            if (amount > 500000) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount exceeds maximum withdrawal limit (500,000)'
                });
            }

            // ===== PROCESS WITHDRAWAL =====
            const result = await transactionModel.withdraw({
                account_id,
                amount: parseFloat(amount),
                description: description || 'Cash withdrawal',
                employee_id
            });

            // Get updated account details
            const updatedAccount = await accountModel.findById(account_id);

            res.status(201).json({
                success: true,
                message: 'Withdrawal successful',
                transaction: {
                    transaction_id: result.transaction_id,
                    reference: result.reference,
                    type: result.type,
                    amount: parseFloat(amount),
                    account_id,
                    new_balance: parseFloat(result.new_balance),
                    timestamp: result.timestamp
                },
                account: {
                    account_id: updatedAccount.account_id,
                    account_number: updatedAccount.account_number,
                    balance: parseFloat(updatedAccount.balance)
                }
            });

        } catch (error) {
            console.error('Withdrawal error:', error);
            
            let message = 'Server error while processing withdrawal';
            if (error.message === 'Account not found') {
                message = 'Account not found';
            } else if (error.message === 'Cannot withdraw from a closed account') {
                message = 'Cannot withdraw from a closed account';
            } else if (error.message === 'Insufficient balance') {
                message = 'Insufficient balance';
            }

            res.status(500).json({
                success: false,
                message,
                error: error.message
            });
        }
    },

    // =============================================
    // 3️⃣ TRANSFER BETWEEN ACCOUNTS
    // =============================================
    transfer: async (req, res) => {
        try {
            const { from_account_id, to_account_id, amount, description } = req.body;
            const employee_id = req.user.id;

            // ===== VALIDATION =====
            if (!from_account_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Source account ID is required'
                });
            }

            if (!to_account_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Destination account ID is required'
                });
            }

            if (!amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount is required'
                });
            }

            if (amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount must be greater than zero'
                });
            }

            if (from_account_id === to_account_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot transfer to the same account'
                });
            }

            if (amount > 500000) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount exceeds maximum transfer limit (500,000)'
                });
            }

            // ===== PROCESS TRANSFER =====
            const result = await transactionModel.transfer({
                from_account_id,
                to_account_id,
                amount: parseFloat(amount),
                description: description || 'Transfer between accounts',
                employee_id
            });

            // Get updated account details
            const fromAccount = await accountModel.findById(from_account_id);
            const toAccount = await accountModel.findById(to_account_id);

            res.status(201).json({
                success: true,
                message: 'Transfer successful',
                transaction: {
                    reference: result.reference,
                    type: result.type,
                    amount: parseFloat(amount),
                    timestamp: result.timestamp
                },
                from_account: {
                    account_id: from_account_id,
                    account_number: fromAccount.account_number,
                    new_balance: parseFloat(fromAccount.balance),
                    old_balance: parseFloat(result.from_account.new_balance) + parseFloat(amount)
                },
                to_account: {
                    account_id: to_account_id,
                    account_number: toAccount.account_number,
                    new_balance: parseFloat(toAccount.balance),
                    old_balance: parseFloat(result.to_account.new_balance) - parseFloat(amount)
                }
            });

        } catch (error) {
            console.error('Transfer error:', error);
            
            let message = 'Server error while processing transfer';
            if (error.message === 'Source account not found') {
                message = 'Source account not found';
            } else if (error.message === 'Destination account not found') {
                message = 'Destination account not found';
            } else if (error.message === 'Cannot transfer from a closed account') {
                message = 'Cannot transfer from a closed account';
            } else if (error.message === 'Cannot transfer to a closed account') {
                message = 'Cannot transfer to a closed account';
            } else if (error.message === 'Insufficient balance') {
                message = 'Insufficient balance in source account';
            } else if (error.message === 'Cannot transfer to the same account') {
                message = 'Cannot transfer to the same account';
            }

            res.status(500).json({
                success: false,
                message,
                error: error.message
            });
        }
    },

    // =============================================
    // 4️⃣ GET TRANSACTION HISTORY FOR AN ACCOUNT
    // =============================================
    getAccountTransactions: async (req, res) => {
        try {
            const { accountId } = req.params;
            const { limit = 50, offset = 0 } = req.query;

            if (!accountId || isNaN(accountId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid account ID is required'
                });
            }

            // Check if account exists
            const account = await accountModel.findById(accountId);
            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Account not found'
                });
            }

            const transactions = await transactionModel.getAccountTransactions(
                accountId, 
                parseInt(limit), 
                parseInt(offset)
            );

            // Get account summary for additional info
            const summary = await transactionModel.getAccountSummary(accountId);

            res.json({
                success: true,
                account: {
                    account_id: account.account_id,
                    account_number: account.account_number,
                    current_balance: parseFloat(account.balance)
                },
                summary: {
                    transaction_count: parseInt(summary?.transaction_count || 0),
                    total_deposits: parseFloat(summary?.total_deposits || 0),
                    total_withdrawals: parseFloat(summary?.total_withdrawals || 0)
                },
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    returned: transactions.length
                },
                transactions: transactions.map(t => ({
                    transaction_id: t.transaction_id,
                    transfer_id: t.transfer_id,
                    account_number: t.account_number,
                    counterparty_account_number: t.counterparty_account_number,
                    type: t.transaction_type,
                    amount: parseFloat(t.amount),
                    description: t.description,
                    timestamp: t.time,
                    agent_branch: t.employee_branch_name || t.account_branch_name || 'N/A',
                    channel: t.transfer_id ? 'Transfer' : 'Cash',
                    transfer_direction: t.transfer_id
                        ? (t.transaction_type === 'Withdrawal' ? 'Outbound' : 'Inbound')
                        : '-',
                    employee: t.employee_first_name ? 
                        `${t.employee_first_name} ${t.employee_last_name}` : 
                        'System'
                }))
            });

        } catch (error) {
            console.error('Get transactions error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching transactions'
            });
        }
    },

    // =============================================
    // 5️⃣ GET SINGLE TRANSACTION BY ID
    // =============================================
    getTransactionById: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid transaction ID is required'
                });
            }

            const transaction = await transactionModel.findById(id);

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            res.json({
                success: true,
                transaction: {
                    transaction_id: transaction.transaction_id,
                    reference: `TXN-${new Date(transaction.time).getFullYear()}${String(new Date(transaction.time).getMonth()+1).padStart(2,'0')}${String(new Date(transaction.time).getDate()).padStart(2,'0')}-${transaction.transaction_id}`,
                    type: transaction.transaction_type,
                    amount: parseFloat(transaction.amount),
                    description: transaction.description,
                    timestamp: transaction.time,
                    account: {
                        account_id: transaction.account_id,
                        account_number: transaction.account_number
                    },
                    employee: transaction.employee_first_name ? 
                        `${transaction.employee_first_name} ${transaction.employee_last_name}` : 
                        'System'
                }
            });

        } catch (error) {
            console.error('Get transaction error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching transaction'
            });
        }
    },

    // =============================================
    // 6️⃣ GET DAILY TRANSACTION REPORT (Manager only)
    // =============================================
    getDailyReport: async (req, res) => {
        try {
            const { date } = req.query;
            
            // Use today's date if not provided
            const reportDate = date || new Date().toISOString().split('T')[0];

            const summary = await transactionModel.getDailySummary(reportDate);
            
            // Get detailed transactions for the day
            const transactions = await transactionModel.getTransactionsByDateRange(
                reportDate, 
                reportDate
            );

            res.json({
                success: true,
                report_date: reportDate,
                summary: {
                    total_transactions: parseInt(summary?.total_transactions || 0),
                    deposits: {
                        count: parseInt(summary?.deposit_count || 0),
                        total: parseFloat(summary?.total_deposits || 0)
                    },
                    withdrawals: {
                        count: parseInt(summary?.withdrawal_count || 0),
                        total: parseFloat(summary?.total_withdrawals || 0)
                    },
                    transfers: {
                        count: parseInt(summary?.transfer_count || 0),
                        total: parseFloat(summary?.total_transfers || 0)
                    }
                },
                transactions: transactions.map(t => ({
                    transaction_id: t.transaction_id,
                    type: t.transaction_type,
                    amount: parseFloat(t.amount),
                    account_number: t.account_number,
                    branch: t.branch_name,
                    time: t.time,
                    employee: t.employee_username
                }))
            });

        } catch (error) {
            console.error('Daily report error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while generating daily report'
            });
        }
    },

    // =============================================
    // 7️⃣ GET MONTHLY TRANSACTION REPORT (Manager only)
    // =============================================
    getMonthlyReport: async (req, res) => {
        try {
            const { year, month } = req.query;
            
            if (!year || !month) {
                return res.status(400).json({
                    success: false,
                    message: 'Year and month are required'
                });
            }

            // Calculate first and last day of month
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

            const transactions = await transactionModel.getTransactionsByDateRange(startDate, endDate);

            // Calculate monthly summary
            const summary = {
                total_transactions: transactions.length,
                total_deposits: 0,
                total_withdrawals: 0,
                total_transfers: 0,
                deposit_count: 0,
                withdrawal_count: 0,
                transfer_count: 0
            };

            transactions.forEach(t => {
                const amount = parseFloat(t.amount);
                if (t.transaction_type === 'Deposit') {
                    summary.total_deposits += amount;
                    summary.deposit_count++;
                } else if (t.transaction_type === 'Withdrawal') {
                    summary.total_withdrawals += amount;
                    summary.withdrawal_count++;
                } else if (t.transaction_type === 'Transfer') {
                    summary.total_transfers += amount;
                    summary.transfer_count++;
                }
            });

            // Group by day for chart data
            const dailyGroups = {};
            transactions.forEach(t => {
                const day = new Date(t.time).getDate();
                if (!dailyGroups[day]) {
                    dailyGroups[day] = {
                        day,
                        deposits: 0,
                        withdrawals: 0,
                        transfers: 0,
                        count: 0
                    };
                }
                const amount = parseFloat(t.amount);
                if (t.transaction_type === 'Deposit') dailyGroups[day].deposits += amount;
                if (t.transaction_type === 'Withdrawal') dailyGroups[day].withdrawals += amount;
                if (t.transaction_type === 'Transfer') dailyGroups[day].transfers += amount;
                dailyGroups[day].count++;
            });

            res.json({
                success: true,
                report: {
                    year: parseInt(year),
                    month: parseInt(month),
                    month_name: new Date(year, month-1, 1).toLocaleString('default', { month: 'long' })
                },
                summary: {
                    total_transactions: summary.total_transactions,
                    deposits: {
                        count: summary.deposit_count,
                        total: summary.total_deposits
                    },
                    withdrawals: {
                        count: summary.withdrawal_count,
                        total: summary.total_withdrawals
                    },
                    transfers: {
                        count: summary.transfer_count,
                        total: summary.total_transfers
                    },
                    net_flow: summary.total_deposits - summary.total_withdrawals
                },
                daily_breakdown: Object.values(dailyGroups).sort((a,b) => a.day - b.day)
            });

        } catch (error) {
            console.error('Monthly report error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while generating monthly report'
            });
        }
    },

    // =============================================
    // 8️⃣ GET ACCOUNT TRANSACTION SUMMARY
    // =============================================
    getAccountTransactionSummary: async (req, res) => {
        try {
            const { accountId } = req.params;

            if (!accountId || isNaN(accountId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid account ID is required'
                });
            }

            // Check if account exists
            const account = await accountModel.findById(accountId);
            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Account not found'
                });
            }

            const summary = await transactionModel.getAccountSummary(accountId);

            res.json({
                success: true,
                account: {
                    account_id: account.account_id,
                    account_number: account.account_number,
                    current_balance: parseFloat(account.balance)
                },
                summary: {
                    transaction_count: parseInt(summary?.transaction_count || 0),
                    total_deposits: parseFloat(summary?.total_deposits || 0),
                    total_withdrawals: parseFloat(summary?.total_withdrawals || 0),
                    largest_transaction: parseFloat(summary?.largest_transaction || 0),
                    smallest_transaction: parseFloat(summary?.smallest_transaction || 0),
                    first_transaction: summary?.first_transaction,
                    last_transaction: summary?.last_transaction
                }
            });

        } catch (error) {
            console.error('Account summary error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching account summary'
            });
        }
    }

};

export default transactionController;