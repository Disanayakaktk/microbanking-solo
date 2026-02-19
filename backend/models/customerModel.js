import db from '../config/database.js';

const customerModel = {
    // Create new customer
    create: async (customerData) => {
        const { first_name, last_name, gender, nic, date_of_birth, contact_id } = customerData;
        
        const result = await db.query(
            `INSERT INTO customers 
             (first_name, last_name, gender, nic, date_of_birth, contact_id, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
             RETURNING *`,
            [first_name, last_name, gender, nic, date_of_birth, contact_id]
        );
        return result.rows[0];
    },

    // Get all customers
    findAll: async () => {
        const result = await db.query(
            `SELECT c.*, cont.contact_no_1, cont.contact_no_2, cont.address, cont.email 
             FROM customers c
             LEFT JOIN contact cont ON c.contact_id = cont.contact_id
             ORDER BY c.customer_id DESC`
        );
        return result.rows;
    },

    // Get customer by ID
    findById: async (id) => {
        const result = await db.query(
            `SELECT c.*, cont.contact_no_1, cont.contact_no_2, cont.address, cont.email 
             FROM customers c
             LEFT JOIN contact cont ON c.contact_id = cont.contact_id
             WHERE c.customer_id = $1`,
            [id]
        );
        return result.rows[0];
    },

    // Get customer by NIC
    findByNIC: async (nic) => {
        const result = await db.query(
            `SELECT c.*, cont.contact_no_1, cont.contact_no_2, cont.address, cont.email 
             FROM customers c
             LEFT JOIN contact cont ON c.contact_id = cont.contact_id
             WHERE c.nic = $1`,
            [nic]
        );
        return result.rows[0];
    },

    // Update customer
    update: async (id, customerData) => {
        const { first_name, last_name, gender, date_of_birth } = customerData;
        
        const result = await db.query(
            `UPDATE customers 
             SET first_name = $1, last_name = $2, gender = $3, date_of_birth = $4
             WHERE customer_id = $5 
             RETURNING *`,
            [first_name, last_name, gender, date_of_birth, id]
        );
        return result.rows[0];
    },

    // Delete customer (soft delete or hard delete? Let's do soft delete by adding status)
    delete: async (id) => {
        // Option 1: Hard delete (permanent)
        // await db.query('DELETE FROM customers WHERE customer_id = $1', [id]);
        
        // Option 2: Soft delete (add status column first)
        // You'll need to add status column to customers table first
        // ALTER TABLE customers ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        // await db.query('UPDATE customers SET status = $1 WHERE customer_id = $2', ['deleted', id]);
        
        // For now, let's use hard delete
        const result = await db.query(
            'DELETE FROM customers WHERE customer_id = $1 RETURNING customer_id',
            [id]
        );
        return result.rows[0];
    }
};

export default customerModel;