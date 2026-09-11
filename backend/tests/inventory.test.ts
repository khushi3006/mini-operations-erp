import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Inventory Module', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ops@erp.com', password: 'ops123' });
    token = res.body.data.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should fetch all inventory records with correctly calculated available quantity', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    // Verify Available Quantity invariant: Available = Physical - Reserved
    res.body.data.forEach((item: any) => {
      expect(item.availableQuantity).toBe(item.physicalQuantity - item.reservedQuantity);
      expect(item.physicalQuantity).toBeGreaterThanOrEqual(0);
      expect(item.reservedQuantity).toBeGreaterThanOrEqual(0);
      expect(item.availableQuantity).toBeGreaterThanOrEqual(0);
    });
  });

  it('should filter inventory by location', async () => {
    const locationsRes = await request(app)
      .get('/api/inventory/locations')
      .set('Authorization', `Bearer ${token}`);

    const locA = locationsRes.body.data.find((l: any) => l.code === 'LOC-A');
    expect(locA).toBeDefined();

    const res = await request(app)
      .get(`/api/inventory?locationId=${locA.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((inv: any) => {
      expect(inv.locationId).toBe(locA.id);
    });
  });

  it('should fetch list of locations and items', async () => {
    const locRes = await request(app)
      .get('/api/inventory/locations')
      .set('Authorization', `Bearer ${token}`);
    expect(locRes.status).toBe(200);
    expect(locRes.body.data.length).toBe(3);

    const itemsRes = await request(app)
      .get('/api/inventory/items')
      .set('Authorization', `Bearer ${token}`);
    expect(itemsRes.status).toBe(200);
    expect(itemsRes.body.data.length).toBe(4);
  });
});