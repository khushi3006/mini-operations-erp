import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  getOrders,
  getOrder,
  createOrder
} from '../controllers/orderController';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// List & view orders: Admin and Sales
router.get('/', authorizeRoles(Role.ADMIN, Role.SALES), getOrders);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.SALES), getOrder);

// Create order & reserve: Sales and Admin
router.post('/', authorizeRoles(Role.ADMIN, Role.SALES), createOrder);

export default router;