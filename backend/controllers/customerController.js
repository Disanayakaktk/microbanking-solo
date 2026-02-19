import customerModel from '../models/customerModel.js';
import contactModel from '../models/contactModel.js';

const customerController = {
    // Create new customer with contact
    createCustomer: async (req, res) => {
        try {
            const { first_name, last_name, gender, nic, date_of_birth,
                    contact_no_1, contact_no_2, address, email } = req.body;

            // Validate required fields
            if (!first_name || !last_name || !gender || !nic || !date_of_birth || 
                !contact_no_1 || !address || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Check if customer with same NIC already exists
            const existingCustomer = await customerModel.findByNIC(nic);
            if (existingCustomer) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer with this NIC already exists'
                });
            }

            // Create contact first
            const contact_id = await contactModel.create({
                contact_no_1,
                contact_no_2,
                address,
                email
            });

            // Create customer with contact_id
            const newCustomer = await customerModel.create({
                first_name,
                last_name,
                gender,
                nic,
                date_of_birth,
                contact_id
            });

            // Fetch complete customer data with contact info
            const completeCustomer = await customerModel.findById(newCustomer.customer_id);

            res.status(201).json({
                success: true,
                message: 'Customer created successfully',
                customer: completeCustomer
            });

        } catch (error) {
            console.error('Create customer error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while creating customer',
                error: error.message
            });
        }
    },

    // Get all customers
    getAllCustomers: async (req, res) => {
        try {
            const customers = await customerModel.findAll();
            
            res.json({
                success: true,
                count: customers.length,
                customers
            });

        } catch (error) {
            console.error('Get customers error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching customers'
            });
        }
    },

    // Get customer by ID
    getCustomerById: async (req, res) => {
        try {
            const { id } = req.params;
            
            const customer = await customerModel.findById(id);
            
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found'
                });
            }

            res.json({
                success: true,
                customer
            });

        } catch (error) {
            console.error('Get customer error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching customer'
            });
        }
    },

    // Get customer by NIC
    getCustomerByNIC: async (req, res) => {
        try {
            const { nic } = req.params;
            
            const customer = await customerModel.findByNIC(nic);
            
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found with this NIC'
                });
            }

            res.json({
                success: true,
                customer
            });

        } catch (error) {
            console.error('Get customer by NIC error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching customer'
            });
        }
    },

    // Update customer
    updateCustomer: async (req, res) => {
        try {
            const { id } = req.params;
            const { first_name, last_name, gender, date_of_birth,
                    contact_no_1, contact_no_2, address, email } = req.body;

            // Check if customer exists
            const existingCustomer = await customerModel.findById(id);
            if (!existingCustomer) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found'
                });
            }

            // Update customer basic info
            await customerModel.update(id, {
                first_name,
                last_name,
                gender,
                date_of_birth
            });

            // Update contact info if contact exists
            if (existingCustomer.contact_id) {
                await contactModel.update(existingCustomer.contact_id, {
                    contact_no_1,
                    contact_no_2,
                    address,
                    email
                });
            }

            // Fetch updated customer
            const updatedCustomer = await customerModel.findById(id);

            res.json({
                success: true,
                message: 'Customer updated successfully',
                customer: updatedCustomer
            });

        } catch (error) {
            console.error('Update customer error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while updating customer'
            });
        }
    },

    // Delete customer
    deleteCustomer: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Check if customer exists
            const existingCustomer = await customerModel.findById(id);
            if (!existingCustomer) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found'
                });
            }

            // Check if customer has accounts (optional - you might want to prevent deletion if they have accounts)
            // This requires an accounts model which we'll create next

            await customerModel.delete(id);

            res.json({
                success: true,
                message: 'Customer deleted successfully'
            });

        } catch (error) {
            console.error('Delete customer error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while deleting customer'
            });
        }
    }
};

export default customerController;