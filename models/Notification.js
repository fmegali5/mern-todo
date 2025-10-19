const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  todo: { type: mongoose.Schema.Types.ObjectId, ref: 'Todo' },
  read: { type: Boolean, default: false },
  type: { type: String, enum: ['shared','reminder','other'], default: 'shared' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
