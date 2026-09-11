import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';

export interface InventoryQueryFilters {
  locationId?: string;
  itemId?: string;
  category?: string;
}

export const getAllInventory = async (filters: InventoryQueryFilters = {}) => {
  const where: any = {};

  if (filters.locationId) {
    where.locationId = filters.locationId;
  }
  if (filters.itemId) {
    where.itemId = filters.itemId;
  }
  if (filters.category) {
    where.item = { category: filters.category };
  }

  const inventories = await prisma.inventory.findMany({
    where,
    include: {
      item: {
        select: { id: true, sku: true, name: true, category: true, unit: true }
      },
      location: {
        select: { id: true, code: true, name: true }
      }
    },
    orderBy: [
      { location: { code: 'asc' } },
      { item: { sku: 'asc' } },
      { batchNumber: 'asc' }
    ]
  });

  return inventories.map((inv) => {
    const physical = inv.physicalQuantity;
    const reserved = inv.reservedQuantity;
    const available = physical - reserved;

    return {
      id: inv.id,
      itemId: inv.itemId,
      itemSku: inv.item.sku,
      itemName: inv.item.name,
      category: inv.item.category,
      unit: inv.item.unit,
      locationId: inv.locationId,
      locationCode: inv.location.code,
      locationName: inv.location.name,
      batchNumber: inv.batchNumber,
      physicalQuantity: physical,
      reservedQuantity: reserved,
      availableQuantity: available,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt
    };
  });
};

export const getInventoryById = async (id: string) => {
  const inv = await prisma.inventory.findUnique({
    where: { id },
    include: {
      item: true,
      location: true
    }
  });

  if (!inv) {
    throw new AppError('Inventory record not found', 404);
  }

  return {
    id: inv.id,
    itemId: inv.itemId,
    itemSku: inv.item.sku,
    itemName: inv.item.name,
    category: inv.item.category,
    unit: inv.item.unit,
    locationId: inv.locationId,
    locationCode: inv.location.code,
    locationName: inv.location.name,
    batchNumber: inv.batchNumber,
    physicalQuantity: inv.physicalQuantity,
    reservedQuantity: inv.reservedQuantity,
    availableQuantity: inv.physicalQuantity - inv.reservedQuantity,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt
  };
};

export const getAllLocations = async () => {
  return prisma.location.findMany({
    orderBy: { code: 'asc' }
  });
};

export const getAllItems = async () => {
  return prisma.item.findMany({
    orderBy: { sku: 'asc' }
  });
};