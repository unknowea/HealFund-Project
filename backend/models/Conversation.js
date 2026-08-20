import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  sender: { type: String, required: true }, // 'patient' | 'admin'
  senderName: { type: String },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema(
  {
    conversationId: { type: String, unique: true },
    patientId: { type: String, required: true },
    patientName: { type: String },
    messages: [chatMessageSchema],
    lastMessage: { type: String, default: '' },
    lastMessageTime: { type: Date, default: Date.now },
    unreadByAdmin: { type: Number, default: 0 },
    unreadByPatient: { type: Number, default: 0 },
  },
  { timestamps: true }
);

conversationSchema.pre('save', async function (next) {
  if (!this.conversationId) {
    this.conversationId = `CONV-${this.patientId}-ADMIN`;
  }
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
