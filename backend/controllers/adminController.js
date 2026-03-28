import employeeModel from '../models/employeeModel.js';
import { hashPassword } from '../utils/auth.js';

const adminController = {
    registerEmployee: async (req, res) => {
        try {
            const {
                username,
                password,
                first_name,
                last_name,
                position,
                nic,
                gender,
                date_of_birth,
                branch_id
            } = req.body;

            if (!username || !password || !first_name || !last_name || !position || !nic || !gender || !date_of_birth) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            const existingEmployee = await employeeModel.findByUsername(username);
            if (existingEmployee) {
                return res.status(400).json({
                    success: false,
                    message: 'Username already exists'
                });
            }

            const hashedPassword = await hashPassword(password);
            const newEmployee = await employeeModel.create({
                username,
                password: hashedPassword,
                first_name,
                last_name,
                position,
                nic,
                gender,
                date_of_birth,
                branch_id: branch_id ? Number(branch_id) : null,
                contact_id: null
            });

            return res.status(201).json({
                success: true,
                message: 'Employee created successfully',
                employee: newEmployee
            });
        } catch (error) {
            console.error('Register employee error:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error while creating employee'
            });
        }
    },

    getAllUsers: async (req, res) => {
        try {
            const employees = await employeeModel.findAll();

            return res.json({
                success: true,
                count: employees.length,
                employees
            });
        } catch (error) {
            console.error('Get all users error:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error while fetching employees'
            });
        }
    },

    getUserById: async (req, res) => {
        try {
            const { id } = req.params;
            const employee = await employeeModel.findById(id);

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }

            return res.json({
                success: true,
                employee
            });
        } catch (error) {
            console.error('Get user by id error:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error while fetching employee'
            });
        }
    },

    updateUser: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                password,
                first_name,
                last_name,
                position,
                nic,
                gender,
                date_of_birth,
                branch_id
            } = req.body;

            const existingEmployee = await employeeModel.findById(id);
            if (!existingEmployee) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }

            const updatedEmployee = await employeeModel.update(id, {
                password: password ? await hashPassword(password) : undefined,
                first_name,
                last_name,
                position,
                nic,
                gender,
                date_of_birth,
                branch_id: branch_id === '' ? null : branch_id
            });

            return res.json({
                success: true,
                message: 'Employee updated successfully',
                employee: updatedEmployee
            });
        } catch (error) {
            console.error('Update user error:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error while updating employee'
            });
        }
    },

    updateUserStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const validStatuses = ['Active', 'Inactive'];

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Status is required'
                });
            }

            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Status must be Active or Inactive'
                });
            }

            const hasStatusColumn = await employeeModel.hasStatusColumn();
            if (!hasStatusColumn) {
                return res.status(500).json({
                    success: false,
                    message: 'Employee status feature is not configured in database. Run database/update_employees_status.sql'
                });
            }

            const existingEmployee = await employeeModel.findById(id);
            if (!existingEmployee) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }

            const result = await employeeModel.updateStatus(id, status);

            return res.json({
                success: true,
                message: result.message || 'Employee status updated successfully',
                data: result
            });
        } catch (error) {
            console.error('Update user status error:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error while updating employee status'
            });
        }
    }
};

export default adminController;
