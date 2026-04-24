cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const db = {
  users: [{ id: 1, email: 'immoenss@gmail.com', password: bcrypt.hashSync('admin', 10), role: 'admin', name: 'Admin' }],
  rooms: [],
  orders: [],
  defects: [],
  objects: [
    { id: 1, name: 'Basic Monteurzimmer Work & Stay', count: 10 },
    { id: 2, name: 'Ferienwohnung Lieblingsort', count: 1 },
    { id: 3, name: 'Fewo Mariaberg Janin', count: 2 },
    { id: 4, name: 'KemptenCityHostPlus', count: 9 },
    { id: 5, name: 'Mountain Apartment 2', count: 1 },
    { id: 6, name: 'Mountain Apartment', count: 1 },
    { id: 7, name: 'Mountain Apartments Leutkirch', count: 2 },
    { id: 8, name: 'Shared-LiveWork Suites', count: 6 },
    { id: 9, name: 'Timos Dahoam', count: 1 },
    { id: 10, name: 'Work & Stay KemptenCityHost', count: 6 },
    { id: 11, name: 'Work & Travel Lodge Münsingen', count: 6 }
  ]
};

const JWT_SECRET = 'your-secret-key-change-in-production';

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/api/objects', verifyToken, (req, res) => {
  res.json(db.objects);
});

app.get('/api/objects/:objectId/rooms', verifyToken, (req, res) => {
  const rooms = db.rooms.filter(r => r.objectId === parseInt(req.params.objectId));
  res.json(rooms);
});

app.post('/api/orders', verifyToken, (req, res) => {
  const { roomId, objectId, description, quantity } = req.body;
  const order = {
    id: Math.max(...db.orders.map(o => o.id || 0), 0) + 1,
    roomId, objectId, description, quantity,
    status: 'open',
    createdBy: req.user.email,
    createdAt: new Date()
  };
  db.orders.push(order);
  res.status(201).json(order);
});

app.post('/api/defects', verifyToken, (req, res) => {
  const { roomId, objectId, description, severity } = req.body;
  const defect = {
    id: Math.max(...db.defects.map(d => d.id || 0), 0) + 1,
    roomId, objectId, description,
    severity: severity || 'medium',
    status: 'open',
    createdBy: req.user.email,
    createdAt: new Date()
  };
  db.defects.push(defect);
  res.status(201).json(defect);
});

app.get('/api/admin/orders', verifyToken, (req, res) => {
  const { objectId } = req.query;
  let orders = db.orders;
  if (objectId) orders = orders.filter(o => o.objectId === parseInt(objectId));
  res.json(orders);
});

app.get('/api/admin/defects', verifyToken, (req, res) => {
  const { objectId } = req.query;
  let defects = db.defects;
  if (objectId) defects = defects.filter(d => d.objectId === parseInt(objectId));
  res.json(defects);
});

app.get('/api/admin/users', verifyToken, (req, res) => {
  res.json(db.users.filter(u => u.role !== 'admin').map(u => ({ id: u.id, email: u.email, name: u.name })));
});

app.post('/api/admin/users', verifyToken, (req, res) => {
  const { email, password, name } = req.body;
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email exists' });
  }
  const user = {
    id: Math.max(...db.users.map(u => u.id), 0) + 1,
    email, password: bcrypt.hashSync(password, 10), role: 'user', name: name || email
  };
  db.users.push(user);
  res.status(201).json({ id: user.id, email: user.email, name: user.name });
});

app.delete('/api/admin/users/:id', verifyToken, (req, res) => {
  const idx = db.users.findIndex(u => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  db.users.splice(idx, 1);
  res.json({ success: true });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
EOF
