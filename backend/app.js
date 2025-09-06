const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();
const app = express();
const server = http.createServer(app);

/* ───────────────────────── WebSocket ───────────────────────── */
const io = new Server(server, { cors: { origin: '*' } });
io.on('connection', (socket) => {
  console.log('📡 WebSocket client connected:', socket.id);
  socket.on('joinRoom', (roomName) => socket.join(roomName));
  socket.on('disconnect', () => console.log('❌ Client disconnected:', socket.id));
});
app.set('io', io);

/* ───────────────────────── Middleware (ORDER MATTERS) ───────────────────────── */
// CORS first
app.use(cors());

// ⬇️ SINGLE body parser with large limits (applies to ALL routes below)
app.use(express.json({ limit: '800mb' }));
app.use(express.urlencoded({ limit: '800mb', extended: true }));

// 🔗 Static (ok to keep here)
app.use('/uploads/candidate_docs', express.static(path.join(__dirname, 'uploads/candidate_docs')));
app.use('/upload', express.static(path.join(__dirname, 'upload')));

/* ───────────────────────── API ROUTES ───────────────────────── */
// General
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// TA
app.use('/api', require('./routes/ta/departmentRoutes'));
app.use('/api', require('./routes/ta/jobRequisitionRoutes'));
app.use('/api/roadmaps', require('./routes/ta/roadmapRoutes'));
app.use('/api/dashboard', require('./routes/ta/dashboardRoutes'));
app.use('/api/report', require('./routes/ta/reportRoutes'));
app.use('/api/recruiters', require('./routes/ta/recruiterRoutes'));
app.use('/api/candidates', require('./routes/ta/candidateRoutes'));
app.use('/api/activity-logs', require('./routes/ta/activityLogRoutes'));

// HRSS
app.use('/api/employees', require('./routes/hrss/employeeRoutes'));
app.use('/api/location', require('./routes/hrss/locationRoutes'));
app.use('/api/meta', require('./routes/hrss/metaRoutes'));
app.use('/api/hrss/excome', require('./routes/hrss/excomeRoutes'));
app.use('/api/hrss/excome-monthly', require('./routes/hrss/excome/employeeMonthlyCountRoutes'));
app.use('/api/attendance', require('./routes/hrss/attendanceRoutes'));
app.use('/api/work-calendar', require('./routes/hrss/calendarRoutes'));
app.use('/api/hrss/attendance-dashboard', require('./routes/hrss/attendanceDashboardRoutes'));
app.use('/api/hrss/manpower', require('./routes/hrss/manpower'));
app.use('/api/evaluations', require('./routes/hrss/evaluationRoutes'));
app.use('/api/hrss/dashboard', require('./routes/hrss/dashboardRoutes'));
app.use('/api/hrss/shift-templates', require('./routes/hrss/shiftTemplateRoutes'));
app.use('/api/hrss/shift-assignments', require('./routes/hrss/shiftAssignmentRoutes'));


// Upload routes (if any)
app.use('/api/upload', require('./routes/hrss/upload'));

/* ───────────────────────── Health + Frontend ───────────────────────── */
app.get('/api/health', (req, res) => res.send('✅ HRMS API is running...'));

const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

// ⚠️ Keep this LAST
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

/* ───────────────────────── Mongo + Server ───────────────────────── */
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => console.error('❌ MongoDB connection error:', err));

const PORT = process.env.PORT || 4700;
server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
