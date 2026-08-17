import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema(
  {
    referralId: { type: String, unique: true },
    patientName: { type: String, required: true },
    patientId: { type: String },
    patientAge: { type: Number },
    patientGender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Other' },
    patientLocation: { type: String },
    sendingHospitalId: { type: String, required: true },
    sendingHospitalName: { type: String },
    sendingDoctor: { type: String },
    receivingHospitalId: { type: String, required: true },
    receivingHospitalName: { type: String },
    department: { type: String, required: true },
    urgency: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    reasonForReferral: { type: String, required: true },
    clinicalSummary: { type: String },
    documents: [{ type: String }],
    contactPhone: { type: String },
    status: {
      type: String,
      enum: ['Pending Review', 'Accepted', 'Rejected'],
      default: 'Pending Review',
    },
    acceptedAt: { type: Date },
    assignedDoctor: { type: String },
    queueToken: { type: String },
    appointmentTime: { type: Date },
  },
  { timestamps: true }
);

// Auto-generate referralId before saving
referralSchema.pre('save', async function (next) {
  if (!this.referralId) {
    const count = await mongoose.model('Referral').countDocuments();
    const refNum = String(count + 453).padStart(5, '0');
    this.referralId = `REF-2026-${refNum}`;
  }
  next();
});

const Referral = mongoose.model('Referral', referralSchema);
export default Referral;
