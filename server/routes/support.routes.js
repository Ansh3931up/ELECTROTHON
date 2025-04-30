import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {
  createSupportMessage,
  getAllSupportMessages,
  getSupportMessageById,
  respondToSupportMessage
} from '../controllers/support.controllers.js';

const router = Router();

// Public route for creating support messages
router.post('/messages', createSupportMessage);

// Protected routes (admin/support team only)
router.get('/messages', verifyJWT, getAllSupportMessages);
router.get('/messages/:messageId', verifyJWT,  getSupportMessageById);
router.patch('/messages/:messageId/respond', verifyJWT,  respondToSupportMessage);

export default router; 