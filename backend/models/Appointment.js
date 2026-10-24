import mongoose from 'mongoose';

const supportingFileSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    size: { type: String },
    type: { type: String },
    uploadDate: { type: Date, default: Date.now },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, unique: true },
    patientId: { type: String, required: true },
    bookedByUserId: { type: String },
    isForSelf: { type: Boolean, default: true },
    patientName: { type: String },
    patientAge: { type: Number },
    patientGender: { type: String },
    relationship: { type: String, default: 'Self' },
    urgency: {
      type: String,
      enum: ['Routine', 'Low', 'Medium', 'High', 'Emergency'],
      default: 'Medium',
    },
    disease: { type: String },
    preferredDepartment: { type: String },
    patientPhone: { type: String },
    hospitalName: { type: String, default: 'Zewditu Memorial Hospital' },
    assignedDoctor: { type: String },
    assignedDepartment: { type: String },
    assignedRoom: { type: String },
    datetime: { type: Date },
    estimatedTime: { type: Date },
    status: {
      type: String,
      enum: ['Pending Review', 'Approved', 'Confirmed', 'Additional Documents Required', 'Rejected', 'Cancelled', 'Completed'],
      default: 'Pending Review',
    },
    queueToken: { type: String },
    supportingFiles: { type: [supportingFileSchema], default: [] },
    requestedDocuments: [{ type: String }],
    adminNote: { type: String },
    rejectionReason: { type: String },
    reviewedAt: { type: Date },
    requestedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

appointmentSchema.pre('save', async function (next) {
  if (!this.appointmentId) {
    const count = await mongoose.model('Appointment').countDocuments();
    this.appointmentId = `APT-${1000 + count + 1}`;
  }
  next();
});

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
