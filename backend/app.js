const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads/candidate_docs', express.static(path.join(__dirname, 'uploads/candidate_docs')));

// Routes

const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

const departmentRoutes = require('./routes/ta/departmentRoutes');
app.use('/api/ta/departments', departmentRoutes);
const jobRequisitionRoutes = require('./routes/ta/jobRequisitionRoutes');
app.use('/api/job-requisitions', jobRequisitionRoutes);



app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);


// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 4700;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
