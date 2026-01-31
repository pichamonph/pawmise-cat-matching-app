const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // ไม่ต้องใส่ useNewUrlParser และ useUnifiedTopology แล้ว (deprecated ใน MongoDB Driver 4.0+)
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    console.log('📦 Database:', mongoose.connection.name);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('💡 Tip: ตรวจสอบ username, password, และ IP whitelist ใน MongoDB Atlas');
    process.exit(1);
  }
};

module.exports = connectDB;