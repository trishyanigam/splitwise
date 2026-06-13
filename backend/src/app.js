const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const apiRouter = require('./routes/index.js');
const { errorHandler } = require('./middleware/errorMiddleware.js');

const app = express();

// Set CORS config. Frontend is expected on localhost:5173 by default for Vite
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
}));

// Body parsers and cookie handler
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Base health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Shared Expense API'
  });
});

// Mount application API routes
app.use('/api', apiRouter);

// Register global exception catching middleware
app.use(errorHandler);

module.exports = app;
