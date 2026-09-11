import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Case Study Mandatory Tests Suite (100% Specification Compliance)', () => {
  let adminToken: string;
  let opsToken: string;
  let salesToken: string;

  let locA: any;
  let locB: any;
  let itemSteel: any;
  let itemMotor: any;
  let itemBolt: any;
  let opsUser: any;

  beforeAll(async () => {
    const adminAuth = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@erp.com', password: 'admin123' });
    adminToken = adminAuth.body.data.token;

    const opsAuth = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ops@erp.com', password: 'ops123' });
    opsToken = opsAuth.body.data.token;
    opsUser = opsAuth.body.data.user;

    const salesAuth = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales@erp.com', password: 'sales123' });
    salesToken = salesAuth.body.data.token;

    locA = await prisma.location.findUnique({ where: { code: 'LOC-A' } });
    locB = await prisma.location.findUnique({ where: { code: 'LOC-B' } });
    itemSteel = await prisma.item.findUnique({ where: { sku: 'SKU-STEEL-01' } });
    itemMotor = await prisma.item.findUnique({ where: { sku: 'SKU-MOTOR-02' } });
    itemBolt = await prisma.item.findUnique({ where: { sku: 'SKU-BOLT-03' } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * TEST 1: Cannot reserve more than available inventory.
   */
  it('Test 1: Cannot reserve more than available inventory', async () => {
    const batch = `BATCH-MAND-T1-${Date.now()}`;
    
    await prisma.inventory.create({
      data: {
        itemId: itemMotor.id,
        locationId: locA.id,
        batchNumber: batch,
        physicalQuantity: 100,
        reservedQuantity: 0
      }
    });

    // Valid reservation of 60
    const validRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerName: 'Valid Client',
        locationId: locA.id,
        itemId: itemMotor.id,
        batchNumber: batch,
        quantity: 60
      });

    expect(validRes.status).toBe(201);
    expect(validRes.body.data.inventoryStatus.physicalQuantity).toBe(100);
    expect(validRes.body.data.inventoryStatus.reservedQuantity).toBe(60);
    expect(validRes.body.data.inventoryStatus.availableQuantity).toBe(40);

    // Over-reservation attempt: Available is 40, requesting 50 -> MUST FAIL
    const invalidRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerName: 'Excessive Client',
        locationId: locA.id,
        itemId: itemMotor.id,
        batchNumber: batch,
        quantity: 50
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.success).toBe(false);
    expect(invalidRes.body.error).toContain('Cannot reserve more than available inventory');

    // Verify DB state remains unchanged (Reserved = 60, Available = 40)
    const inv = await prisma.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId: itemMotor.id,
          locationId: locA.id,
          batchNumber: batch
        }
      }
    });
    expect(inv!.reservedQuantity).toBe(60);
    expect(inv!.physicalQuantity - inv!.reservedQuantity).toBe(40);
  });

  /**
   * TEST 2: Cannot transfer more than available inventory.
   */
  it('Test 2: Cannot transfer more than available inventory', async () => {
    const batch = `BATCH-MAND-T2-${Date.now()}`;

    await prisma.inventory.create({
      data: {
        itemId: itemSteel.id,
        locationId: locA.id,
        batchNumber: batch,
        physicalQuantity: 50,
        reservedQuantity: 20 // Available = 30
      }
    });

    // Attempting to transfer 35 when available is 30 -> MUST FAIL
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        sourceLocationId: locA.id,
        destinationLocationId: locB.id,
        itemId: itemSteel.id,
        batchNumber: batch,
        quantity: 35
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Cannot transfer more than available inventory');
  });

  /**
   * TEST 3: Destination stock increases only after transfer receipt.
   */
  it('Test 3: Destination stock increases only after transfer receipt', async () => {
    const batch = `BATCH-MAND-T3-${Date.now()}`;

    // Source setup: Physical = 100, Reserved = 0 -> Available = 100 at LOC-A
    await prisma.inventory.create({
      data: {
        itemId: itemBolt.id,
        locationId: locA.id,
        batchNumber: batch,
        physicalQuantity: 100,
        reservedQuantity: 0
      }
    });

    // 1. Create Transfer for 40 units
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        sourceLocationId: locA.id,
        destinationLocationId: locB.id,
        itemId: itemBolt.id,
        batchNumber: batch,
        quantity: 40
      });

    expect(createRes.status).toBe(201);
    const transferId = createRes.body.data.id;

    // 2. Dispatch the transfer
    const dispatchRes = await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(dispatchRes.status).toBe(200);

    // Assert: Source inventory reduced from 100 to 60
    const sourceInv = await prisma.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId: itemBolt.id,
          locationId: locA.id,
          batchNumber: batch
        }
      }
    });
    expect(sourceInv!.physicalQuantity).toBe(60);

    // Destination inventory must NOT have increased yet
    const destInvBefore = await prisma.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId: itemBolt.id,
          locationId: locB.id,
          batchNumber: batch
        }
      }
    });
    expect(destInvBefore).toBeNull();

    // 3. Receive the transfer
    const receiveRes = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(receiveRes.status).toBe(200);

    // Destination inventory is now 40
    const destInvAfter = await prisma.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId: itemBolt.id,
          locationId: locB.id,
          batchNumber: batch
        }
      }
    });
    expect(destInvAfter!.physicalQuantity).toBe(40);
  });

  /**
   * TEST 4: Same transfer cannot be received twice.
   */
  it('Test 4: Same transfer cannot be received twice', async () => {
    const batch = `BATCH-MAND-T4-${Date.now()}`;

    await prisma.inventory.create({
      data: {
        itemId: itemBolt.id,
        locationId: locA.id,
        batchNumber: batch,
        physicalQuantity: 50,
        reservedQuantity: 0
      }
    });

    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        sourceLocationId: locA.id,
        destinationLocationId: locB.id,
        itemId: itemBolt.id,
        batchNumber: batch,
        quantity: 20
      });
    const transferId = createRes.body.data.id;

    await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${opsToken}`);

    const firstReceive = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${opsToken}`);
    expect(firstReceive.status).toBe(200);

    // Attempt second receipt -> MUST FAIL
    const duplicateReceiveRes = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(duplicateReceiveRes.status).toBe(400);
    expect(duplicateReceiveRes.body.success).toBe(false);
    expect(duplicateReceiveRes.body.error).toContain('Same transfer cannot be received twice');
  });

  /**
   * TEST 5: Unauthorized user cannot perform restricted operation.
   */
  it('Test 5: Unauthorized user cannot perform restricted operation', async () => {
    // 1. Sales User attempting to create Work Order (Only Admin allowed) -> 403 Forbidden
    const salesCreateWORes = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        locationId: locA.id,
        itemId: itemSteel.id,
        requiredQuantity: 10,
        assignedUserId: opsUser.id
      });
    expect(salesCreateWORes.status).toBe(403);

    // 2. Sales User attempting to dispatch Transfer (Only Admin / Operations allowed) -> 403 Forbidden
    const dummyTransfer = await prisma.stockTransfer.findFirst();
    const salesDispatchRes = await request(app)
      .post(`/api/transfers/${dummyTransfer!.id}/dispatch`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(salesDispatchRes.status).toBe(403);

    // 3. Operations User attempting to create Customer Order (Only Admin / Sales allowed) -> 403 Forbidden
    const opsOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        customerName: 'Illegal Order',
        locationId: locA.id,
        itemId: itemSteel.id,
        batchNumber: 'BATCH-2026-S1',
        quantity: 5
      });
    expect(opsOrderRes.status).toBe(403);
  });
});