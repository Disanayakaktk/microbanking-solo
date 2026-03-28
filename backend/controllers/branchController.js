import employeeModel from '../models/employeeModel.js';

const branchController = {
    getAllBranches: async (req, res) => {
        try {
            const branches = await employeeModel.getBranches();

            return res.json(branches);
        } catch (error) {
            console.error('Get branches error:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error while fetching branches'
            });
        }
    }
};

export default branchController;
