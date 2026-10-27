import mongoose from 'mongoose';

const adminActivityLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: String, required: true, index: true },
    actorEmail: { type: String, required: true, maxlength: 254 },
    actorRole: { type: String, enum: ['admin', 'hospital_officer'], required: true },
    action: { type: String, required: true, maxlength: 120 },
    entityType: { type: String, required: true, maxlength: 60 },
    entityId: { type: String, maxlength: 120 },
    method: { type: String, required: true, maxlength: 10 },
    statusCode: { type: Number, required: true },
  },
  { timestamps: true }
);

adminActivityLogSchema.index({ createdAt: -1 });

const AdminActivityLog = mongoose.model('AdminActivityLog', adminActivityLogSchema);
export default AdminActivityLog;
