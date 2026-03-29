import db from '../config/database.js';

const transactionModel = {
    // Generate transaction reference number
    generateReference: async () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        // Format: TXN-YYYYMMDD-HHMMSS-XXXX
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        
        return `TXN-${year}${month}${day}-${hours}${minutes}${seconds}-${randomPart}`;
    },

    // =============================================
    // DEPOSIT TRANSACTION
    // =============================================
    deposit: async (transactionData) => {
        const { 
            account_id, 
            amount, 
            description, 
            employee_id 
        } = transactionData;

        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Check if account exists and is active
            const accountCheck = await client.query(
                'SELECT balance, account_status FROM accounts WHERE account_id = $1',
                [account_id]
            );

            if (accountCheck.rows.length === 0) {
                throw new Error('Account not found');
            }

            if (accountCheck.rows[0].account_status !== 'active') {
                throw new Error('Cannot deposit to a closed account');
            }

            // Get current balance
            const currentBalance = parseFloat(accountCheck.rows[0].balance);
            const newBalance = currentBalance + amount;

            // Update account balance
            await client.query(
                'UPDATE accounts SET balance = $1 WHERE account_id = $2',
                [newBalance, account_id]
            );

            // Generate reference number
            const reference = await transactionModel.generateReference();

            // Record transaction
            const transactionResult = await client.query(
                `INSERT INTO transactions 
                 (transaction_type, amount, time, description, account_id, employee_id, created_at) 
                 VALUES ($1, $2, NOW(), $3, $4, $5, NOW()) 
                 RETURNING transaction_id`,
                ['Deposit', amount, description || 'Cash deposit', account_id, employee_id]
            );

            // Record in audit log
            await client.query(
                `INSERT INTO transaction_audit_log 
                 (transaction_type, amount, attempted_time, description, account_id, employee_id, status, created_at) 
                 VALUES ($1, $2, NOW(), $3, $4, $5, $6, NOW())`,
                ['Deposit', amount, description || 'Cash deposit', account_id, employee_id, 'success']
            );

            await client.query('COMMIT');
            
            return {
                transaction_id: transactionResult.rows[0].transaction_id,
                reference,
                type: 'Deposit',
                amount,
                new_balance: newBalance,
                account_id,
                timestamp: new Date()
            };

        } catch (error) {
            await client.query('ROLLBACK');
            
            // Log failed attempt
            await client.query(
                `INSERT INTO transaction_audit_log 
                 (transaction_type, amount, attempted_time, description, account_id, employee_id, status, error_message, created_at) 
                 VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, NOW())`,
                ['Deposit', amount, description || 'Cash deposit', account_id, employee_id, 'failure', error.message]
            ).catch(err => console.error('Audit log error:', err));
            
            throw error;
        } finally {
            client.release();
        }
    },

    // =============================================
    // WITHDRAWAL TRANSACTION
    // =============================================
    withdraw: async (transactionData) => {
        const { 
            account_id, 
            amount, 
            description, 
            employee_id 
        } = transactionData;

        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Check if account exists and is active
            const accountCheck = await client.query(
                'SELECT balance, account_status FROM accounts WHERE account_id = $1',
                [account_id]
            );

            if (accountCheck.rows.length === 0) {
                throw new Error('Account not found');
            }

            if (accountCheck.rows[0].account_status !== 'active') {
                throw new Error('Cannot withdraw from a closed account');
            }

            // Get current balance
            const currentBalance = parseFloat(accountCheck.rows[0].balance);
            
            // Check sufficient balance
            if (currentBalance < amount) {
                throw new Error('Insufficient balance');
            }

            const newBalance = currentBalance - amount;

            // Update account balance
            await client.query(
                'UPDATE accounts SET balance = $1 WHERE account_id = $2',
                [newBalance, account_id]
            );

            // Generate reference number
            const reference = await transactionModel.generateReference();

            // Record transaction
            const transactionResult = await client.query(
                `INSERT INTO transactions 
                 (transaction_type, amount, time, description, account_id, employee_id, created_at) 
                 VALUES ($1, $2, NOW(), $3, $4, $5, NOW()) 
                 RETURNING transaction_id`,
                ['Withdrawal', amount, description || 'Cash withdrawal', account_id, employee_id]
            );

            // Record in audit log
            await client.query(
                `INSERT INTO transaction_audit_log 
                 (transaction_type, amount, attempted_time, description, account_id, employee_id, status, created_at) 
                 VALUES ($1, $2, NOW(), $3, $4, $5, $6, NOW())`,
                ['Withdrawal', amount, description || 'Cash withdrawal', account_id, employee_id, 'success']
            );

            await client.query('COMMIT');
            
            return {
                transaction_id: transactionResult.rows[0].transaction_id,
                reference,
                type: 'Withdrawal',
                amount,
                new_balance: newBalance,
                account_id,
                timestamp: new Date()
            };

        } catch (error) {
            await client.query('ROLLBACK');
            
            // Log failed attempt
            await client.query(
                `INSERT INTO transaction_audit_log 
                 (transaction_type, amount, attempted_time, description, account_id, employee_id, status, error_message, created_at) 
                 VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, NOW())`,
                ['Withdrawal', amount, description || 'Cash withdrawal', account_id, employee_id, 'failure', error.message]
            ).catch(err => console.error('Audit log error:', err));
            
            throw error;
        } finally {
            client.release();
        }
    },

     // =============================================
    // TRANSFER BETWEEN ACCOUNTS
    // =============================================
    transfer: async (transactionData) => {
        const { 
            from_account_id, 
            to_account_id, 
            amount, 
            description, 
            employee_id 
        } = transactionData;

        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');

            const transferGroupResult = await client.query(
                `SELECT nextval('transfer_group_seq') AS transfer_id`
            );
            const transfer_id = Number(transferGroupResult.rows[0].transfer_id);

            // Check if source account exists and is active
            const sourceCheck = await client.query(
                'SELECT balance, account_status, account_number FROM accounts WHERE account_id = $1',
                [from_account_id]
            );

            if (sourceCheck.rows.length === 0) {
                throw new Error('Source account not found');
            }

            if (sourceCheck.rows[0].account_status !== 'active') {
                throw new Error('Cannot transfer from a closed account');
            }

            // Check if destination account exists and is active
            const destCheck = await client.query(
                'SELECT account_status, account_number FROM accounts WHERE account_id = $1',
                [to_account_id]
            );

            if (destCheck.rows.length === 0) {
                throw new Error('Destination account not found');
            }

            if (destCheck.rows[0].account_status !== 'active') {
                throw new Error('Cannot transfer to a closed account');
            }

            // Check if transferring to same account
            if (from_account_id === to_account_id) {
                throw new Error('Cannot transfer to the same account');
            }

            // Get current balance
            const currentBalance = parseFloat(sourceCheck.rows[0].balance);
            
            // Check sufficient balance
            if (currentBalance < amount) {
                throw new Error('Insufficient balance');
            }

            const newSourceBalance = currentBalance - amount;

            // Update source account balance (withdraw)
            await client.query(
                'UPDATE accounts SET balance = $1 WHERE account_id = $2',
                [newSourceBalance, from_account_id]
            );

            // Get destination current balance and update (deposit)
            const destBalanceResult = await client.query(
                'SELECT balance FROM accounts WHERE account_id = $1',
                [to_account_id]
            );
            const destCurrentBalance = parseFloat(destBalanceResult.rows[0].balance);
            const newDestBalance = destCurrentBalance + amount;

            await client.query(
                'UPDATE accounts SET balance = $1 WHERE account_id = $2',
                [newDestBalance, to_account_id]
            );

            // Generate reference number
            const reference = await transactionModel.generateReference();

            // Record withdrawal transaction for source account
            await client.query(
                `INSERT INTO transactions 
                 (transfer_id, transaction_type, amount, time, description, account_id, employee_id, created_at) 
                 VALUES ($1, $2, $3, NOW(), $4, $5, $6, NOW())`,
                [
                    transfer_id,
                    'Withdrawal',
                    amount,
                    `Transfer to ${destCheck.rows[0].account_number}${description ? ` | ${description}` : ''}`,
                    from_account_id,
                    employee_id
                ]
            );

            // Record deposit transaction for destination account
            await client.query(
                `INSERT INTO transactions 
                 (transfer_id, transaction_type, amount, time, description, account_id, employee_id, created_at) 
                 VALUES ($1, $2, $3, NOW(), $4, $5, $6, NOW())`,
                [
                    transfer_id,
                    'Deposit',
                    amount,
                    `Transfer from ${sourceCheck.rows[0].account_number}${description ? ` | ${description}` : ''}`,
                    to_account_id,
                    employee_id
                ]
            );

            // Record in audit log
            await client.query(
                `INSERT INTO transaction_audit_log 
                 (transaction_type, amount, attempted_time, description, account_id, employee_id, status, created_at) 
                 VALUES ($1, $2, NOW(), $3, $4, $5, $6, NOW())`,
                ['Withdrawal', amount, description || 'Transfer between accounts', from_account_id, employee_id, 'success']
            );

            await client.query('COMMIT');
            
            return {
                reference,
                transfer_id,
                type: 'Transfer',
                amount,
                from_account: {
                    account_id: from_account_id,
                    new_balance: newSourceBalance
                },
                to_account: {
                    account_id: to_account_id,
                    new_balance: newDestBalance
                },
                timestamp: new Date()
            };

        } catch (error) {
            await client.query('ROLLBACK');
            
            // Log failed attempt
            await client.query(
                `INSERT INTO transaction_audit_log 
                 (transaction_type, amount, attempted_time, description, account_id, employee_id, status, error_message, created_at) 
                 VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, NOW())`,
                ['Withdrawal', amount, description || 'Transfer between accounts', from_account_id, employee_id, 'failure', error.message]
            ).catch(err => console.error('Audit log error:', err));
            
            throw error;
        } finally {
            client.release();
        }
    },

    // =============================================
    // GET TRANSACTION HISTORY FOR AN ACCOUNT
    // =============================================
    getAccountTransactions: async (account_id, limit = 50, offset = 0) => {
        const result = await db.query(
            `SELECT t.*,
                    a.account_number,
                    e.first_name as employee_first_name,
                    e.last_name as employee_last_name,
                    eb.branch_name as employee_branch_name,
                      ab.branch_name as account_branch_name,
                                        cp.account_number as counterparty_account_number
             FROM transactions t
             JOIN accounts a ON t.account_id = a.account_id
                  LEFT JOIN branch ab ON a.branch_id = ab.branch_id
             LEFT JOIN employees e ON t.employee_id = e.employee_id
             LEFT JOIN branch eb ON e.branch_id = eb.branch_id
                         LEFT JOIN transactions t_pair
                             ON t.transfer_id IS NOT NULL
                            AND t_pair.transfer_id = t.transfer_id
                            AND t_pair.transaction_id <> t.transaction_id
                         LEFT JOIN accounts cp ON cp.account_id = t_pair.account_id
             WHERE t.account_id = $1
             ORDER BY t.time DESC
             LIMIT $2 OFFSET $3`,
            [account_id, limit, offset]
        );
        return result.rows;
    },

    // =============================================
    // GET SINGLE TRANSACTION BY ID
    // =============================================
    findById: async (transaction_id) => {
        const result = await db.query(
            `SELECT t.*, 
                    a.account_number,
                    e.first_name as employee_first_name,
                    e.last_name as employee_last_name
             FROM transactions t
             JOIN accounts a ON t.account_id = a.account_id
             LEFT JOIN employees e ON t.employee_id = e.employee_id
             WHERE t.transaction_id = $1`,
            [transaction_id]
        );
        return result.rows[0];
    },

    // =============================================
    // GET TRANSACTIONS BY DATE RANGE (for reports)
    // =============================================
    getTransactionsByDateRange: async (startDate, endDate, branch_id = null) => {
        let query = `
            SELECT t.*, 
                   a.account_number,
                   a.branch_id,
                   b.branch_name,
                   e.username as employee_username
            FROM transactions t
            JOIN accounts a ON t.account_id = a.account_id
            LEFT JOIN branch b ON a.branch_id = b.branch_id
            LEFT JOIN employees e ON t.employee_id = e.employee_id
            WHERE DATE(t.time) BETWEEN $1 AND $2`;

        const params = [startDate, endDate];

        if (branch_id) {
            query += ` AND a.branch_id = $3`;
            params.push(branch_id);
        }

        query += ` ORDER BY t.time DESC`;

        const result = await db.query(query, params);
        return result.rows;
    },

    // =============================================
    // GET DAILY TRANSACTION SUMMARY
    // =============================================
    getDailySummary: async (date) => {
        const result = await db.query(
            `SELECT 
                COUNT(*) as total_transactions,
                SUM(CASE WHEN transaction_type = 'Deposit' THEN 1 ELSE 0 END) as deposit_count,
                SUM(CASE WHEN transaction_type = 'Withdrawal' THEN 1 ELSE 0 END) as withdrawal_count,
                SUM(CASE WHEN description ILIKE 'Transfer %' AND transaction_type IN ('Deposit', 'Withdrawal') THEN 1 ELSE 0 END) as transfer_count,
                SUM(CASE WHEN transaction_type = 'Deposit' THEN amount ELSE 0 END) as total_deposits,
                SUM(CASE WHEN transaction_type = 'Withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
                SUM(CASE WHEN description ILIKE 'Transfer %' AND transaction_type IN ('Deposit', 'Withdrawal') THEN amount ELSE 0 END) as total_transfers
             FROM transactions
             WHERE DATE(time) = $1`,
            [date]
        );
        return result.rows[0];
    },

     // =============================================
    // GET TRANSACTION SUMMARY BY ACCOUNT
    // =============================================
    getAccountSummary: async (account_id) => {
        const result = await db.query(
            `SELECT 
                COUNT(*) as transaction_count,
                SUM(CASE WHEN transaction_type = 'Deposit' THEN amount ELSE 0 END) as total_deposits,
                SUM(CASE WHEN transaction_type = 'Withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
                MAX(amount) as largest_transaction,
                MIN(amount) as smallest_transaction,
                MIN(time) as first_transaction,
                MAX(time) as last_transaction
             FROM transactions
             WHERE account_id = $1`,
            [account_id]
        );
        return result.rows[0];
    }
};

export default transactionModel;