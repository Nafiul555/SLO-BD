// File structure for the Node.js backend

// server.js - Main entry point
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const session = require('express-session');
const { Pool } = require('pg');

// Import routes
const authRoutes = require('./routes/auth');
const causesRoutes = require('./routes/causes');
const requestsRoutes = require('./routes/requests');
const donationsRoutes = require('./routes/donations');
const messagesRoutes = require('./routes/messages');
const verificationRoutes = require('./routes/verification');
const statisticsRoutes = require('./routes/statistics');

// Create Express app
const app = express();

// Connect to PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Make the pool available to routes
app.locals.db = pool;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/causes', causesRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/statistics', statisticsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'An error occurred', error: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// routes/requests.js - Example route handler for aid requests
const express = require('express');
const router = express.Router();
const { authenticateUser, checkRole } = require('../middleware/auth');

// Get all aid requests with optional filtering
router.get('/', async (req, res) => {
  try {
    const { category, location, urgency } = req.query;
    
    let query = `
      SELECT r.*, u.username, u.profile_img 
      FROM requests r
      JOIN users u ON r.user_id = u.id
      WHERE r.status = 'approved'
    `;
    
    const params = [];
    
    if (category) {
      params.push(category);
      query += ` AND r.category = $${params.length}`;
    }
    
    if (location) {
      params.push(location);
      query += ` AND r.location = $${params.length}`;
    }
    
    if (urgency) {
      params.push(urgency);
      query += ` AND r.urgency = $${params.length}`;
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    const { rows } = await req.app.locals.db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get a specific request by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await req.app.locals.db.query(
      `SELECT r.*, u.username, u.profile_img 
       FROM requests r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1 AND r.status = 'approved'`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create a new aid request (requires authentication)
router.post('/', authenticateUser, checkRole('receiver'), async (req, res) => {
  try {
    const { title, summary, description, category, location, urgency, amount_needed } = req.body;
    const userId = req.user.id;
    
    const { rows } = await req.app.locals.db.query(
      `INSERT INTO requests (
        user_id, title, summary, description, category, 
        location, urgency, amount_needed, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userId, title, summary, description, category, location, urgency, amount_needed, 'pending']
    );
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update a request (owner or admin only)
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary, description, category, location, urgency, amount_needed, status } = req.body;
    
    // Check if user is owner or admin
    const { rows: requestRows } = await req.app.locals.db.query(
      'SELECT user_id FROM requests WHERE id = $1',
      [id]
    );
    
    if (requestRows.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    const isOwner = requestRows[0].user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    let query = 'UPDATE requests SET ';
    const params = [];
    const updates = [];
    
    if (title) {
      params.push(title);
      updates.push(`title = $${params.length}`);
    }
    
    if (summary) {
      params.push(summary);
      updates.push(`summary = $${params.length}`);
    }
    
    if (description) {
      params.push(description);
      updates.push(`description = $${params.length}`);
    }
    
    if (category) {
      params.push(category);
      updates.push(`category = $${params.length}`);
    }
    
    if (location) {
      params.push(location);
      updates.push(`location = $${params.length}`);
    }
    
    if (urgency) {
      params.push(urgency);
      updates.push(`urgency = $${params.length}`);
    }
    
    if (amount_needed) {
      params.push(amount_needed);
      updates.push(`amount_needed = $${params.length}`);
    }
    
    // Only admins can update status
    if (status && isAdmin) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    query += updates.join(', ');
    
    params.push(id);
    query += ` WHERE id = $${params.length} RETURNING *`;
    
    const { rows } = await req.app.locals.db.query(query, params);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
