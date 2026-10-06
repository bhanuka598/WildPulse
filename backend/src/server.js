require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Routes
const authRoutes = require('./routes/authRoutes');
/*const patrolRoutes = require('./routes/patrolRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
*/const conflictRoutes = require('./routes/conflictRoutes');/*
const wildlifeRoutes = require('./routes/wildlifeRoutes');
const alertRoutes = require('./routes/alertRoutes');*/
const analyticsRoutes = require('./routes/analyticsRoutes');

connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.get('/', (req, res) => res.json({ status: 'ok', service: 'WildPulse API' }));

app.use('/api/auth', authRoutes);
/*app.use('/api/patrols', patrolRoutes);
app.use('/api/incidents', incidentRoutes);
*/app.use('/api/conflicts', conflictRoutes);/*
app.use('/api/wildlife', wildlifeRoutes);
app.use('/api/alerts', alertRoutes);*/
app.use('/api/analytics', analyticsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));