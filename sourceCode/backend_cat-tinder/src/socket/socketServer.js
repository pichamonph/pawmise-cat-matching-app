const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Match = require('../models/Match');

let io;

// เก็บ mapping ระหว่าง userId กับ socketId
const userSocketMap = new Map();

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: "*", // ในโปรดักชันควรระบุ domain ที่ชัดเจน
      methods: ["GET", "POST"]
    },
    pingTimeout: 60000, // 60 วินาที
    pingInterval: 25000 // 25 วินาที
  });

  // Middleware สำหรับ authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id; // ใช้ 'id' ตาม JWT payload ของเรา

      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId}`);

    // เก็บ mapping ระหว่าง userId และ socketId
    userSocketMap.set(socket.userId, socket.id);

    // ส่งสถานะ online ให้ผู้ใช้คนอื่น
    socket.broadcast.emit('user:online', { userId: socket.userId });

    // Join match room
    socket.on('match:join', async (matchId) => {
      try {
        // ตรวจสอบว่าผู้ใช้เป็นสมาชิกของ match นี้หรือไม่
        const match = await Match.findOne({
          _id: matchId,
          $or: [
            { ownerAId: socket.userId },
            { ownerBId: socket.userId }
          ]
        });

        if (!match) {
          socket.emit('error', { message: 'Unauthorized access to match' });
          return;
        }

        socket.join(matchId);
        console.log(`📥 User ${socket.userId} joined match ${matchId}`);

        // ส่งสถานะว่า join สำเร็จ
        socket.emit('match:joined', { matchId });
      } catch (error) {
        console.error('Error joining match:', error);
        socket.emit('error', { message: 'Failed to join match' });
      }
    });

    // ออกจาก match room
    socket.on('match:leave', (matchId) => {
      socket.leave(matchId);
      console.log(`📤 User ${socket.userId} left match ${matchId}`);
    });

    // ส่งข้อความ
    socket.on('message:send', async (data) => {
      try {
        const { matchId, text } = data;

        if (!text || !text.trim()) {
          socket.emit('error', { message: 'Message text is required' });
          return;
        }

        // ตรวจสอบว่าผู้ใช้เป็นสมาชิกของ match นี้หรือไม่
        const match = await Match.findOne({
          _id: matchId,
          $or: [
            { ownerAId: socket.userId },
            { ownerBId: socket.userId }
          ]
        });

        if (!match) {
          socket.emit('error', { message: 'Unauthorized access to match' });
          return;
        }

        // สร้างข้อความใหม่
        const message = await Message.create({
          matchId,
          senderOwnerId: socket.userId,
          text: text.trim()
        });

        // Populate sender information
        await message.populate('senderOwnerId', 'displayName avatarUrl');

        // อัพเดท lastMessageAt ของ match
        await Match.findByIdAndUpdate(matchId, {
          lastMessageAt: message.sentAt
        });

        // ส่งข้อความไปยังทุกคนใน room (รวมตัวเอง)
        io.to(matchId).emit('message:received', {
          message: message.toObject(),
          matchId
        });

        // หาผู้รับข้อความ (คนที่ไม่ใช่ตัวส่ง)
        const recipientId = match.ownerAId.toString() === socket.userId
          ? match.ownerBId.toString()
          : match.ownerAId.toString();

        // ส่งการแจ้งเตือนถ้าผู้รับออนไลน์อยู่
        const recipientSocketId = userSocketMap.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('notification:new_message', {
            matchId,
            message: message.toObject()
          });
        }

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // กำลังพิมพ์
    socket.on('typing:start', (data) => {
      const { matchId } = data;
      socket.to(matchId).emit('typing:user', {
        userId: socket.userId,
        matchId,
        isTyping: true
      });
    });

    socket.on('typing:stop', (data) => {
      const { matchId } = data;
      socket.to(matchId).emit('typing:user', {
        userId: socket.userId,
        matchId,
        isTyping: false
      });
    });

    // อ่านข้อความ
    socket.on('message:read', async (data) => {
      try {
        const { matchId } = data;

        // อัพเดทสถานะการอ่าน (ข้อความจากคนอื่นที่ยังไม่ได้อ่าน)
        const result = await Message.updateMany(
          {
            matchId,
            senderOwnerId: { $ne: socket.userId },
            read: false
          },
          {
            $set: { read: true }
          }
        );

        // ส่งสถานะการอ่านไปยัง sender
        socket.to(matchId).emit('message:read_update', {
          matchId,
          readBy: socket.userId,
          count: result.modifiedCount
        });

      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Emit new match event (เรียกใช้จาก swipesController เมื่อ match สำเร็จ)
    socket.on('match:notify', (data) => {
      const { matchId, recipientId } = data;
      const recipientSocketId = userSocketMap.get(recipientId);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('match:new', {
          matchId,
          message: 'You have a new match!'
        });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);

      // ลบ mapping
      userSocketMap.delete(socket.userId);

      // ส่งสถานะ offline ให้ผู้ใช้คนอื่น
      socket.broadcast.emit('user:offline', { userId: socket.userId });
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

const getUserSocketId = (userId) => {
  return userSocketMap.get(userId.toString());
};

// Helper function to emit new match event
const emitNewMatch = (matchId, ownerAId, ownerBId) => {
  if (!io) return;

  const ownerASocketId = userSocketMap.get(ownerAId.toString());
  const ownerBSocketId = userSocketMap.get(ownerBId.toString());

  if (ownerASocketId) {
    io.to(ownerASocketId).emit('match:new', { matchId });
  }

  if (ownerBSocketId) {
    io.to(ownerBSocketId).emit('match:new', { matchId });
  }
};

module.exports = {
  initializeSocket,
  getIO,
  getUserSocketId,
  emitNewMatch
};
