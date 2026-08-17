import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema(
  {
    hospitalId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    level: { type: String },
    verified: { type: Boolean, default: false },
    departments: [{ type: String }],
    phone: { type: String },
  },
  { timestamps: true }
);

const Hospital = mongoose.model('Hospital', hospitalSchema);
export default Hospital;
