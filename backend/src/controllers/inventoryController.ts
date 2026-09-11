import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as inventoryService from '../services/inventoryService';

export const getInventoryList = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { locationId, itemId, category } = req.query;
    const records = await inventoryService.getAllInventory({
      locationId: locationId as string,
      itemId: itemId as string,
      category: category as string
    });

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const record = await inventoryService.getInventoryById(id);
    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

export const getLocations = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const locations = await inventoryService.getAllLocations();
    res.status(200).json({
      success: true,
      data: locations
    });
  } catch (error) {
    next(error);
  }
};

export const getItems = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const items = await inventoryService.getAllItems();
    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error) {
    next(error);
  }
};