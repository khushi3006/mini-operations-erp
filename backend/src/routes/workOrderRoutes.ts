import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  getWorkOrders,
  createWorkOrder,
  updateStatus
} from '../controllers/workOrderController';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// View Work Orders: Admin and Operations
router.get('/', authorizeRoles(Role.ADMIN, Role.OPERATIONS), getWorkOrders);

// Create Work Order: Admin only
router.post('/', authorizeRoles(Role.ADMIN), createWorkOrder);

// Update Status: Admin and Operations
router.patch('/:id/status', authorizeRoles(Role.ADMIN, Role.OPERATIONS), updateStatus);

export default router;