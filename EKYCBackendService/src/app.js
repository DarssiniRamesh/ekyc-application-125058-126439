const cors = require('cors');
const express = require('express');
const routes = require('./routes');
const authRoutes = require('./routes/auth');
const kycRoutes = require('./routes/kyc');
const documentsRoutes = require('./routes/documents');
const verificationRoutes = require('./routes/verification');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');
require('dotenv').config();
require('./db'); // initialize DB connection
// Run migrations on startup to ensure schema exists (safe to run repeatedly)
require('./db/migrate');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.set('trust proxy', true);
app.use('/docs', swaggerUi.serve, (req, res, next) => {
  const host = req.get('host'); // may or may not include port
  let protocol = req.protocol;  // http or https

  const actualPort = req.socket.localPort;
  const hasPort = host.includes(':');

  const needsPort =
    !hasPort &&
    ((protocol === 'http' && actualPort !== 80) ||
     (protocol === 'https' && actualPort !== 443));
  const fullHost = needsPort ? `${host}:${actualPort}` : host;
  protocol = req.secure ? 'https' : protocol;

  const dynamicSpec = {
    ...swaggerSpec,
    servers: [
      {
        url: `${protocol}://${fullHost}`,
      },
    ],
  };
  swaggerUi.setup(dynamicSpec)(req, res, next);
});

// Serve the live generated OpenAPI JSON so external tools and Swagger UI reflect the latest routes
app.get('/openapi.json', (req, res) => {
  const host = req.get('host');
  let protocol = req.protocol;

  const actualPort = req.socket.localPort;
  const hasPort = host.includes(':');

  const needsPort =
    !hasPort &&
    ((protocol === 'http' && actualPort !== 80) ||
     (protocol === 'https' && actualPort !== 443));
  const fullHost = needsPort ? `${host}:${actualPort}` : host;
  protocol = req.secure ? 'https' : protocol;

  const dynamicSpec = {
    ...swaggerSpec,
    servers: [
      {
        url: `${protocol}://${fullHost}`,
      },
    ],
  };
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(200).json(dynamicSpec);
});

// Parse JSON request body
app.use(express.json());

// Mount routes
app.use('/', routes);
app.use('/auth', authRoutes);
app.use('/kyc', kycRoutes);
app.use('/documents', documentsRoutes);
app.use('/verification', verificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err.stack || err);
  }
  res.status(status).json({
    status: status >= 500 ? 'error' : 'fail',
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
