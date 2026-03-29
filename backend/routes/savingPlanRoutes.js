import express from 'express';
import savingPlanController from '../controllers/savingPlanController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create saving plan (Admin)
router.post('/', authorize('Admin'), savingPlanController.createPlan);

// Get all saving plans
router.get('/', savingPlanController.getAllPlans);

// Get saving plan by ID
router.get('/:id', savingPlanController.getPlanById);

// Update saving plan (Admin)
router.put('/:id', authorize('Admin'), savingPlanController.updatePlan);

// Delete saving plan (Admin)
router.delete('/:id', authorize('Admin'), savingPlanController.deletePlan);

export default router;
