import express from 'express';
import fdController from '../controllers/fdController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ALL FD ROUTES REQUIRE AUTHENTICATION
router.use(authenticate);

// =============================================
// FD PLAN MANAGEMENT
// =============================================

/**
 * @route   POST /api/fd/plans
 * @desc    Create new FD plan
 * @access  Admin only
 * @body    { fd_options, interest, min_amount, penalty_rate }
 */
router.post('/plans', authorize('Admin'), fdController.createPlan);

/**
 * @route   GET /api/fd/plans
 * @desc    List all FD plans
 * @access  All roles (Admin, Manager, Agent)
 */
router.get('/plans', authorize('Admin', 'Manager', 'Agent'), fdController.getAllPlans);

/**
 * @route   GET /api/fd/plans/:id
 * @desc    Get FD plan details by ID
 * @access  All roles
 */
router.get('/plans/:id', authorize('Admin', 'Manager', 'Agent'), fdController.getPlanById);

/**
 * @route   PUT /api/fd/plans/:id
 * @desc    Update FD plan
 * @access  Admin only
 * @body    { fd_options, interest, min_amount, penalty_rate }
 */
router.put('/plans/:id', authorize('Admin'), fdController.updatePlan);

// =============================================
// FD INVESTMENT MANAGEMENT
// =============================================

/**
 * @route   POST /api/fd/investments
 * @desc    Create new FD investment
 * @access  Agent only
 * @body    { customer_id, account_id, fd_plan_id, fd_balance, auto_renewal }
 */
router.post('/investments', authorize('Agent'), fdController.createInvestment);

/**
 * @route   GET /api/fd/investments/customer/:customerId
 * @desc    Get all FDs for a specific customer
 * @access  Agent, Manager
 */
router.get('/investments/customer/:customerId', authorize('Agent', 'Manager'), fdController.getFDsByCustomerId);

/**
 * @route   GET /api/fd/investments/maturing
 * @desc    Get FDs maturing in next X days
 * @access  Agent, Manager
 * @query   days (default: 30)
 */
router.get('/investments/maturing', authorize('Agent','Manager'), fdController.getMaturingFDs);

/**
 * @route   GET /api/fd/investments/:id
 * @desc    Get FD investment details by ID
 * @access  Agent, Manager
 */
router.get('/investments/:id', authorize('Agent', 'Manager'), fdController.getFDById);

// =============================================
// FD INTEREST HISTORY
// =============================================

/**
 * @route   GET /api/fd/investments/:id/interest
 * @desc    Get interest calculation history for an FD
 * @access  Agent, Manager
 */
router.get('/investments/:id/interest', authorize('Agent', 'Manager'), fdController.getInterestHistory);

// =============================================
// FD ACTIONS (Agent only - MANUAL)
// =============================================

/**
 * @route   POST /api/fd/investments/:id/renew
 * @desc    Renew matured FD (Manual - Agent only)
 * @access  Agent only
 * @body    { renew_option, new_plan_id (optional for different_plan) }
 */
router.post('/investments/:id/renew', authorize('Agent'), fdController.renewFD);

/**
 * @route   POST /api/fd/investments/:id/close-early
 * @desc    Close FD early with penalty (Manual - Agent only)
 * @access  Agent only
 * @body    { reason (optional) }
 */
router.post('/investments/:id/close-early', authorize('Agent'), fdController.closeFDEarly);

export default router;