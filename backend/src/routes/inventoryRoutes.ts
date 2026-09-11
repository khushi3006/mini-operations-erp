import { Router } from 'express';
import {
  getInventoryList,
  getInventoryDetail,
  getLocations,
  getItems
} from '../controllers/inventoryController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All authenticated roles (Admin, Operations, Sales) can view inventory
router.use(authenticate);

router.get('/', getInventoryList);
router.get('/locations', getLocations);
router.get('/items', getItems);
router.get('/:id', getInventoryDetail);

export default router;