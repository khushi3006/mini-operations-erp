import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as orderService from '../services/orderService';

export const getOrders = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await orderService.getAllOrders();
    res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    next(error);
  }
};

export const getOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await orderService.createOrderAndReserveStock({
      ...req.body,
      createdById: req.user!.userId
    });
    res.status(201).json({
      success: true,
      message: 'Order created and stock reserved successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};