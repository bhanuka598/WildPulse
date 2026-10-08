require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Routes
const authRoutes = require('./routes/authRoutes');
const patrolRoutes = require('./routes/patrolRoutes');
const fieldIncidentRoutes = require('./routes/fieldIncidentRoutes');
const conflictRoutes = require('./routes/conflictRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io initialization with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`⚡ Client connected to WildPulse Socket: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.get('/', (req, res) => res.json({ status: 'ok', service: 'WildPulse API' }));

app.use('/api/auth', authRoutes);
app.use('/api/patrols', patrolRoutes);
app.use('/api/field-incidents', fieldIncidentRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));