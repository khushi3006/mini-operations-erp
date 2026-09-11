import { PrismaClient, Role, WorkOrderStatus, TransferStatus, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database for Mini Operations ERP...');

  // Clean existing data in reverse relational order
  await prisma.customerOrder.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.item.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Demo / Test Users for Evaluation & Automated Testing
  // NOTE: These are non-sensitive demo fixtures specifically intended for local evaluation.
  const passwordHashAdmin = await bcrypt.hash('admin123', 10);
  const passwordHashOps = await bcrypt.hash('ops123', 10);
  const passwordHashSales = await bcrypt.hash('sales123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@erp.com',
      password: passwordHashAdmin,
      name: 'System Admin',
      role: Role.ADMIN
    }
  });

  const ops = await prisma.user.create({
    data: {
      email: 'ops@erp.com',
      password: passwordHashOps,
      name: 'Operations Manager',
      role: Role.OPERATIONS
    }
  });

  const sales = await prisma.user.create({
    data: {
      email: 'sales@erp.com',
      password: passwordHashSales,
      name: 'Sales Executive',
      role: Role.SALES
    }
  });

  console.log('Created Users: Admin, Operations, Sales');

  // 2. Create Locations
  const locA = await prisma.location.create({
    data: {
      code: 'LOC-A',
      name: 'Warehouse North',
      address: 'Industrial Area Sector 5, North District'
    }
  });

  const locB = await prisma.location.create({
    data: {
      code: 'LOC-B',
      name: 'Warehouse South',
      address: 'Logistics Park Gate 2, South District'
    }
  });

  const locC = await prisma.location.create({
    data: {
      code: 'LOC-C',
      name: 'Central Distribution Hub',
      address: 'Central Ring Road, Hub 1'
    }
  });

  console.log('Created Locations: LOC-A, LOC-B, LOC-C');

  // 3. Create Items
  const itemSteel = await prisma.item.create({
    data: {
      sku: 'SKU-STEEL-01',
      name: 'Steel Plate 10mm',
      category: 'Raw Materials',
      unit: 'sheets'
    }
  });

  const itemMotor = await prisma.item.create({
    data: {
      sku: 'SKU-MOTOR-02',
      name: 'Electric Motor 5HP',
      category: 'Assemblies',
      unit: 'units'
    }
  });

  const itemBolt = await prisma.item.create({
    data: {
      sku: 'SKU-BOLT-03',
      name: 'Industrial Bolt M12',
      category: 'Hardware',
      unit: 'boxes'
    }
  });

  const itemPipe = await prisma.item.create({
    data: {
      sku: 'SKU-PIPE-04',
      name: 'Copper Piping 2m',
      category: 'Piping',
      unit: 'meters'
    }
  });

  console.log('Created Items: 4 SKUs');

  // 4. Create Initial Inventories (Enforcing Invariants: Physical >= Reserved >= 0)
  // Available = Physical - Reserved
  await prisma.inventory.createMany({
    data: [
      {
        itemId: itemSteel.id,
        locationId: locA.id,
        batchNumber: 'BATCH-2026-S1',
        physicalQuantity: 100,
        reservedQuantity: 30 // Available = 70
      },
      {
        itemId: itemSteel.id,
        locationId: locB.id,
        batchNumber: 'BATCH-2026-S2',
        physicalQuantity: 50,
        reservedQuantity: 0 // Available = 50
      },
      {
        itemId: itemMotor.id,
        locationId: locA.id,
        batchNumber: 'BATCH-2026-M1',
        physicalQuantity: 20,
        reservedQuantity: 5 // Available = 15
      },
      {
        itemId: itemMotor.id,
        locationId: locC.id,
        batchNumber: 'BATCH-2026-M2',
        physicalQuantity: 40,
        reservedQuantity: 0 // Available = 40
      },
      {
        itemId: itemBolt.id,
        locationId: locA.id,
        batchNumber: 'BATCH-2026-B1',
        physicalQuantity: 200,
        reservedQuantity: 50 // Available = 150
      },
      {
        itemId: itemPipe.id,
        locationId: locB.id,
        batchNumber: 'BATCH-2026-P1',
        physicalQuantity: 80,
        reservedQuantity: 0 // Available = 80
      }
    ]
  });

  console.log('Created Inventory records with batch tracking');

  // 5. Create Initial Work Orders
  // Work Order requiring 100 units of itemSteel at LOC-A (where available is 70, resulting in shortage of 30)
  await prisma.workOrder.create({
    data: {
      workOrderNumber: 'WO-2026-001',
      locationId: locA.id,
      itemId: itemSteel.id,
      requiredQuantity: 100,
      assignedUserId: ops.id,
      status: WorkOrderStatus.ASSIGNED
    }
  });

  // 6. Create Initial Internal Transfer
  // Transfer request to bridge shortage from LOC-B to LOC-A
  await prisma.stockTransfer.create({
    data: {
      transferNumber: 'TRF-2026-001',
      sourceLocationId: locB.id,
      destinationLocationId: locA.id,
      itemId: itemSteel.id,
      batchNumber: 'BATCH-2026-S2',
      quantity: 30,
      status: TransferStatus.REQUESTED,
      requestedById: ops.id
    }
  });

  // 7. Create Initial Customer Order (to match the reserved 30 on BATCH-2026-S1 at LOC-A)
  await prisma.customerOrder.create({
    data: {
      orderNumber: 'ORD-2026-001',
      customerName: 'Acme Heavy Industries',
      locationId: locA.id,
      itemId: itemSteel.id,
      batchNumber: 'BATCH-2026-S1',
      quantity: 30,
      status: OrderStatus.RESERVED,
      createdById: sales.id
    }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });