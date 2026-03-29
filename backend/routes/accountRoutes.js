import express from 'express';
import accountController from '../controllers/accountController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// =============================================
// ACCOUNT CREATION
// =============================================
/**
 * @route   POST /api/accounts
 * @desc    Open a new bank account
 * @access  Agent
 * @body    { 
 *            customer_id, 
 *            joint_holder_ids (optional),
 *            branch_id, 
 *            saving_plan_id, 
 *            initial_deposit,
 *            open_date (optional)
 *          }
 */

router.post(
    '/', 
    authorize('Agent'), 
    accountController.createAccount
);

// =============================================
// ACCOUNT QUERIES - SINGLE ACCOUNT
// =============================================

/**
 * @route   GET /api/accounts/:id
 * @desc    Get account details by ID
 * @access  Agent, Manager
 */
router.get(
    '/:id', 
    authorize('Agent', 'Manager'), 
    accountController.getAccountById
);

/**
 * @route   GET /api/accounts/number/:accountNumber
 * @desc    Get account details by account number
 * @access  Agent, Manager
 */
router.get(
    '/number/:accountNumber', 
    authorize('Agent', 'Manager'), 
    accountController.getAccountByNumber
);

/**
 * @route   GET /api/accounts/:id/balance
 * @desc    Check account balance
 * @access  Agent, Manager
 */
router.get(
    '/:id/balance', 
    authorize('Agent', 'Manager'), 
    accountController.getBalance
);

/**
 * @route   GET /api/accounts/:id/summary
 * @desc    Get detailed account summary with statistics
 * @access  Manager only (sensitive information)
 */
router.get(
    '/:id/summary', 
    authorize('Manager'), 
    accountController.getAccountSummary
);

// =============================================
// ACCOUNT QUERIES - MULTIPLE ACCOUNTS
// =============================================

/**
 * @route   GET /api/accounts
 * @desc    Get all accounts with optional filters
 * @query   status, branch_id, saving_plan_id
 * @access  Manager only (sensitive list)
 */
router.get(
    '/', 
    authorize('Manager'), 
    accountController.getAllAccounts
);

/**
 * @route   GET /api/accounts/customer/:customerId
 * @desc    Get all accounts belonging to a specific customer
 * @access  Agent, Manager
 */
router.get(
    '/customer/:customerId', 
    authorize('Agent', 'Manager'), 
    accountController.getCustomerAccounts
);

// =============================================
// ACCOUNT UPDATES
// =============================================

/**
 * @route   PATCH /api/accounts/:id/status
 * @desc    Update account status (active/closed)
 * @access  Agent
 * @body    { status: "active" or "closed" }
 */
router.patch(
    '/:id/status', 
    authorize('Agent'), 
    accountController.updateAccountStatus
);

/**
 * @route   PUT /api/accounts/:id/manage
 * @desc    Manage existing account (plan, status, holders)
 * @access  Agent
 * @body    { saving_plan_id?, status?, holder_ids? }
 */
router.put(
    '/:id/manage',
    authorize('Agent'),
    accountController.manageAccount
);

/**
 * @route   POST /api/accounts/:id/joint
 * @desc    Add a joint holder to existing account
 * @access  Agent
 * @body    { customer_id }
 */
router.post(
    '/:id/joint', 
    authorize('Agent'), 
    accountController.addJointHolder
);

export default router;