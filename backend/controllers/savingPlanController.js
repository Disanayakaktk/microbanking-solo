import db from '../config/database.js';

const savingPlanController = {
    // Create saving plan (Admin only)
    createPlan: async (req, res) => {
        try {
            const { plan_type, interest, min_balance } = req.body;
            const validPlanTypes = ['Children', 'Teen', 'Adult', 'Senior', 'Joint'];

            if (!plan_type || interest === undefined || min_balance === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Plan type, interest, and minimum balance are required'
                });
            }

            if (!validPlanTypes.includes(plan_type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid plan type'
                });
            }

            if (parseFloat(interest) <= 0 || parseFloat(interest) > 25) {
                return res.status(400).json({
                    success: false,
                    message: 'Interest rate must be between 0 and 25%'
                });
            }

            if (parseFloat(min_balance) < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Minimum balance cannot be negative'
                });
            }

            const result = await db.query(
                `INSERT INTO saving_plans (plan_type, interest, min_balance, created_at)
                 VALUES ($1, $2, $3, NOW())
                 RETURNING saving_plan_id, plan_type, interest, min_balance, created_at`,
                [plan_type, interest, min_balance]
            );

            res.status(201).json({
                success: true,
                message: 'Saving plan created successfully',
                plan: result.rows[0]
            });
        } catch (error) {
            console.error('Create saving plan error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while creating saving plan'
            });
        }
    },

    // Get all saving plans
    getAllPlans: async (req, res) => {
        try {
            const result = await db.query(
                `SELECT saving_plan_id, plan_type, interest, min_balance, created_at
                 FROM saving_plans
                 ORDER BY saving_plan_id ASC`
            );

            res.json({
                success: true,
                count: result.rows.length,
                plans: result.rows
            });
        } catch (error) {
            console.error('Get saving plans error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching saving plans'
            });
        }
    },

    // Get saving plan by ID
    getPlanById: async (req, res) => {
        try {
            const { id } = req.params;

            const result = await db.query(
                `SELECT saving_plan_id, plan_type, interest, min_balance, created_at
                 FROM saving_plans
                 WHERE saving_plan_id = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Saving plan not found'
                });
            }

            res.json({
                success: true,
                plan: result.rows[0]
            });
        } catch (error) {
            console.error('Get saving plan error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching saving plan'
            });
        }
    },

    // Update saving plan (Admin only)
    updatePlan: async (req, res) => {
        try {
            const { id } = req.params;
            const { plan_type, interest, min_balance } = req.body;
            const validPlanTypes = ['Children', 'Teen', 'Adult', 'Senior', 'Joint'];

            const existing = await db.query(
                'SELECT saving_plan_id FROM saving_plans WHERE saving_plan_id = $1',
                [id]
            );

            if (existing.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Saving plan not found'
                });
            }

            if (interest !== undefined) {
                const rate = parseFloat(interest);
                if (Number.isNaN(rate) || rate <= 0 || rate > 25) {
                    return res.status(400).json({
                        success: false,
                        message: 'Interest rate must be between 0 and 25%'
                    });
                }
            }

            if (plan_type !== undefined && !validPlanTypes.includes(plan_type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid plan type'
                });
            }

            if (min_balance !== undefined) {
                const minBalance = parseFloat(min_balance);
                if (Number.isNaN(minBalance) || minBalance < 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Minimum balance cannot be negative'
                    });
                }
            }

            const result = await db.query(
                `UPDATE saving_plans
                 SET plan_type = COALESCE($1, plan_type),
                     interest = COALESCE($2, interest),
                     min_balance = COALESCE($3, min_balance)
                 WHERE saving_plan_id = $4
                 RETURNING saving_plan_id, plan_type, interest, min_balance, created_at`,
                [plan_type, interest, min_balance, id]
            );

            res.json({
                success: true,
                message: 'Saving plan updated successfully',
                plan: result.rows[0]
            });
        } catch (error) {
            console.error('Update saving plan error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while updating saving plan'
            });
        }
    },

    // Delete saving plan (Admin only)
    deletePlan: async (req, res) => {
        const client = await db.pool.connect();

        try {
            const { id } = req.params;
            const { replacement_plan_id } = req.query;
            const planId = parseInt(id);
            const replacementPlanId = replacement_plan_id ? parseInt(replacement_plan_id) : null;

            if (Number.isNaN(planId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Saving plan ID must be a valid number'
                });
            }

            if (replacement_plan_id && Number.isNaN(replacementPlanId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Replacement saving plan ID must be a valid number'
                });
            }

            await client.query('BEGIN');

            const existingPlan = await client.query(
                'SELECT saving_plan_id FROM saving_plans WHERE saving_plan_id = $1',
                [planId]
            );

            if (existingPlan.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Saving plan not found'
                });
            }

            const usageResult = await client.query(
                `SELECT COUNT(*)::int AS usage_count
                 FROM accounts
                 WHERE saving_plan_id = $1`,
                [planId]
            );

            const usageCount = usageResult.rows[0]?.usage_count || 0;

            if (usageCount > 0) {
                if (!replacementPlanId) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        success: false,
                        message: 'Replacement saving plan is required because this plan is already used'
                    });
                }

                if (replacementPlanId === planId) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        success: false,
                        message: 'Replacement saving plan must be different from the plan being deleted'
                    });
                }

                const replacementPlan = await client.query(
                    'SELECT saving_plan_id FROM saving_plans WHERE saving_plan_id = $1',
                    [replacementPlanId]
                );

                if (replacementPlan.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({
                        success: false,
                        message: 'Replacement saving plan not found'
                    });
                }

                await client.query(
                    `UPDATE accounts
                     SET saving_plan_id = $1
                     WHERE saving_plan_id = $2`,
                    [replacementPlanId, planId]
                );
            }

            await client.query(
                'DELETE FROM saving_plans WHERE saving_plan_id = $1',
                [planId]
            );

            await client.query('COMMIT');

            res.json({
                success: true,
                message: usageCount > 0
                    ? `Saving plan deleted successfully and ${usageCount} accounts were moved to the replacement plan`
                    : 'Saving plan deleted successfully',
                reassigned_count: usageCount
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Delete saving plan error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while deleting saving plan'
            });
        } finally {
            client.release();
        }
    }
};

export default savingPlanController;
