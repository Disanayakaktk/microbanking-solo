import db from '../config/database.js';

const contactModel = {
    // Create contact
    create: async (contactData) => {
        const { contact_no_1, contact_no_2, address, email } = contactData;
        
        const result = await db.query(
            `INSERT INTO contact (contact_no_1, contact_no_2, address, email, created_at) 
             VALUES ($1, $2, $3, $4, NOW()) 
             RETURNING contact_id`,
            [contact_no_1, contact_no_2 || null, address, email]
        );
        return result.rows[0].contact_id;
    },

    // Update contact
    update: async (id, contactData) => {
        const { contact_no_1, contact_no_2, address, email } = contactData;
        
        await db.query(
            `UPDATE contact 
             SET contact_no_1 = $1, contact_no_2 = $2, address = $3, email = $4
             WHERE contact_id = $5`,
            [contact_no_1, contact_no_2 || null, address, email, id]
        );
    }
};

export default contactModel;