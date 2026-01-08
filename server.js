const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173' }
});

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'realtime_db',
  password: '1234',
  port: 5432,
});

/* Socket connection */
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
});

/* API: items */
app.get('/items', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM items ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List items error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* API: Add new item */
app.post('/items', async (req, res) => {
  try {
    const { name } = req.body;

    // Check empty / invalid
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        message: 'Name is required'
      });
    }

    const result = await pool.query(
      'INSERT INTO items(name) VALUES($1) RETURNING *',
      [name.trim()]
    );

    const newItem = result.rows[0];

    // Emit real-time event (หลัง insert สำเร็จเท่านั้น)
    io.emit('item_created', newItem);

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

/* API: Update item */
app.put('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validate id
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid item id' });
    }

    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }

    const result = await pool.query(
      `
      UPDATE items
      SET name = $1
      WHERE id = $2
      RETURNING *
      `,
      [name.trim(), id]
    );

    // ถ้าไม่เจอ record
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const updatedItem = result.rows[0];

    // Emit real-time update event
    io.emit('item_updated', updatedItem);

    res.json(updatedItem);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid item id' });
    }

    const result = await pool.query(
      'DELETE FROM items WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Emit delete event
    io.emit('item_deleted', { id: Number(id) });

    res.json({ id: Number(id) });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


server.listen(4000, () => {
  console.log('Server running on port 4000');
});
