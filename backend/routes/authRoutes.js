import express from 'express';
import authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', authController.login);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);

export default router;