import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, unique: true },
    patientId: { type: String, required: true },
    patientName: { type: String },
    hospitalName: { type: String },
    doctorName: { type: String },
    department: { type: String },
    datetime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Confirmed', 'Pending', 'Cancelled', 'Completed'],
      default: 'Pending',
    },
    queueToken: { type: String },
    referralId: { type: String },
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
