import mongoose from 'mongoose';

const queueSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    appointmentId: { type: String },
    patientId: { type: String, required: true },
    patientName: { type: String },
    department: { type: String },
    roomNumber: { type: String },
    assignedDoctor: { type: String },
    estimatedTime: { type: Date },
    durationMinutes: { type: Number, default: 10 },
    orderIndex: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Scheduled', 'Waiting', 'In Progress', 'Completed', 'No Show', 'Cancelled'],
      default: 'Scheduled',
    },
    urgency: {
      type: String,
      enum: ['Emergency', 'High', 'Medium', 'Low', 'Routine'],
      default: 'Routine',
    },
    requiredDocuments: [{ type: String }],
  },
  { timestamps: true }
);

const Queue = mongoose.model('Queue', queueSchema);
export default Queue;
