import employeeModel from '../models/employeeModel.js';
import { comparePassword, generateToken, hashPassword } from '../utils/auth.js';

const authController = {
    // Login
    login: async (req, res) => {
        try {
            const { username, password } = req.body;

            // Validate input
            if (!username || !password) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Username and password are required.' 
                });
            }

            // Find employee
            const employee = await employeeModel.findByUsername(username);
            if (!employee) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid username or password.' 
                });
            }

            // Check password
            const isValidPassword = await comparePassword(password, employee.password);
            if (!isValidPassword) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid username or password.' 
                });
            }

            // Track last login when column is available
            await employeeModel.updateLastLogin(employee.employee_id);

            // Get enriched profile payload used by dashboard/system info
            const profile = await employeeModel.findById(employee.employee_id);

            // Generate token
            const token = generateToken(employee);

            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: profile
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Server error during login.' 
            });
        }
    },

    // Get current user profile
    getProfile: async (req, res) => {
        try {
            const employee = await employeeModel.findById(req.user.id);
            if (!employee) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'User not found.' 
                });
            }

            res.json({
                success: true,
                user: employee
            });

        } catch (error) {
            console.error('Profile error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Server error.' 
            });
        }
    }
};

export default authController;