const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http'); 
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const server = http.createServer(app);

// إنشاء مجلد uploads إذا لم يكن موجوداً
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ✅ إعداد Socket.IO محسّن
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }
});
app.set('io', io);

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(userId);
    console.log(`✅ User ${userId} connected to room`);
  }
});



// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// السماح بالوصول للملفات المرفوعة
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ✅ نخزن الـ io في app عشان نقدر نستخدمه في Routes
app.set('io', io);

// ✅ أحداث Socket.IO
io.on('connection', (socket) => {
  const { userId } = socket.handshake.query;
  
  console.log(`✅ Socket connected: ${socket.id}${userId ? ` | User: ${userId}` : ''}`);

  // ✅ انضمام المستخدم لغرفة خاصة بمعرفه
  if (userId && userId !== 'undefined' && userId !== 'null') {
    socket.join(userId);
    console.log(`🛋️  User ${userId} joined their room`);
    
    // إرسال تأكيد الاتصال
    socket.emit('connected', { 
      message: 'Connected successfully',
      userId: userId 
    });
  } else {
    console.warn('⚠️  Socket connected without userId');
  }

  // ✅ معالجة الأخطاء
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });

  // ✅ عند قطع الاتصال
  socket.on('disconnect', (reason) => {
    console.log(`❌ Socket disconnected: ${socket.id} | Reason: ${reason}`);
  });

  // ✅ حدث اختباري (اختياري - للتطوير فقط)
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
});

// ✅ ربط مسارات الـ API (بعد app.set('io', io))
app.use('/api/auth', require('../routes/auth'));
app.use('/api/todos', require('../routes/todos'));
app.use('/api/notifications', require('../routes/notifications'));

// مسار للتجربة
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    connectedSockets: io.engine.clientsCount
  });
});

// ✅ Route للتحقق من Socket.IO
app.get('/api/socket-status', (req, res) => {
  res.json({
    connected: io.engine.clientsCount,
    rooms: Array.from(io.sockets.adapter.rooms.keys())
  });
});

// ✅ معالجة الأخطاء 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ✅ معالجة الأخطاء العامة
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;

// ✅ الاتصال بـ MongoDB وتشغيل السيرفر
mongoose.connect(MONGO_URI, {
  // خيارات الاتصال (اختيارية - MongoDB 6+ لا تحتاجها)
  // useNewUrlParser: true,
  // useUnifiedTopology: true
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.IO ready for connections`);
      console.log(`🌐 API: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); // إنهاء العملية إذا فشل الاتصال بقاعدة البيانات
  });

// ✅ معالجة إشارات الإيقاف (Graceful Shutdown)
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('⚠️  SIGINT received, closing server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});