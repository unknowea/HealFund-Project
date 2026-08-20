import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema({
  donorName: { type: String, default: 'Anonymous Supporter' },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'Telebirr' },
  donatedAt: { type: Date, default: Date.now },
});

const financialCaseSchema = new mongoose.Schema(
  {
    caseId: { type: String, unique: true },
    patientId: { type: String },
    patientName: { type: String, required: true },
    age: { type: Number },
    location: { type: String },
    diagnosis: { type: String, required: true },
    verifyingHospital: { type: String },
    verifiedByDoctor: { type: String },
    verificationStage1: { type: String },
    verificationStage2: { type: String },
    targetAmount: { type: Number, required: true },
    raisedAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'ETB' },
    description: { type: String },
    status: {
      type: String,
      enum: ['Active', 'Funded', 'Closed'],
      default: 'Active',
    },
    donorsCount: { type: Number, default: 0 },
    donations: [donationSchema],
  },
  { timestamps: true }
);

financialCaseSchema.pre('save', async function (next) {
  if (!this.caseId) {
    const count = await mongoose.model('FinancialCase').countDocuments();
    const year = new Date().getFullYear();
    this.caseId = `CASE-${year}-${String(8800 + count + 1)}`;
  }
  next();
});

const FinancialCase = mongoose.model('FinancialCase', financialCaseSchema);
export default FinancialCase;
