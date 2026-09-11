import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  getTransfers,
  getTransfer,
  createTransfer,
  dispatchTransfer,
  receiveTransfer
} from '../controllers/transferController';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// List and view: Admin and Operations
router.get('/', authorizeRoles(Role.ADMIN, Role.OPERATIONS), getTransfers);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.OPERATIONS), getTransfer);

// Create, Dispatch, Receive: Operations and Admin
router.post('/', authorizeRoles(Role.ADMIN, Role.OPERATIONS), createTransfer);
router.post('/:id/dispatch', authorizeRoles(Role.ADMIN, Role.OPERATIONS), dispatchTransfer);
router.post('/:id/receive', authorizeRoles(Role.ADMIN, Role.OPERATIONS), receiveTransfer);

export default router;