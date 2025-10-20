const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // للإشعارات العادية
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // للإشعارات المشتركة - 🔥 الجديدة
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  senderName: { 
    type: String, 
    required: true 
  },
  senderEmail: { 
    type: String, 
    required: true 
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  receiverEmail: { 
    type: String, 
    required: true 
  },
  
  // بيانات عامة
  title: { type: String, required: true },
  todo: { type: mongoose.Schema.Types.ObjectId, ref: 'Todo' },
  read: { type: Boolean, default: false },
  type: { type: String, enum: ['shared','reminder','other'], default: 'shared' },
  createdAt: { type: Date, default: Date.now },
  
  // 🔥 حقل جديد علشان نخزن الرسالة كاملة
  message: { type: String }
});

module.exports = mongoose.model('Notification', notificationSchema);
