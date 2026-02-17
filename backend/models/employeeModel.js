import db from '../config/database.js';

const employeeModel = {
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
        const result = await db.query(
            `SELECT employee_id, username, first_name, last_name, 
                    position, nic, gender, date_of_birth, branch_id 
             FROM employees WHERE employee_id = $1`,
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

    // Update last login (optional)
    updateLastLogin: async (id) => {
        await db.query(
            'UPDATE employees SET last_login = NOW() WHERE employee_id = $1',
            [id]
        );
    }
};

export default employeeModel;