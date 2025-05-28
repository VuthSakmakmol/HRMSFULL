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

// ─── ROUTES ────────────────────────────────────────────────────────────────────

// General Auth/User Routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

// TA Module Routes
const departmentRoutes = require('./routes/ta/departmentRoutes');
const jobRequisitionRoutes = require('./routes/ta/jobRequisitionRoutes');

app.use('/api', departmentRoutes);
app.use('/api', jobRequisitionRoutes);
app.use('/api/recruiters', require('./routes/ta/recruiterRoutes'))

// Optional: Health check
app.get('/', (req, res) => {
  res.send('✅ HRMS API is running...');
});

// ─── MONGODB CONNECTION ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ─── START SERVER ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4700;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
