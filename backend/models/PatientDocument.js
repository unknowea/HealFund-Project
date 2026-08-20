import mongoose from 'mongoose';

const patientDocumentSchema = new mongoose.Schema(
  {
    documentId: { type: String, unique: true },
    patientId: { type: String, required: true },
    patientName: { type: String, required: true },
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    size: { type: String },
    type: { type: String },
    category: { type: String, default: 'General Medical Document' },
    uploadDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['Pending Verification', 'Verified', 'Rejected'],
      default: 'Pending Verification',
    },
    adminNote: { type: String, default: '' },
    queueToken: { type: String, default: null },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

patientDocumentSchema.pre('save', async function (next) {
  if (!this.documentId) {
    const count = await mongoose.model('PatientDocument').countDocuments();
    this.documentId = `DOC-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const PatientDocument = mongoose.model('PatientDocument', patientDocumentSchema);
export default PatientDocument;
