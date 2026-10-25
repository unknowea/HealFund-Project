import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    age: { type: Number },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
    location: { type: String, default: 'Addis Ababa' },
    patientId: { type: String, sparse: true }, // sparse allows multiple null values
    adminId: { type: String, unique: true, sparse: true },
    status: { type: String, enum: ['Verified', 'Pending', 'Suspended'], default: 'Verified' },
    role: { type: String, enum: ['patient', 'hospital_officer', 'admin'], default: 'patient' },
    hospitalId: { type: String },
    hospitalName: { type: String },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    profilePhoto: { type: String, default: '' },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare plain password with hashed
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Auto-generate patientId for patients
userSchema.pre('save', async function (next) {
  if (!this.patientId && this.role === 'patient') {
    const count = await mongoose.model('User').countDocuments({ role: 'patient' });
    this.patientId = `HF-${String(count + 1).padStart(4, '0')}`;
  }
  if (this.role === 'admin') {
    const ownerEmail = (process.env.OWNER_EMAIL || 'healfund2006@gmail.com').trim().toLowerCase();
    const prefix = this.email.toLowerCase() === ownerEmail ? 'HFO' : 'HFA';
    if (!this.adminId || !new RegExp(`^${prefix}-\\d{4}$`).test(this.adminId)) {
      let candidate;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        candidate = `${prefix}-${String(randomInt(0, 10000)).padStart(4, '0')}`;
        if (!await mongoose.model('User').exists({ adminId: candidate })) break;
        candidate = null;
      }
      if (!candidate) return next(new Error('Could not allocate a unique admin ID. Please try again.'));
      this.adminId = candidate;
    }
  }
  next();
});

const User = mongoose.model('User', userSchema);
export default User;
