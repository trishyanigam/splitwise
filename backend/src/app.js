const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const apiRouter = require('./routes/index.js');
const { errorHandler } = require('./middleware/errorMiddleware.js');

const app = express();

// Enable CORS
app.use(cors({
  origin: [
    "http://localhost:5173",
    ""
  ],
  credentials: true
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
