// models/hrss/employee.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const addressSchema = new Schema({
  provinceNameKh: { type: String, default: '' },
  districtNameKh: { type: String, default: '' },
  communeNameKh: { type: String, default: '' },
  villageNameKh: { type: String, default: '' }
}, { _id: false });

const shiftHistorySchema = new Schema({
  shiftTemplateId: { type: Schema.Types.ObjectId, ref: 'ShiftTemplate', required: true },
  from: { type: Date, required: true },
  to:   { type: Date, default: null } // null = current
}, { _id: false });

const employeeSchema = new Schema({
  // 👤 Profile
  profileImage: { type: String, default: '' },

  // 🔖 Identification
  employeeId: { type: String, required: true, index: true },
  company: { type: String, default: '' },

  // 🧑‍💼 Personal Info
  khmerFirstName: { type: String, default: '' },
  khmerLastName: { type: String, default: '' },
  englishFirstName: { type: String, default: '' },
  englishLastName: { type: String, default: '' },
  gender: { type: String, enum: ['Male', 'Female', ''], default: '' },
  dob: { type: Date, default: null },
  age: { type: Number, default: null },
  email: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  agentPhoneNumber: { type: String, default: '' },
  agentPerson: { type: String, default: '' },
  note: { type: String, default: '' },

  // 👪 Family
  marriedStatus: { type: String, enum: ['Single', 'Married', 'Divorced', ''], default: '' },
  spouseName: { type: String, default: '' },
  spouseContactNumber: { type: String, default: '' },

  // 📚 Education & Religion
  education: { type: String, enum: ['Primary School','Secondary School','High School','Bachelor Degree','Master','Doctor',''], default: '' },
  religion: { type: String, enum: [ 'Buddhism', 'Islam' ,'Christianity', 'Hinduism', ''], default: '' },
  nationality: { type: String, enum: ['Khmer','Thai','Vietnamese','Filipino','Sri Lankan','Bangladeshi','Indian',''], default: '' },  
  resignReason: { type: String, enum: ['Could not Contact', 'Take care of child/children', 'Heath Issue', 'Family Issue',
    'Change Carrer', 'Take care of the parent', 'Personal Issue',
    'Back to homland', 'Family-owned business/farm', 'Supervisor/Leader Attitude', 'Contract not renwed', 'Go to work oversea',
    'Teamwork Issue', 'Distance of the workplace', 'Transportation Issue', ''
  ], default: ''},

  // 📍 Address
  placeOfBirth: { type: addressSchema, default: () => ({}) },
  placeOfLiving: { type: addressSchema, default: () => ({}) },

  // 🏢 Work Info
  joinDate: { type: Date, default: null },
  department: { type: String, default: '' },
  position: { type: String, default: '' },
  line: { type: String, default: '' },
  team: { type: String, default: '' },
  section: { type: String, default: '' },

  // ✅ New: reference an existing Shift Template
  shiftTemplateId: { type: Schema.Types.ObjectId, ref: 'ShiftTemplate', default: null, index: true },
  shiftEffectiveFrom: { type: Date, default: null },
  shiftHistory: { type: [shiftHistorySchema], default: [] },

  // 🔁 Legacy (kept for old data, do not use going forward)
  shift:     { type: String, default: '' },  // e.g., "Day Shift" / "Night Shift" (deprecated)
  shiftName: { type: String, default: '' },  // deprecated duplicate

  status: { type: String, enum: ['Working', 'Resign', 'Terminate', 'Abandon', 'Pass Away', 'Retirement', ''], default: 'Working' },
  resignDate: { type: Date, default: null },
  remark: { type: String, default: '' },

  // 📄 Documents
  idCard: { type: String, default: '' },
  idCardExpireDate: { type: Date, default: null },
  nssf: { type: String, default: '' },
  passport: { type: String, default: '' },
  passportExpireDate: { type: Date, default: null },
  visaExpireDate: { type: Date, default: null },
  medicalCheck: { type: String, default: '' },
  medicalCheckDate: { type: Date, default: null },
  workingBook: { type: String, default: '' },

  // 📥 Source & Skills
  sourceOfHiring: { type: String, enum: ['Agency', 'Job Announcement Board', 'Brochure', 'MOL', 'FIF Fail', 'FIF', 'Facebook', 'HR Call', 'Job Portal', 'Banner', 'LinkedIn','Telegram', ''], default: '' },
  introducerId: { type: String, default: '' },
  employeeType: { type: String, enum: ['Direct','Indirect','Marketing',''], default: '' }, 
  singleNeedle: { type: String, default: '' },
  overlock: { type: String, default: '' },
  coverstitch: { type: String, default: '' },
  totalMachine: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
