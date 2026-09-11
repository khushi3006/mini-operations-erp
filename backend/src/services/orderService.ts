import { OrderStatus } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';

export interface CreateOrderInput {
  orderNumber?: string;
  customerName: string;
  locationId: string;
  itemId: string;
  batchNumber: string;
  quantity: number;
  createdById: string;
}

export const getAllOrders = async () => {
  return prisma.customerOrder.findMany({
    include: {
      location: true,
      item: true,
      createdBy: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getOrderById = async (id: string) => {
  const order = await prisma.customerOrder.findUnique({
    where: { id },
    include: {
      location: true,
      item: true,
      createdBy: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  });

  if (!order) {
    throw new AppError('Customer order not found', 404);
  }

  return order;
};

export const createOrderAndReserveStock = async (input: CreateOrderInput) => {
  const { customerName, locationId, itemId, batchNumber, quantity, createdById } = input;

  if (!customerName || !locationId || !itemId || !batchNumber || !quantity) {
    throw new AppError('Customer name, location, item, batch number, and quantity are required', 400);
  }

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    throw new AppError('Order quantity must be a positive integer', 400);
  }

  const orderNumber = input.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;

  // Concurrency-safe atomic transaction with row locking
  return prisma.$transaction(async (tx) => {
    // 1. Lock the inventory row using FOR UPDATE
    const [inv] = await tx.$queryRaw<any[]>`
      SELECT * FROM inventories 
      WHERE item_id = ${itemId} 
        AND location_id = ${locationId} 
        AND batch_number = ${batchNumber}
      FOR UPDATE
    `;

    if (!inv) {
      throw new AppError('Inventory batch not found at specified location', 404);
    }

    const available = inv.physical_quantity - inv.reserved_quantity;

    // Strict validation: Cannot reserve more than available inventory
    if (available < quantity) {
      throw new AppError(
        `Cannot reserve more than available inventory. Available: ${available}, Requested: ${quantity}`,
        400
      );
    }

    // 2. Atomically increment reserved quantity
    const updatedInventory = await tx.inventory.update({
      where: { id: inv.id },
      data: {
        reservedQuantity: inv.reserved_quantity + quantity
      }
    });

    // 3. Create Customer Order record
    const order = await tx.customerOrder.create({
      data: {
        orderNumber,
        customerName: customerName.trim(),
        locationId,
        itemId,
        batchNumber,
        quantity,
        status: OrderStatus.RESERVED,
        createdById
      },
      include: {
        location: true,
        item: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return {
      order,
      inventoryStatus: {
        physicalQuantity: updatedInventory.physicalQuantity,
        reservedQuantity: updatedInventory.reservedQuantity,
        availableQuantity: updatedInventory.physicalQuantity - updatedInventory.reservedQuantity
      }
    };
  });
};