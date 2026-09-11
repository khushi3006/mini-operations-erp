import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as transferService from '../services/transferService';

export const getTransfers = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await transferService.getAllTransfers();
    res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    next(error);
  }
};

export const getTransfer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const transfer = await transferService.getTransferById(id);
    res.status(200).json({
      success: true,
      data: transfer
    });
  } catch (error) {
    next(error);
  }
};

export const createTransfer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const transfer = await transferService.createTransfer({
      ...req.body,
      requestedById: req.user!.userId
    });
    res.status(201).json({
      success: true,
      data: transfer
    });
  } catch (error) {
    next(error);
  }
};

export const dispatchTransfer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await transferService.dispatchTransfer(id);
    res.status(200).json({
      success: true,
      message: 'Transfer dispatched successfully. Source stock reduced.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const receiveTransfer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await transferService.receiveTransfer(id);
    res.status(200).json({
      success: true,
      message: 'Transfer received successfully. Destination stock increased.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};