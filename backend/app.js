const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');

dotenv.config();
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

io.on('connection', (socket) => {
  console.log('📡 WebSocket client connected:', socket.id)

  socket.on('joinRoom', (roomName) => {
    socket.join(roomName)
    console.log(`📥 Socket ${socket.id} joined room: ${roomName}`)
  })

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id)
  })
})


app.set('io', io);

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// 🔗 Serve candidate documents
app.use('/uploads/candidate_docs', express.static(path.join(__dirname, 'uploads/candidate_docs')));

// ─── API ROUTES ────────────────────────────────────────────────────────────────

// General Auth/User Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// TA Module Routes
app.use('/api', require('./routes/ta/departmentRoutes'));
app.use('/api', require('./routes/ta/jobRequisitionRoutes'));
app.use('/api/roadmaps', require('./routes/ta/roadmapRoutes'));
app.use('/api/dashboard', require('./routes/ta/dashboardRoutes'));
app.use('/api/report', require('./routes/ta/reportRoutes'));
app.use('/api/recruiters', require('./routes/ta/recruiterRoutes'));
app.use('/api/candidates', require('./routes/ta/candidateRoutes'));
app.use('/api/activity-logs', require('./routes/ta/activityLogRoutes'));

// HRSS Module Routes
app.use('/api/employees', require('./routes/hrss/employeeRoutes')); 
app.use('/api/location', require('./routes/hrss/locationRoutes'))
app.use('/api/meta', require('./routes/hrss/metaRoutes'))


// HRSS Attendance
app.use('/api/attendance', require('./routes/hrss/attendanceRoutes'))

// Evaluate
app.use('/api/evaluations', require('./routes/hrss/evaluationRoutes'));

// HRSS Dashboard
app.use('/api/hrss/dashboard', require('./routes/hrss/dashboardRoutes'));


// 🔗 Serve uploaded profile images
app.use('/upload', express.static(path.join(__dirname, 'upload'))) // ✅ required

// 📦 Register upload route
const uploadRoutes = require('./routes/hrss/upload')
app.use('/api/upload', uploadRoutes) // ✅ mount it under /api/upload


// ─── SERVE FRONTEND ────────────────────────────────────────────────────────────
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

// Handle SPA routes properly (Vue, React, etc.)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ─── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.send('✅ HRMS API is running...');
});

// Large data import
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));


// ─── MONGODB CONNECTION ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, {

})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ─── START SERVER ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4700;

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

