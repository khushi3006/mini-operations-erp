import request from 'supertest';
import app from '../src/app';

describe('Swagger Documentation Module', () => {
  it('should serve Swagger UI at /api/docs/', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Swagger UI');
  });

  it('should respond to health check at /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});