import db from '../config/database.js';

const accountModel = {
    // generate unique account number (creating date + random 6 digits)
    generateAccountNumber: async () => {
        const date = new Date();
        const year = date.getFullYear(); // YYYY
        const month = String(date.getMonth()+1).padStart(2, '0'); // MM
        const day = String(date.getDate()).padStart(2, '0'); // DD
        const randomPart = Math.floor(100000 + Math.random()*900000); // random 6 digits
        return `${year}${month}${day}${randomPart}`;
    },

    // create a new account
    create: async (accountData) => {
        const { 
            open_date, 
            account_status, 
            balance, 
            fd_id, 
            branch_id, 
            saving_plan_id,
            customer_id
        } = accountData;

        // Get a client from the pool for transaction
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Generate account number
            const account_number = await accountModel.generateAccountNumber();

            // IMPORTANT: Make sure table name is "accounts" (plural) not "account" (singular)
            const accountResult = await client.query(
                `INSERT INTO accounts
                (open_date, account_status, balance, fd_id, branch_id, saving_plan_id, created_at) 
                VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
                RETURNING account_id`,
                [open_date, account_status, balance, fd_id || null, branch_id, saving_plan_id]
            );

            const account_id = accountResult.rows[0].account_id;

            // Link customer to account in takes table
            if (customer_id) {
                await client.query(
                    `INSERT INTO takes (customer_id, account_id, created_at) 
                    VALUES ($1, $2, NOW())`,
                    [customer_id, account_id]
                );
            }

            await client.query('COMMIT');
            
            return { account_id, account_number };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Transaction error:', error);
            throw error;
        } finally {
            client.release();
        }
    },

    // Add joint account holder for an existing account
    addJointHolder: async (account_id, customer_id) => {
        const result = await db.query(
            `insert into takes (customer_id, account_id, created_at) values ($1, $2, NOW())
            returning takes_id`,
            [customer_id, account_id]
        );
        return result.rows[0];
    },

    // Find account by ID
    findById: async (account_id) => {
        const result = await db.query(
            `select a.*, b.branch_name, sp.plan_type, sp.interest as interest_rate, sp.min_balance
            from accounts a
            left join branch b on a.branch_id = b.branch_id
            left join saving_plans sp on a.saving_plan_id = sp.saving_plan_id
            where a.account_id = $1`, [account_id]
        );
        return result.rows[0];
    },

    // Find account by account number
    findByAccountNumber: async (account_number) => {
        const result = await db.query(
            `select a.*, b.branch_name, sp.plan_type, sp.interest as interest_rate
            from accounts a left join branch b on a.branch_id = b.branch_id
            left join saving_plans sp on a.saving_plan_id = sp.saving_plan_id
            where a.account_number = $1`, [account_number]
        );
        return result.rows[0];
    },

    // Get all accounts for a customer
    findByCustomerId: async (customer_id) => {
        const result = await db.query(
            `select a.*, b.branch_name, sp.plan_type, sp.interest as interest_rate
            from accounts a join takes t on a.account_id = t.account_id
            left join branch b on a.branch_id = b.branch_id
            left join saving_plans sp on a.saving_plan_id = sp.saving_plan_id
            where t.customer_id = $1 order by a.account_id DESC`, [customer_id]
        );
        return result.rows;
    },

    // Get account balance
    getBalance: async (account_id) => {
        const result = await db.query(
            `select balance from accounts where account_id = $1`, [account_id]
        );
        return result.rows[0] ? result.rows[0].balance : null;
    },

    // Update account balance (for transactions)
    updateBalance: async (account_id, newBalance) => {
        const result = await db.query(
            `update accounts set balance = $1 where account_id = $2 returning balance`, 
            [newBalance, account_id]
        );
        return result.rows[0];
    },

    // update account status (active, closed)
    updateStatus: async (account_id, status, closed_at = null) => {
        let query = `update accounts set account_status = $1`;
        const params = [status];

        if(status === 'closed' && closed_at) {
            query += `, closed_at = $2`;
            params.push(closed_at);
        }

        query += ' where account_id = $' + (params.length + 1) + ' returning *';
        params.push(account_id);

        const result = await db.query(query, params);
        return result.rows[0];
    },

    // get all accounts with filters
    findAll: async (filters = {}) => {
        let query = `select a.*, b.branch_name, sp.plan_type,
        (select count(*) from takes t where t.account_id = a.account_id) as holder_count
        from accounts a left join branch b on a.branch_id = b.branch_id
        left join saving_plans sp on a.saving_plan_id = sp.saving_plan_id where 1=1`;
        const params = [];
        let paramIndex = 1;

        // add filters if provided
        if(filters.status) {
            query += ` and a.account_status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }
        if(filters.branch_id) {
            query += ` and a.branch_id = $${paramIndex}`;
            params.push(filters.branch_id);
            paramIndex++;
        }
        if(filters.saving_plan_id) {
            query += ` and a.saving_plan_id = $${paramIndex}`;
            params.push(filters.saving_plan_id);
            paramIndex++;
        }

        query += ' order by a.account_id DESC';

        const result = await db.query(query, params);
        return result.rows;
    },

    // get account holders for an account
    getAccountHolders: async (account_id) => {
        const result = await db.query(
            `select c.customer_id, c.first_name, c.last_name, c.nic from customers c
            join takes t on c.customer_id = t.customer_id 
            where t.account_id = $1`, [account_id]
        );
        return result.rows;
    },

    // check if customer owns the account
    isAccountHolder: async (account_id, customer_id) => {
        const result = await db.query(
            `select count(*) from takes where account_id=$1 and customer_id=$2`,
            [account_id, customer_id]
        );
        return parseInt(result.rows[0].count>0);
    },

    // Get account summary with transaction count
    getAccountSummary: async (account_id) => {
        try {
            const result = await db.query(
                `SELECT a.*,
                        b.branch_name,
                        sp.plan_type,
                        sp.interest as interest_rate,
                        (SELECT COUNT(*) FROM transactions t WHERE t.account_id = a.account_id) as transaction_count,
                        (SELECT COALESCE(SUM(amount), 0) FROM transactions t 
                        WHERE t.account_id = a.account_id AND t.transaction_type = 'Deposit') as total_deposits,
                        (SELECT COALESCE(SUM(amount), 0) FROM transactions t 
                        WHERE t.account_id = a.account_id AND t.transaction_type = 'Withdrawal') as total_withdrawals
                FROM accounts a
                LEFT JOIN branch b ON a.branch_id = b.branch_id
                LEFT JOIN saving_plans sp ON a.saving_plan_id = sp.saving_plan_id
                WHERE a.account_id = $1`,
                [account_id]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error in getAccountSummary model:', error);
            throw error;
        }
    },

};


export default accountModel;