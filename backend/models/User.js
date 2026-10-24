import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    age: { type: Number },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Other' },
    location: { type: String, default: 'Addis Ababa' },
    patientId: { type: String, sparse: true }, // sparse allows multiple null values
    status: { type: String, enum: ['Verified', 'Pending', 'Suspended'], default: 'Verified' },
    role: { type: String, enum: ['patient', 'hospital_officer', 'admin'], default: 'patient' },
    hospitalId: { type: String },
    hospitalName: { type: String },
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
  next();
});

const User = mongoose.model('User', userSchema);
export default User;
