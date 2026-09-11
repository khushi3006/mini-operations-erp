import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Internal Stock Transfers Module', () => {
  let opsToken: string;
  let salesToken: string;
  let locAId: string;
  let locBId: string;
  let boltItemId: string;

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

    // Ensure known baseline inventory for SKU-BOLT-03 at LOC-A
    // Physical = 200, Reserved = 50 -> Available = 150
    await prisma.inventory.upsert({
      where: {
        itemId_locationId_batchNumber: {
          itemId: boltItemId,
          locationId: locAId,
          batchNumber: 'BATCH-2026-B1'
        }
      },
      update: { physicalQuantity: 200, reservedQuantity: 50 },
      create: {
        itemId: boltItemId,
        locationId: locAId,
        batchNumber: 'BATCH-2026-B1',
        physicalQuantity: 200,
        reservedQuantity: 50
      }
    });

    // Delete any existing inventory for this batch at LOC-B
    await prisma.inventory.deleteMany({
      where: {
        itemId: boltItemId,
        locationId: locBId,
        batchNumber: 'BATCH-2026-B1'
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Test 2: Cannot transfer more than available inventory', async () => {
    // Available is 150 (200 - 50). Trying to create/dispatch transfer of 160 should fail.
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        transferNumber: 'TRF-TEST-OVERFLOW',
        sourceLocationId: locAId,
        destinationLocationId: locBId,
        itemId: boltItemId,
        batchNumber: 'BATCH-2026-B1',
        quantity: 160
      });

    expect(createRes.status).toBe(400);
    expect(createRes.body.success).toBe(false);
    expect(createRes.body.error).toMatch(/Cannot transfer more than available inventory/);
  });

  it('Test 3: Destination stock increases ONLY after transfer receipt', async () => {
    // 1. Create valid transfer of 50 units (Available is 150)
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        transferNumber: 'TRF-TEST-2PHASE',
        sourceLocationId: locAId,
        destinationLocationId: locBId,
        itemId: boltItemId,
        batchNumber: 'BATCH-2026-B1',
        quantity: 50
      });

    expect(createRes.status).toBe(201);
    const transferId = createRes.body.data.id;

    // 2. Dispatch the transfer
    const dispatchRes = await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(dispatchRes.status).toBe(200);

    // Source inventory should be reduced from 200 to 150
    const sourceInv = await prisma.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId: boltItemId,
          locationId: locAId,
          batchNumber: 'BATCH-2026-B1'
        }
      }
    });
    expect(sourceInv!.physicalQuantity).toBe(150);

    // CRITICAL INVARIANT: Destination inventory must NOT have increased yet (should not exist or be 0)
    const destInvBefore = await prisma.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId: boltItemId,
          locationId: locBId,
          batchNumber: 'BATCH-2026-B1'
        }
      }
    });
    expect(destInvBefore).toBeNull();

    // 3. Receive the transfer
    const receiveRes = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(receiveRes.status).toBe(200);

    // Destination inventory must now be 50
    const destInvAfter = await prisma.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId: boltItemId,
          locationId: locBId,
          batchNumber: 'BATCH-2026-B1'
        }
      }
    });
    expect(destInvAfter!.physicalQuantity).toBe(50);
  });

  it('Test 4: Same transfer cannot be received twice (Idempotency & Double-Receipt rejection)', async () => {
    // Find the already received transfer
    const transfers = await prisma.stockTransfer.findMany({
      where: { transferNumber: 'TRF-TEST-2PHASE' }
    });
    const transferId = transfers[0].id;

    // Attempt second receipt
    const secondReceiveRes = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(secondReceiveRes.status).toBe(400);
    expect(secondReceiveRes.body.success).toBe(false);
    expect(secondReceiveRes.body.error).toMatch(/Same transfer cannot be received twice/);

    // Verify destination stock did NOT increase again (remains 50)
    const destInv = await prisma.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId: boltItemId,
          locationId: locBId,
          batchNumber: 'BATCH-2026-B1'
        }
      }
    });
    expect(destInv!.physicalQuantity).toBe(50);
  });

  it('should reject Sales user from creating or managing transfers (RBAC)', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        transferNumber: 'TRF-SALES-UNAUTHORIZED',
        sourceLocationId: locAId,
        destinationLocationId: locBId,
        itemId: boltItemId,
        batchNumber: 'BATCH-2026-B1',
        quantity: 10
      });

    expect(res.status).toBe(403);
  });
});