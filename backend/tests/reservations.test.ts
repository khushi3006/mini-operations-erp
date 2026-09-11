import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Customer Order & Stock Reservation Module', () => {
  let salesToken: string;
  let opsToken: string;
  let locAId: string;
  let motorItemId: string;

  beforeAll(async () => {
    const salesRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales@erp.com', password: 'sales123' });
    salesToken = salesRes.body.data.token;

    const opsRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ops@erp.com', password: 'ops123' });
    opsToken = opsRes.body.data.token;

    const locA = await prisma.location.findUnique({ where: { code: 'LOC-A' } });
    locAId = locA!.id;

    const item = await prisma.item.findUnique({ where: { sku: 'SKU-MOTOR-02' } });
    motorItemId = item!.id;

    // Reset clean baseline inventory for SKU-MOTOR-02 at LOC-A
    // Physical = 100, Reserved = 0 -> Available = 100
    await prisma.inventory.upsert({
      where: {
        itemId_locationId_batchNumber: {
          itemId: motorItemId,
          locationId: locAId,
          batchNumber: 'BATCH-TEST-CONCURRENCY'
        }
      },
      update: { physicalQuantity: 100, reservedQuantity: 0 },
      create: {
        itemId: motorItemId,
        locationId: locAId,
        batchNumber: 'BATCH-TEST-CONCURRENCY',
        physicalQuantity: 100,
        reservedQuantity: 0
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Test 1: Cannot reserve more than available inventory', async () => {
    // Inventory has 100 physical, 0 reserved -> 100 available
    // Attempting to reserve 120 should fail with 400
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        orderNumber: 'ORD-OVERFLOW-01',
        customerName: 'Delta Robotics',
        locationId: locAId,
        itemId: motorItemId,
        batchNumber: 'BATCH-TEST-CONCURRENCY',
        quantity: 120
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Cannot reserve more than available inventory/);
  });

  it('should reserve valid stock and update available quantity correctly', async () => {
    // Reserve 60 units from 100 available
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        orderNumber: 'ORD-VALID-01',
        customerName: 'Beta Manufacturing',
        locationId: locAId,
        itemId: motorItemId,
        batchNumber: 'BATCH-TEST-CONCURRENCY',
        quantity: 60
      });

    expect(res.status).toBe(201);
    expect(res.body.data.inventoryStatus.physicalQuantity).toBe(100);
    expect(res.body.data.inventoryStatus.reservedQuantity).toBe(60);
    expect(res.body.data.inventoryStatus.availableQuantity).toBe(40);
  });

  it('Concurrent Race Condition Prevention: Available = 100, User A reserves 80, User B reserves 50 -> Both must not succeed', async () => {
    // Reset to Available = 100
    await prisma.inventory.update({
      where: {
        itemId_locationId_batchNumber: {
          itemId: motorItemId,
          locationId: locAId,
          batchNumber: 'BATCH-TEST-CONCURRENCY'
        }
      },
      data: { physicalQuantity: 100, reservedQuantity: 0 }
    });

    // Send two concurrent reservation requests
    const promiseA = request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        orderNumber: 'ORD-RACE-A',
        customerName: 'Buyer Alpha',
        locationId: locAId,
        itemId: motorItemId,
        batchNumber: 'BATCH-TEST-CONCURRENCY',
        quantity: 80
      });

    const promiseB = request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        orderNumber: 'ORD-RACE-B',
        customerName: 'Buyer Beta',
        locationId: locAId,
        itemId: motorItemId,
        batchNumber: 'BATCH-TEST-CONCURRENCY',
        quantity: 50
      });

    const [resA, resB] = await Promise.all([promiseA, promiseB]);

    // Exactly one request MUST succeed (201) and the other MUST fail (400)
    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(400);

    const successfulRes = resA.status === 201 ? resA : resB;
    const failedRes = resA.status === 400 ? resA : resB;

    expect(successfulRes.body.success).toBe(true);
    expect(failedRes.body.success).toBe(false);
    expect(failedRes.body.error).toMatch(/Cannot reserve more than available inventory/);

    // Verify database integrity: Total reserved must NOT exceed 100
    const finalInv = await prisma.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId: motorItemId,
          locationId: locAId,
          batchNumber: 'BATCH-TEST-CONCURRENCY'
        }
      }
    });

    expect(finalInv!.reservedQuantity).toBeLessThanOrEqual(finalInv!.physicalQuantity);
    expect(finalInv!.physicalQuantity - finalInv!.reservedQuantity).toBeGreaterThanOrEqual(0);
  });

  it('should reject Operations user from creating Customer Orders (RBAC)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        orderNumber: 'ORD-OPS-UNAUTHORIZED',
        customerName: 'Hacker Corp',
        locationId: locAId,
        itemId: motorItemId,
        batchNumber: 'BATCH-TEST-CONCURRENCY',
        quantity: 10
      });

    expect(res.status).toBe(403);
  });
});