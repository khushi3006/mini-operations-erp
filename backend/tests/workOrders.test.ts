import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Work Orders & Shortage Calculation Module', () => {
  let adminToken: string;
  let opsToken: string;
  let salesToken: string;
  let locAId: string;
  let steelItemId: string;
  let opsUserId: string;

  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@erp.com', password: 'admin123' });
    adminToken = adminRes.body.data.token;

    const opsRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ops@erp.com', password: 'ops123' });
    opsToken = opsRes.body.data.token;
    opsUserId = opsRes.body.data.user.id;

    const salesRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales@erp.com', password: 'sales123' });
    salesToken = salesRes.body.data.token;

    const loc = await prisma.location.findUnique({ where: { code: 'LOC-A' } });
    locAId = loc!.id;

    const item = await prisma.item.findUnique({ where: { sku: 'SKU-STEEL-01' } });
    steelItemId = item!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should allow Admin to create a Work Order and calculate shortage automatically', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        workOrderNumber: `WO-TEST-${Date.now()}`,
        locationId: locAId,
        itemId: steelItemId,
        requiredQuantity: 100,
        assignedUserId: opsUserId
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ASSIGNED');
    expect(res.body.data.shortageQuantity).toBeDefined();
  });

  it('should reject Sales user from creating a Work Order (RBAC)', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        workOrderNumber: `WO-SALES-${Date.now()}`,
        locationId: locAId,
        itemId: steelItemId,
        requiredQuantity: 50,
        assignedUserId: opsUserId
      });

    expect(res.status).toBe(403);
  });

  it('should allow Operations user to update work order status', async () => {
    const listRes = await request(app)
      .get('/api/work-orders')
      .set('Authorization', `Bearer ${opsToken}`);

    const woId = listRes.body.data[0].id;

    const updateRes = await request(app)
      .patch(`/api/work-orders/${woId}/status`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('IN_PROGRESS');
  });
});