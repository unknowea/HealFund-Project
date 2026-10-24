import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema({
  donorName: { type: String, required: true, trim: true },
  donorEmail: { type: String, default: '', trim: true, lowercase: true },
  email: { type: String, default: '', trim: true, lowercase: true },
  accountNumber: { type: String, default: '', trim: true },
  txRef: { type: String },
  chapaTxRef: { type: String },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Chapa'], default: 'Chapa' },
  paymentStatus: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  status: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Expired', 'Unverified'], default: 'Unverified' },
  expiresAt: { type: Date },
  donatedAt: { type: Date, default: Date.now },
  paidAt: { type: Date },
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
    pendingAmount: { type: Number, default: 0 },
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

export const getConfirmedAccounting = (financialCase) => {
  const donations = financialCase.donations || [];
  const paidDonations = donations.filter((donation) => donation.status === 'Paid' || donation.paymentStatus === 'success');
  const now = new Date();
  const pendingAmount = donations.reduce((total, donation) => (
    ((donation.status === 'Pending' && donation.expiresAt > now) ||
      (donation.paymentStatus === 'pending' && donation.donatedAt > new Date(now.getTime() - 60 * 60 * 1000)))
      ? total + donation.amount
      : total
  ), 0);

  return {
    raisedAmount: paidDonations.reduce((total, donation) => total + donation.amount, 0),
    pendingAmount,
    donorsCount: paidDonations.length,
  };
};

export default FinancialCase;
