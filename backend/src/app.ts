import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './docs/swagger.json';

import authRoutes from './routes/authRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import workOrderRoutes from './routes/workOrderRoutes';
import transferRoutes from './routes/transferRoutes';
import orderRoutes from './routes/orderRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

// Swagger Documentation UI mounted at /api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Base health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/orders', orderRoutes);

// Centralized error handler
app.use(errorHandler);

export default app;