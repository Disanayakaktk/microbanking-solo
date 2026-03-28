import express from 'express';
import branchController from '../controllers/branchController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, branchController.getAllBranches);

export default router;
