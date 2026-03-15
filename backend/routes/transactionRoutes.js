import express from 'express';
import transactionController from '../controllers/transactionController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ALL TRANSACTION ROUTES REQUIRE AUTHENTICATION
router.use(authenticate);

// =============================================
// TRANSACTION OPERATIONS
// =============================================

/**
 * @route   POST /api/transactions/deposit
 * @desc    Deposit money into an account
 * @access  Agent
 * @body    { account_id, amount, description (optional) }
 */
router.post(
    '/deposit', 
    authorize('Agent'), 
    transactionController.deposit
);

/**
 * @route   POST /api/transactions/withdraw
 * @desc    Withdraw money from an account
 * @access  Agent
 * @body    { account_id, amount, description (optional) }
 */
router.post(
    '/withdraw', 
    authorize('Agent'), 
    transactionController.withdraw
);

/**
 * @route   POST /api/transactions/transfer
 * @desc    Transfer money between accounts
 * @access  Agent
 * @body    { from_account_id, to_account_id, amount, description (optional) }
 */
router.post(
    '/transfer', 
    authorize('Agent'), 
    transactionController.transfer
);

// =============================================
// TRANSACTION QUERIES
// =============================================

/**
 * @route   GET /api/transactions/account/:accountId
 * @desc    Get transaction history for a specific account
 * @access  Agent, Manager
 * @query   limit, offset (pagination)
 */
router.get(
    '/account/:accountId', 
    authorize('Agent', 'Manager'), 
    transactionController.getAccountTransactions
);

/**
 * @route   GET /api/transactions/account/:accountId/summary
 * @desc    Get transaction summary statistics for an account
 * @access  Agent, Manager
 */
router.get(
    '/account/:accountId/summary', 
    authorize('Agent', 'Manager'), 
    transactionController.getAccountTransactionSummary
);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get specific transaction details by ID
 * @access  Agent, Manager
 */
router.get(
    '/:id', 
    authorize('Agent', 'Manager'), 
    transactionController.getTransactionById
);

// =============================================
// REPORTS (Manager only)
// =============================================

/**
 * @route   GET /api/transactions/reports/daily
 * @desc    Get daily transaction report
 * @access  Manager only
 * @query   date (optional, defaults to today)
 */
router.get(
    '/reports/daily', 
    authorize('Manager'), 
    transactionController.getDailyReport
);

/**
 * @route   GET /api/transactions/reports/monthly
 * @desc    Get monthly transaction report
 * @access  Manager only
 * @query   year, month (required)
 */
router.get(
    '/reports/monthly', 
    authorize('Manager'), 
    transactionController.getMonthlyReport
);

export default router;