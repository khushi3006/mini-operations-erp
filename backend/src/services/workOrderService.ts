import { WorkOrderStatus } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';

export interface CreateWorkOrderInput {
  workOrderNumber?: string;
  locationId: string;
  itemId: string;
  requiredQuantity: number;
  assignedUserId: string;
}

export const calculateItemAvailabilityAtLocation = async (itemId: string, locationId: string) => {
  const inventories = await prisma.inventory.findMany({
    where: {
      itemId,
      locationId
    }
  });

  const totalPhysical = inventories.reduce((sum, inv) => sum + inv.physicalQuantity, 0);
  const totalReserved = inventories.reduce((sum, inv) => sum + inv.reservedQuantity, 0);
  const totalAvailable = totalPhysical - totalReserved;

  return {
    totalPhysical,
    totalReserved,
    totalAvailable: Math.max(0, totalAvailable)
  };
};

export const createWorkOrder = async (input: CreateWorkOrderInput) => {
  const { locationId, itemId, requiredQuantity, assignedUserId } = input;

  if (!locationId || !itemId || !assignedUserId) {
    throw new AppError('Location, Item, and Assigned User are required', 400);
  }

  if (!requiredQuantity || requiredQuantity <= 0 || !Number.isInteger(requiredQuantity)) {
    throw new AppError('Required quantity must be a positive integer', 400);
  }

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) throw new AppError('Location not found', 404);

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError('Item not found', 404);

  const user = await prisma.user.findUnique({ where: { id: assignedUserId } });
  if (!user) throw new AppError('Assigned user not found', 404);

  const workOrderNumber = input.workOrderNumber || `WO-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  const workOrder = await prisma.workOrder.create({
    data: {
      workOrderNumber,
      locationId,
      itemId,
      requiredQuantity,
      assignedUserId,
      status: WorkOrderStatus.ASSIGNED
    },
    include: {
      location: true,
      item: true,
      assignedUser: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  });

  const { totalAvailable } = await calculateItemAvailabilityAtLocation(itemId, locationId);
  const shortage = Math.max(0, requiredQuantity - totalAvailable);

  return {
    ...workOrder,
    availableAtLocation: totalAvailable,
    shortageQuantity: shortage
  };
};

export const getAllWorkOrders = async () => {
  const workOrders = await prisma.workOrder.findMany({
    include: {
      location: true,
      item: true,
      assignedUser: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const results = await Promise.all(
    workOrders.map(async (wo) => {
      const { totalAvailable } = await calculateItemAvailabilityAtLocation(wo.itemId, wo.locationId);
      const shortage = Math.max(0, wo.requiredQuantity - totalAvailable);

      return {
        id: wo.id,
        workOrderNumber: wo.workOrderNumber,
        locationId: wo.locationId,
        locationCode: wo.location.code,
        locationName: wo.location.name,
        itemId: wo.itemId,
        itemSku: wo.item.sku,
        itemName: wo.item.name,
        unit: wo.item.unit,
        requiredQuantity: wo.requiredQuantity,
        availableAtLocation: totalAvailable,
        shortageQuantity: shortage,
        assignedUserId: wo.assignedUserId,
        assignedUserName: wo.assignedUser.name,
        status: wo.status,
        createdAt: wo.createdAt,
        updatedAt: wo.updatedAt
      };
    })
  );

  return results;
};

export const updateWorkOrderStatus = async (id: string, status: WorkOrderStatus) => {
  if (!Object.values(WorkOrderStatus).includes(status)) {
    throw new AppError(`Invalid status. Allowed values: ${Object.values(WorkOrderStatus).join(', ')}`, 400);
  }

  const existing = await prisma.workOrder.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Work order not found', 404);
  }

  const updated = await prisma.workOrder.update({
    where: { id },
    data: { status },
    include: {
      location: true,
      item: true,
      assignedUser: { select: { id: true, name: true } }
    }
  });

  const { totalAvailable } = await calculateItemAvailabilityAtLocation(updated.itemId, updated.locationId);
  const shortage = Math.max(0, updated.requiredQuantity - totalAvailable);

  return {
    ...updated,
    availableAtLocation: totalAvailable,
    shortageQuantity: shortage
  };
};