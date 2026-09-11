import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as workOrderService from '../services/workOrderService';

export const getWorkOrders = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await workOrderService.getAllWorkOrders();
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

export const createWorkOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await workOrderService.createWorkOrder(req.body);
    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await workOrderService.updateWorkOrderStatus(id, status);
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};