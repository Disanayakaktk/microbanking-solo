import express from 'express';
import customerController from '../controllers/customerController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All customer routes require authentication
router.use(authenticate);

// Customer CRUD operations

// Only Agent can create, update, or delete customers
router.post('/', authorize('Agent'), customerController.createCustomer); 
router.put('/:id', authorize('Agent'), customerController.updateCustomer);    
router.delete('/:id', authorize('Agent'), customerController.deleteCustomer);
// Only Manager can view all customers
router.get('/', authorize('Manager'), customerController.getAllCustomers); 
// Both Manager and Agent can view customer by ID & NIC
router.get('/:id', authorize('Manager', 'Agent'), customerController.getCustomerById); 
router.get('/nic/:nic', authorize('Manager', 'Agent'), customerController.getCustomerByNIC); 

export default router;