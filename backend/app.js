const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();

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

// ─── MONGODB CONNECTION ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ─── START SERVER ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4700;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
