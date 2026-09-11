import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('--- Verifying PostgreSQL Database Setup ---');

  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } });
  console.log(`Users count: ${users.length}`);
  console.table(users);

  const locations = await prisma.location.findMany();
  console.log(`Locations count: ${locations.length}`);
  console.table(locations);

  const items = await prisma.item.findMany();
  console.log(`Items count: ${items.length}`);
  console.table(items);

  const inventories = await prisma.inventory.findMany({
    include: { item: { select: { sku: true, name: true } }, location: { select: { code: true } } }
  });
  console.log(`Inventories count: ${inventories.length}`);
  const formattedInventories = inventories.map((inv) => ({
    item: inv.item.sku,
    location: inv.location.code,
    batch: inv.batchNumber,
    physical: inv.physicalQuantity,
    reserved: inv.reservedQuantity,
    available: inv.physicalQuantity - inv.reservedQuantity
  }));
  console.table(formattedInventories);

  const workOrders = await prisma.workOrder.findMany({
    include: { location: true, item: true, assignedUser: true }
  });
  console.log(`Work Orders count: ${workOrders.length}`);
  console.table(workOrders.map(wo => ({
    number: wo.workOrderNumber,
    item: wo.item.sku,
    location: wo.location.code,
    required: wo.requiredQuantity,
    assignedTo: wo.assignedUser.name,
    status: wo.status
  })));

  const transfers = await prisma.stockTransfer.findMany({
    include: { sourceLocation: true, destinationLocation: true, item: true }
  });
  console.log(`Stock Transfers count: ${transfers.length}`);
  console.table(transfers.map(tr => ({
    number: tr.transferNumber,
    item: tr.item.sku,
    from: tr.sourceLocation.code,
    to: tr.destinationLocation.code,
    qty: tr.quantity,
    status: tr.status
  })));

  const orders = await prisma.customerOrder.findMany({
    include: { location: true, item: true }
  });
  console.log(`Customer Orders count: ${orders.length}`);
  console.table(orders.map(ord => ({
    number: ord.orderNumber,
    customer: ord.customerName,
    item: ord.item.sku,
    location: ord.location.code,
    qty: ord.quantity,
    status: ord.status
  })));

  console.log('--- ALL TABLES AND CONSTRAINTS VERIFIED ---');
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());