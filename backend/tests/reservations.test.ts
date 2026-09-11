import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Customer Order & Stock Reservation Module', () => {
  let salesToken: string;
  let opsToken: string;
  let locAId: string;
  let motorItemId: string;
  const batchName = `BATCH-RES-${Date.now()}`;

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

    await prisma.inventory.create({
      data: {
        itemId: motorItemId,
        locationId: locAId,
        batchNumber: batchName,
        physicalQuantity: 100,
        reservedQuantity: 0
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Test 1: Cannot reserve more than available inventory', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerName: 'Delta Robotics',
        locationId: locAId,
        itemId: motorItemId,
        batchNumber: batchName,
        quantity: 120
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Cannot reserve more than available inventory/);
  });

  it('should reserve valid stock and update available quantity correctly', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerName: 'Beta Manufacturing',
        locationId: locAId,
        itemId: motorItemId,
        batchNumber: batchName,
        quantity: 60
      });

    expect(res.status).toBe(201);
    expect(res.body.data.inventoryStatus.physicalQuantity).toBe(100);
    expect(res.body.data.inventoryStatus.reservedQuantity).toBe(60);
    expect(res.body.data.inventoryStatus.availableQuantity).toBe(40);
  });

  it('Concurrent Race Condition Prevention: Available = 100, User A reserves 80, User B reserves 50 -> Both must not succeed', async () => {
    const raceBatch = `BATCH-RACE-${Date.now()}`;
    await prisma.inventory.create({
      data: {
        itemId: motorItemId,
        locationId: locAId,
        batchNumber: raceBatch,
        physicalQuantity: 100,
        reservedQuantity: 0
      }
    });

    const promiseA = request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerName: 'Buyer Alpha',
        locationId: locAId,
        itemId: motorItemId,
        batchNumber: raceBatch,
        quantity: 80
      });

    const promiseB = request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerName: 'Buyer Beta',
        locationId: locAId,
        itemId: motorItemId,
        batchNumber: raceBatch,
        quantity: 50
      });

    const [resA, resB] = await Promise.all([promiseA, promiseB]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(400);

    const successfulRes = resA.status === 201 ? resA : resB;
    const failedRes = resA.status === 400 ? resA : resB;

    expect(successfulRes.body.success).toBe(true);
    expect(failedRes.body.success).toBe(false);
    expect(failedRes.body.error).toMatch(/Cannot reserve more than available inventory/);
  });

  it('should reject Operations user from creating Customer Orders (RBAC)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        customerName: 'Hacker Corp',
        locationId: locAId,
        itemId: motorItemId,
        batchNumber: batchName,
        quantity: 10
      });

    expect(res.status).toBe(403);
  });
});