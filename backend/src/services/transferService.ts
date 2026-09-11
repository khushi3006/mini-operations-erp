import { TransferStatus } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';

export interface CreateTransferInput {
  transferNumber?: string;
  sourceLocationId: string;
  destinationLocationId: string;
  itemId: string;
  batchNumber: string;
  quantity: number;
  requestedById: string;
}

export const getAllTransfers = async () => {
  return prisma.stockTransfer.findMany({
    include: {
      sourceLocation: true,
      destinationLocation: true,
      item: true,
      requestedBy: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getTransferById = async (id: string) => {
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: {
      sourceLocation: true,
      destinationLocation: true,
      item: true,
      requestedBy: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  });

  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }

  return transfer;
};

export const createTransfer = async (input: CreateTransferInput) => {
  const { sourceLocationId, destinationLocationId, itemId, batchNumber, quantity, requestedById } = input;

  if (!sourceLocationId || !destinationLocationId || !itemId || !batchNumber || !quantity) {
    throw new AppError('All transfer fields (source, destination, item, batch, quantity) are required', 400);
  }

  if (sourceLocationId === destinationLocationId) {
    throw new AppError('Source and destination locations must be different', 400);
  }

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    throw new AppError('Transfer quantity must be a positive integer', 400);
  }

  // Check that source inventory exists
  const sourceInv = await prisma.inventory.findUnique({
    where: {
      itemId_locationId_batchNumber: {
        itemId,
        locationId: sourceLocationId,
        batchNumber
      }
    }
  });

  if (!sourceInv) {
    throw new AppError('Specified item batch does not exist at source location', 404);
  }

  const available = sourceInv.physicalQuantity - sourceInv.reservedQuantity;
  if (available < quantity) {
    throw new AppError(
      `Cannot transfer more than available inventory. Available at source: ${available}, Requested: ${quantity}`,
      400
    );
  }

  const transferNumber = input.transferNumber || `TRF-${Date.now().toString().slice(-6)}`;

  return prisma.stockTransfer.create({
    data: {
      transferNumber,
      sourceLocationId,
      destinationLocationId,
      itemId,
      batchNumber,
      quantity,
      status: TransferStatus.REQUESTED,
      requestedById
    },
    include: {
      sourceLocation: true,
      destinationLocation: true,
      item: true,
      requestedBy: {
        select: { id: true, name: true, email: true }
      }
    }
  });
};

export const dispatchTransfer = async (id: string) => {
  return prisma.$transaction(async (tx) => {
    // 1. Lock transfer row using FOR UPDATE
    const [transfer] = await tx.$queryRaw<any[]>`
      SELECT * FROM stock_transfers WHERE id = ${id} FOR UPDATE
    `;

    if (!transfer) {
      throw new AppError('Transfer not found', 404);
    }

    if (transfer.status === 'DISPATCHED') {
      throw new AppError('Transfer has already been dispatched', 400);
    }

    if (transfer.status === 'RECEIVED') {
      throw new AppError('Transfer has already been completed and received', 400);
    }

    if (transfer.status !== 'REQUESTED') {
      throw new AppError(`Cannot dispatch transfer with status: ${transfer.status}`, 400);
    }

    // 2. Lock source inventory row using FOR UPDATE
    const [sourceInv] = await tx.$queryRaw<any[]>`
      SELECT * FROM inventories 
      WHERE item_id = ${transfer.item_id} 
        AND location_id = ${transfer.source_location_id} 
        AND batch_number = ${transfer.batch_number}
      FOR UPDATE
    `;

    if (!sourceInv) {
      throw new AppError('Source inventory record not found', 404);
    }

    const available = sourceInv.physical_quantity - sourceInv.reserved_quantity;
    if (available < transfer.quantity) {
      throw new AppError(
        `Cannot transfer more than available inventory. Available at source: ${available}, Transfer quantity: ${transfer.quantity}`,
        400
      );
    }

    // 3. Atomically reduce source physical quantity
    const updatedSource = await tx.inventory.update({
      where: { id: sourceInv.id },
      data: {
        physicalQuantity: sourceInv.physical_quantity - transfer.quantity
      }
    });

    // 4. Update transfer status to DISPATCHED (Destination inventory is NOT increased yet)
    const updatedTransfer = await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: {
        status: TransferStatus.DISPATCHED,
        dispatchedAt: new Date()
      },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        item: true
      }
    });

    return {
      transfer: updatedTransfer,
      sourceInventoryRemaining: {
        physical: updatedSource.physicalQuantity,
        reserved: updatedSource.reservedQuantity,
        available: updatedSource.physicalQuantity - updatedSource.reservedQuantity
      }
    };
  });
};

export const receiveTransfer = async (id: string) => {
  return prisma.$transaction(async (tx) => {
    // 1. Lock transfer row using FOR UPDATE
    const [transfer] = await tx.$queryRaw<any[]>`
      SELECT * FROM stock_transfers WHERE id = ${id} FOR UPDATE
    `;

    if (!transfer) {
      throw new AppError('Transfer not found', 404);
    }

    // Single-receipt guarantee / idempotency protection
    if (transfer.status === 'RECEIVED') {
      throw new AppError('Same transfer cannot be received twice', 400);
    }

    if (transfer.status !== 'DISPATCHED') {
      throw new AppError(
        `Cannot receive transfer with status '${transfer.status}'. Transfer must be DISPATCHED before receiving.`,
        400
      );
    }

    // 2. Upsert destination inventory row
    const destInv = await tx.inventory.upsert({
      where: {
        itemId_locationId_batchNumber: {
          itemId: transfer.item_id,
          locationId: transfer.destination_location_id,
          batchNumber: transfer.batch_number
        }
      },
      update: {
        physicalQuantity: {
          increment: transfer.quantity
        }
      },
      create: {
        itemId: transfer.item_id,
        locationId: transfer.destination_location_id,
        batchNumber: transfer.batch_number,
        physicalQuantity: transfer.quantity,
        reservedQuantity: 0
      }
    });

    // 3. Update transfer status to RECEIVED
    const updatedTransfer = await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: {
        status: TransferStatus.RECEIVED,
        receivedAt: new Date()
      },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        item: true
      }
    });

    return {
      transfer: updatedTransfer,
      destinationInventory: {
        physical: destInv.physicalQuantity,
        reserved: destInv.reservedQuantity,
        available: destInv.physicalQuantity - destInv.reservedQuantity
      }
    };
  });
};