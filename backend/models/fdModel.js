import db from '../config/database.js';

const DEFAULT_MIN_FD_AMOUNT = 10000;
const DEFAULT_FD_PENALTY_RATE = 1.0;

const fdModel = {
    // =============================================
    // FD PLAN MANAGEMENT
    // =============================================

    // Create new FD plan (Admin only)
    createPlan: async (planData) => {
        const { fd_options, interest } = planData;
        
        const result = await db.query(
            `INSERT INTO fd_plans (fd_options, interest, created_at) 
             VALUES ($1, $2, NOW()) 
             RETURNING fd_plan_id,
                       fd_options,
                       interest,
                       created_at,
                       $3::numeric AS min_amount,
                       $4::numeric AS penalty_rate`,
            [fd_options, interest, DEFAULT_MIN_FD_AMOUNT, DEFAULT_FD_PENALTY_RATE]
        );
        return result.rows[0];
    },

    // Get all FD plans
    getAllPlans: async () => {
        const result = await db.query(
            `SELECT fd_plan_id,
                    fd_options,
                    interest,
                    created_at,
                    ${DEFAULT_MIN_FD_AMOUNT}::numeric AS min_amount,
                    ${DEFAULT_FD_PENALTY_RATE}::numeric AS penalty_rate
             FROM fd_plans
             ORDER BY 
             CASE fd_options
                WHEN '6 months' THEN 1
                WHEN '1 year' THEN 2
                WHEN '3 years' THEN 3
                WHEN '5 years' THEN 4
             END`
        );
        return result.rows;
    },

    // Get FD plan by ID
    getPlanById: async (plan_id) => {
        const result = await db.query(
            `SELECT fd_plan_id,
                    fd_options,
                    interest,
                    created_at,
                    ${DEFAULT_MIN_FD_AMOUNT}::numeric AS min_amount,
                    ${DEFAULT_FD_PENALTY_RATE}::numeric AS penalty_rate
             FROM fd_plans
             WHERE fd_plan_id = $1`,
            [plan_id]
        );
        return result.rows[0];
    },

    // Update FD plan (Admin only)
    updatePlan: async (plan_id, planData) => {
        const { fd_options, interest } = planData;
        
        const result = await db.query(
            `UPDATE fd_plans 
             SET fd_options = COALESCE($1, fd_options),
                 interest = COALESCE($2, interest)
             WHERE fd_plan_id = $3
             RETURNING fd_plan_id,
                       fd_options,
                       interest,
                       created_at,
                       ${DEFAULT_MIN_FD_AMOUNT}::numeric AS min_amount,
                       ${DEFAULT_FD_PENALTY_RATE}::numeric AS penalty_rate`,
            [fd_options, interest, plan_id]
        );
        return result.rows[0];
    },

    // =============================================
    // FD INVESTMENT MANAGEMENT
    // =============================================

    // Create new FD investment (Agent only)
    createInvestment: async (investmentData) => {
        const { 
            customer_id, 
            account_id, 
            fd_plan_id, 
            fd_balance, 
            auto_renewal,
            open_date = new Date().toISOString().split('T')[0]
        } = investmentData;

        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Check if source account has sufficient balance
            const accountCheck = await client.query(
                `SELECT a.balance,
                        a.fd_id,
                        fd.fd_status
                 FROM accounts a
                 LEFT JOIN fixed_deposits fd ON a.fd_id = fd.fd_id
                 WHERE a.account_id = $1`,
                [account_id]
            );

            if (accountCheck.rows.length === 0) {
                throw new Error('Source account not found');
            }

            if (accountCheck.rows[0].fd_id && accountCheck.rows[0].fd_status !== 'closed') {
                throw new Error('Account already has an active FD investment');
            }

            const currentBalance = parseFloat(accountCheck.rows[0].balance);
            if (currentBalance < fd_balance) {
                throw new Error('Insufficient balance in source account');
            }

            // Get plan details to check minimum amount
            const planCheck = await client.query(
                'SELECT * FROM fd_plans WHERE fd_plan_id = $1',
                [fd_plan_id]
            );

            if (planCheck.rows.length === 0) {
                throw new Error('FD plan not found');
            }

            const minAmount = DEFAULT_MIN_FD_AMOUNT;
            if (fd_balance < minAmount) {
                throw new Error(`Minimum FD amount is Rs. ${minAmount}`);
            }

            // Deduct amount from source account
            const newBalance = currentBalance - fd_balance;
            await client.query(
                'UPDATE accounts SET balance = $1 WHERE account_id = $2',
                [newBalance, account_id]
            );

            // Create FD
            const fdResult = await client.query(
                `INSERT INTO fixed_deposits 
                 (fd_balance, auto_renewal, fd_status, open_date, fd_plan_id, created_at) 
                 VALUES ($1, $2, 'active', $3, $4, NOW()) 
                 RETURNING fd_id`,
                [fd_balance, auto_renewal || false, open_date, fd_plan_id]
            );

            const fd_id = fdResult.rows[0].fd_id;

            await client.query(
                'UPDATE accounts SET fd_id = $1 WHERE account_id = $2',
                [fd_id, account_id]
            );

            // Record initial transaction (withdrawal from account)
            await client.query(
                `INSERT INTO transactions 
                 (transaction_type, amount, time, description, account_id, created_at) 
                 VALUES ($1, $2, NOW(), $3, $4, NOW())`,
                ['Withdrawal', fd_balance, `FD Investment #${fd_id}`, account_id]
            );

            await client.query('COMMIT');
            
            return { fd_id };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // Get FD by ID with all details
    getFDById: async (fd_id) => {
        const result = await db.query(
            `SELECT fd.*, 
                    fp.fd_options,
                    fp.interest as interest_rate,
                    ${DEFAULT_MIN_FD_AMOUNT}::numeric AS min_amount,
                    ${DEFAULT_FD_PENALTY_RATE}::numeric AS penalty_rate,
                    a.account_id,
                    a.account_number,
                    a.balance as account_balance,
                    (SELECT json_agg(
                        json_build_object(
                            'customer_id', c.customer_id,
                            'first_name', c.first_name,
                            'last_name', c.last_name,
                            'nic', c.nic
                        )
                     ) FROM takes t 
                       JOIN customers c ON t.customer_id = c.customer_id 
                              WHERE t.account_id = a.account_id) as account_holders,
                    (SELECT COALESCE(SUM(interest_amount), 0) 
                     FROM fd_interest_calculation 
                     WHERE fd_id = fd.fd_id) as total_interest_earned,
                    (SELECT COUNT(*) 
                     FROM fd_interest_calculation 
                     WHERE fd_id = fd.fd_id) as interest_calculations_count
             FROM fixed_deposits fd
             JOIN fd_plans fp ON fd.fd_plan_id = fp.fd_plan_id
             LEFT JOIN accounts a ON a.fd_id = fd.fd_id
             WHERE fd.fd_id = $1`,
            [fd_id]
        );
        return result.rows[0];
    },

    // Get FDs by customer ID (through account)
    getFDsByCustomerId: async (customer_id) => {
        const result = await db.query(
            `SELECT fd.*, 
                    fp.fd_options,
                    fp.interest as interest_rate,
                    a.account_id,
                    a.account_number,
                    (SELECT COALESCE(SUM(interest_amount), 0) 
                     FROM fd_interest_calculation 
                     WHERE fd_id = fd.fd_id) as total_interest_earned
             FROM fixed_deposits fd
             JOIN fd_plans fp ON fd.fd_plan_id = fp.fd_plan_id
                 JOIN accounts a ON a.fd_id = fd.fd_id
             JOIN takes t ON a.account_id = t.account_id
             WHERE t.customer_id = $1
             ORDER BY fd.open_date DESC`,
            [customer_id]
        );
        return result.rows;
    },

    // Get maturing FDs (next X days) - Manager only
    getMaturingFDs: async (days = 30) => {
        const result = await db.query(
            `SELECT fd.*, 
                    fp.fd_options,
                    fp.interest as interest_rate,
                    a.account_id,
                    a.account_number,
                    (fd.open_date + 
                        CASE 
                            WHEN fp.fd_options = '6 months' THEN INTERVAL '6 months'
                            WHEN fp.fd_options = '1 year' THEN INTERVAL '1 year'
                            WHEN fp.fd_options = '3 years' THEN INTERVAL '3 years'
                            WHEN fp.fd_options = '5 years' THEN INTERVAL '5 years'
                        END) as maturity_date,
                    (SELECT customer_id FROM takes WHERE account_id = a.account_id LIMIT 1) as customer_id
             FROM fixed_deposits fd
             JOIN fd_plans fp ON fd.fd_plan_id = fp.fd_plan_id
             LEFT JOIN accounts a ON a.fd_id = fd.fd_id
             WHERE fd.fd_status = 'active'
             AND (fd.open_date + 
                 CASE 
                     WHEN fp.fd_options = '6 months' THEN INTERVAL '6 months'
                     WHEN fp.fd_options = '1 year' THEN INTERVAL '1 year'
                     WHEN fp.fd_options = '3 years' THEN INTERVAL '3 years'
                     WHEN fp.fd_options = '5 years' THEN INTERVAL '5 years'
                 END) BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 || ' days')::INTERVAL
             ORDER BY maturity_date`,
            [days]
        );
        return result.rows;
    },

    // =============================================
    // FD ACTIONS (Agent only - Manual)
    // =============================================

    // Renew matured FD (Manual - Agent only)
    renewFD: async (old_fd_id, new_principal, new_plan_id, employee_id) => {
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Get old FD details
            const oldFD = await client.query(
                `SELECT fd.auto_renewal,
                        a.account_id
                 FROM fixed_deposits fd
                 LEFT JOIN accounts a ON a.fd_id = fd.fd_id
                 WHERE fd.fd_id = $1`,
                [old_fd_id]
            );

            if (oldFD.rows.length === 0) {
                throw new Error('FD not found');
            }

            const { account_id, auto_renewal } = oldFD.rows[0];

            if (!account_id) {
                throw new Error('Linked account not found for FD');
            }

            // Mark old FD as matured
            await client.query(
                `UPDATE fixed_deposits 
                 SET fd_status = 'matured' 
                 WHERE fd_id = $1`,
                [old_fd_id]
            );

            // Create new FD
            const newFD = await client.query(
                `INSERT INTO fixed_deposits 
                 (fd_balance, auto_renewal, fd_status, open_date, fd_plan_id, created_at)
                 VALUES ($1, $2, 'active', CURRENT_DATE, $3, NOW())
                 RETURNING fd_id`,
                [new_principal, auto_renewal, new_plan_id]
            );

            await client.query(
                'UPDATE accounts SET fd_id = $1 WHERE account_id = $2',
                [newFD.rows[0].fd_id, account_id]
            );

            // Record transaction (renewal)
            await client.query(
                `INSERT INTO transactions 
                 (transaction_type, amount, time, description, account_id, employee_id, created_at) 
                 VALUES ($1, $2, NOW(), $3, $4, $5, NOW())`,
                ['Withdrawal', new_principal, `FD Renewal #${old_fd_id} -> #${newFD.rows[0].fd_id}`, account_id, employee_id]
            );

            await client.query('COMMIT');
            
            return {
                new_fd_id: newFD.rows[0].fd_id,
                new_principal
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // Close FD early with penalty (Manual - Agent only)
    closeFDEarly: async (fd_id, account_id, final_amount, penalty, employee_id) => {
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Mark FD as closed
            await client.query(
                `UPDATE fixed_deposits 
                 SET fd_status = 'closed' 
                 WHERE fd_id = $1`,
                [fd_id]
            );

            // Get current account balance
            const accountCheck = await client.query(
                'SELECT balance FROM accounts WHERE account_id = $1',
                [account_id]
            );

            const currentBalance = parseFloat(accountCheck.rows[0].balance);
            const newBalance = currentBalance + final_amount;

            // Credit final amount back to account
            await client.query(
                'UPDATE accounts SET balance = $1 WHERE account_id = $2',
                [newBalance, account_id]
            );

            await client.query(
                'UPDATE accounts SET fd_id = NULL WHERE account_id = $1 AND fd_id = $2',
                [account_id, fd_id]
            );

            // Record transaction
            await client.query(
                `INSERT INTO transactions 
                 (transaction_type, amount, time, description, account_id, employee_id, created_at) 
                 VALUES ($1, $2, NOW(), $3, $4, $5, NOW())`,
                ['Deposit', final_amount, `FD Early Closure #${fd_id} (Penalty: Rs. ${penalty})`, account_id, employee_id]
            );

            await client.query('COMMIT');

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // Withdraw matured FD (no renewal) - Manual - Agent only
    withdrawFD: async (fd_id, account_id, total_amount, employee_id) => {
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Mark FD as closed
            await client.query(
                `UPDATE fixed_deposits 
                 SET fd_status = 'closed' 
                 WHERE fd_id = $1`,
                [fd_id]
            );

            // Get current account balance
            const accountCheck = await client.query(
                'SELECT balance FROM accounts WHERE account_id = $1',
                [account_id]
            );

            const currentBalance = parseFloat(accountCheck.rows[0].balance);
            const newBalance = currentBalance + total_amount;

            // Credit amount back to account
            await client.query(
                'UPDATE accounts SET balance = $1 WHERE account_id = $2',
                [newBalance, account_id]
            );

            await client.query(
                'UPDATE accounts SET fd_id = NULL WHERE account_id = $1 AND fd_id = $2',
                [account_id, fd_id]
            );

            // Record transaction
            await client.query(
                `INSERT INTO transactions 
                 (transaction_type, amount, time, description, account_id, employee_id, created_at) 
                 VALUES ($1, $2, NOW(), $3, $4, $5, NOW())`,
                ['Deposit', total_amount, `FD Maturity Withdrawal #${fd_id}`, account_id, employee_id]
            );

            await client.query('COMMIT');

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // =============================================
    // AUTOMATIC MONTHLY INTEREST CALCULATION
    // (Called by scheduler, not by API)
    // =============================================
    calculateMonthlyInterest: async () => {
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Get all active FDs
            const fds = await client.query(
                `SELECT fd.fd_id, fd.fd_balance, fp.interest,
                        fp.fd_options
                 FROM fixed_deposits fd
                 JOIN fd_plans fp ON fd.fd_plan_id = fp.fd_plan_id
                 WHERE fd.fd_status = 'active'`
            );

            let count = 0;
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            
            for (const fd of fds.rows) {
                // Check if interest already calculated this month
                const existingCheck = await client.query(
                    `SELECT COUNT(*) FROM fd_interest_calculation 
                     WHERE fd_id = $1 
                     AND EXTRACT(MONTH FROM calculation_date) = $2
                     AND EXTRACT(YEAR FROM calculation_date) = $3`,
                    [fd.fd_id, currentMonth + 1, currentYear]
                );

                if (parseInt(existingCheck.rows[0].count) > 0) {
                    continue; // Already calculated this month
                }

                // Calculate monthly interest
                // Formula: (Principal × Annual Rate × 1/12) / 100
                const monthlyRate = parseFloat(fd.interest) / 12;
                const interest = (parseFloat(fd.fd_balance) * monthlyRate) / 100;
                
                // Get days in current month
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                
                await client.query(
                    `INSERT INTO fd_interest_calculation 
                     (fd_id, calculation_date, interest_amount, days_in_period, status, created_at)
                     VALUES ($1, CURRENT_DATE, $2, $3, 'pending', NOW())`,
                    [fd.fd_id, interest.toFixed(2), daysInMonth]
                );
                
                count++;
            }
            
            await client.query('COMMIT');
            return count;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // Get interest calculation history for an FD
    getInterestHistory: async (fd_id) => {
        const result = await db.query(
            `SELECT * FROM fd_interest_calculation 
             WHERE fd_id = $1 
             ORDER BY calculation_date DESC`,
            [fd_id]
        );
        return result.rows;
    }
};

export default fdModel;