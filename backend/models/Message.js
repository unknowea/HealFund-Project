import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    messageId: { type: String, unique: true },
    name: { type: String, required: true },
    contact: { type: String },
    category: {
      type: String,
      enum: [
        'General Inquiry',
        'Medical File Verification',
        'Financial Assistance',
        'Community Agent',
      ],
      default: 'General Inquiry',
    },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['Unread', 'Read', 'Replied'],
      default: 'Unread',
    },
    reply: { type: String },
    repliedAt: { type: Date },
  },
  { timestamps: true }
);

messageSchema.pre('save', async function (next) {
  if (!this.messageId) {
    const count = await mongoose.model('Message').countDocuments();
    this.messageId = `MSG-${1000 + count + 1}`;
  }
  next();
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
