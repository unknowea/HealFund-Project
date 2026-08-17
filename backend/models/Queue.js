import mongoose from 'mongoose';

const queueSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    patientId: { type: String, required: true },
    patientName: { type: String },
    department: { type: String },
    assignedDoctor: { type: String },
    estimatedTime: { type: Date },
    status: {
      type: String,
      enum: ['Scheduled', 'Waiting', 'In Progress', 'Completed', 'No Show'],
      default: 'Scheduled',
    },
    urgency: {
      type: String,
      enum: ['High', 'Medium', 'Low', 'Routine'],
      default: 'Routine',
    },
    requiredDocuments: [{ type: String }],
  },
  { timestamps: true }
);

const Queue = mongoose.model('Queue', queueSchema);
export default Queue;
