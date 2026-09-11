import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Internal Stock Transfers Module', () => {
  let opsToken: string;
  let salesToken: string;
  let locAId: string;
  let locBId: string;
  let boltItemId: string;
  const batchName = `BATCH-TRF-${Date.now()}`;

  beforeAll(async () => {
    const opsRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ops@erp.com', password: 'ops123' });
    opsToken = opsRes.body.data.token;

    const salesRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales@erp.com', password: 'sales123' });
    salesToken = salesRes.body.data.token;

    const locA = await prisma.location.findUnique({ where: { code: 'LOC-A' } });
    locAId = locA!.id;

    const locB = await prisma.location.findUnique({ where: { code: 'LOC-B' } });
    locBId = locB!.id;

    const item = await prisma.item.findUnique({ where: { sku: 'SKU-BOLT-03' } });
    boltItemId = item!.id;

    // Create unique batch for this test suite
    await prisma.inventory.create({
      data: {
        itemId: boltItemId,
        locationId: locAId,
        batchNumber: batchName,
        physicalQuantity: 200,
        reservedQuantity: 50 // Available = 150
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Test 2: Cannot transfer more than available inventory', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        sourceLocationId: locAId,
        destinationLocationId: locBId,
        itemId: boltItemId,
        batchNumber: batchName,
        quantity: 160
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Cannot transfer more than available inventory/);
  });

  it('Test 3: Destination stock increases ONLY after transfer receipt', async () => {
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        sourceLocationId: locAId,
        destinationLocationId: locBId,
        itemId: boltItemId,
        batchNumber: batchName,
        quantity: 50
      });

    expect(createRes.status).toBe(201);
    const transferId = createRes.body.data.id;

    // Dispatch
    const dispatchRes = await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(dispatchRes.status).toBe(200);

    // Source reduced
    const sourceInv = await prisma.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId: boltItemId,
          locationId: locAId,
          batchNumber: batchName
        }
      }
    });
    expect(sourceInv!.physicalQuantity).toBe(150);

    // Destination NOT increased yet
    const destBefore = await prisma.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId: boltItemId,
          locationId: locBId,
          batchNumber: batchName
        }
      }
    });
    expect(destBefore).toBeNull();

    // Receive
    const receiveRes = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(receiveRes.status).toBe(200);

    // Destination increased
    const destAfter = await prisma.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId: boltItemId,
          locationId: locBId,
          batchNumber: batchName
        }
      }
    });
    expect(destAfter!.physicalQuantity).toBe(50);
  });

  it('Test 4: Same transfer cannot be received twice', async () => {
    const transfers = await prisma.stockTransfer.findMany({
      where: { batchNumber: batchName, status: 'RECEIVED' }
    });
    const transferId = transfers[0].id;

    const secondReceive = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(secondReceive.status).toBe(400);
    expect(secondReceive.body.error).toMatch(/Same transfer cannot be received twice/);
  });

  it('should reject Sales user from creating or managing transfers (RBAC)', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        sourceLocationId: locAId,
        destinationLocationId: locBId,
        itemId: boltItemId,
        batchNumber: batchName,
        quantity: 10
      });

    expect(res.status).toBe(403);
  });
});