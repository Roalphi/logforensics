const mongoose = require('mongoose');

async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn('MONGO_URI is not set. Running in mock-data mode.');
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.warn('MongoDB connection failed, switching to mock-data mode:', error.message);
    return false;
  }
}

module.exports = { connectDatabase };
