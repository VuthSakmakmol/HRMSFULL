//backend/seed/seedGM
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function seedGM() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const exists = await User.findOne({ role: 'GeneralManager' });
  if (exists) {
    console.log('✅ General Manager already exists');
    process.exit();
  }

  const gm = new User({
    name: 'Super GM',
    email: 'gm@hrms.com',
    password: 'Admin@123', // will be hashed
    role: 'GeneralManager'
  });

  await gm.save();
  console.log('✅ General Manager created');
  process.exit();
}

seedGM();
