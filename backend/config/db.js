import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ MongoDB connection error: Neither MONGO_URI nor MONGODB_URI is defined in environment variables.');
    console.error('👉 If running on Render: Go to your Render Dashboard -> select your Web Service -> "Environment" -> add Key: MONGO_URI with your MongoDB Atlas connection string.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
