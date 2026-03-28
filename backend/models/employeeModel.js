import db from '../config/database.js';

let hasStatusColumnCache;
let hasLastLoginColumnCache;

const employeeModel = {
    hasStatusColumn: async () => {
        if (typeof hasStatusColumnCache === 'boolean') {
            return hasStatusColumnCache;
        }

        const result = await db.query(
            `SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'employees' AND column_name = 'status'
            ) AS exists`
        );

        hasStatusColumnCache = result.rows[0].exists;
        return hasStatusColumnCache;
    },

    hasLastLoginColumn: async () => {
        if (typeof hasLastLoginColumnCache === 'boolean') {
            return hasLastLoginColumnCache;
        }

        const result = await db.query(
            `SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'employees' AND column_name = 'last_login'
            ) AS exists`
        );

        hasLastLoginColumnCache = result.rows[0].exists;
        return hasLastLoginColumnCache;
    },

    // Find employee by username
    findByUsername: async (username) => {
        const result = await db.query(
            'SELECT * FROM employees WHERE username = $1',
            [username]
        );
        return result.rows[0];
    },

    // Find employee by ID
    findById: async (id) => {
        const hasStatusColumn = await employeeModel.hasStatusColumn();
        const hasLastLoginColumn = await employeeModel.hasLastLoginColumn();
        const statusColumn = hasStatusColumn ? 'e.status::text AS status' : `'Active'::text AS status`;
        const lastLoginColumn = hasLastLoginColumn ? 'e.last_login AS last_login' : 'NULL::timestamp AS last_login';

        const result = await db.query(
            `SELECT e.employee_id,
                    e.username,
                    e.first_name,
                    e.last_name,
                    e.position,
                    e.nic,
                    e.gender,
                    e.date_of_birth,
                    e.branch_id,
                    b.branch_name,
                    ${statusColumn},
                    ${lastLoginColumn}
             FROM employees e
             LEFT JOIN branch b ON e.branch_id = b.branch_id
             WHERE e.employee_id = $1`,
            [id]
        );
        return result.rows[0];
    },

    // Create new employee (for admin use)
    create: async (employeeData) => {
        const { position, username, password, first_name, last_name, 
                nic, gender, date_of_birth, branch_id, contact_id } = employeeData;
        
        const result = await db.query(
            `INSERT INTO employees 
             (position, username, password, first_name, last_name, 
              nic, gender, date_of_birth, branch_id, contact_id, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) 
             RETURNING employee_id, username, first_name, last_name, position`,
            [position, username, password, first_name, last_name, 
             nic, gender, date_of_birth, branch_id, contact_id]
        );
        return result.rows[0];
    },

    findAll: async () => {
        const hasStatusColumn = await employeeModel.hasStatusColumn();
        const statusColumn = hasStatusColumn ? 'e.status::text AS status' : `'Active'::text AS status`;

        const result = await db.query(
            `SELECT e.employee_id,
                    e.username,
                    e.first_name,
                    e.last_name,
                    e.position,
                    e.nic,
                    e.gender,
                    e.date_of_birth,
                    e.branch_id,
                    ${statusColumn},
                    b.branch_name
             FROM employees e
             LEFT JOIN branch b ON e.branch_id = b.branch_id
             ORDER BY e.employee_id DESC`
        );

        return result.rows;
    },

    update: async (id, employeeData) => {
        const { password, first_name, last_name, position, nic, gender, date_of_birth, branch_id } = employeeData;

        const updates = [];
        const values = [];

        if (first_name !== undefined) {
            values.push(first_name);
            updates.push(`first_name = $${values.length}`);
        }
        if (last_name !== undefined) {
            values.push(last_name);
            updates.push(`last_name = $${values.length}`);
        }
        if (position !== undefined) {
            values.push(position);
            updates.push(`position = $${values.length}`);
        }
        if (nic !== undefined) {
            values.push(nic);
            updates.push(`nic = $${values.length}`);
        }
        if (gender !== undefined) {
            values.push(gender);
            updates.push(`gender = $${values.length}`);
        }
        if (date_of_birth !== undefined) {
            values.push(date_of_birth);
            updates.push(`date_of_birth = $${values.length}`);
        }
        if (branch_id !== undefined) {
            values.push(branch_id || null);
            updates.push(`branch_id = $${values.length}`);
        }
        if (password) {
            values.push(password);
            updates.push(`password = $${values.length}`);
        }

        if (updates.length === 0) {
            return employeeModel.findById(id);
        }

        values.push(id);

        const result = await db.query(
            `UPDATE employees
             SET ${updates.join(', ')}
             WHERE employee_id = $${values.length}
             RETURNING employee_id, username, first_name, last_name, position, nic, gender, date_of_birth, branch_id`,
            values
        );

        return result.rows[0];
    },

    updateStatus: async (id, status) => {
        const hasStatusColumn = await employeeModel.hasStatusColumn();

        if (!hasStatusColumn) {
            return {
                employee_id: Number(id),
                status: 'Active',
                message: 'Employee status column is not configured in database'
            };
        }

        const result = await db.query(
            `UPDATE employees
             SET status = $2
             WHERE employee_id = $1
             RETURNING employee_id, status`,
            [id, status]
        );

        return result.rows[0];
    },

    getBranches: async () => {
        const result = await db.query(
            `SELECT branch_id, branch_name
             FROM branch
             ORDER BY branch_name ASC`
        );

        return result.rows;
    },

    // Update last login (optional)
    updateLastLogin: async (id) => {
        const hasLastLoginColumn = await employeeModel.hasLastLoginColumn();
        if (!hasLastLoginColumn) {
            return;
        }

        await db.query(
            'UPDATE employees SET last_login = NOW() WHERE employee_id = $1',
            [id]
        );
    }
};

export default employeeModel;