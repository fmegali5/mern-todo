const express = require('express');
const Todo = require('../models/Todo');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const Notification = require('../models/Notification');
const nodemailer = require('nodemailer');

// ======================
// إعداد Multer لرفع الملفات
// ======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ✅ Helper Function لبث التحديثات لليوزر المحدد
const emitToUser = (req, eventName, data) => {
  const io = req.app.get('io');
  if (io && req.user && req.user.id) {
    io.to(req.user.id).emit(eventName, data);
    console.log(`📤 Emitted ${eventName} to user ${req.user.id}`);
  }
};

// ======================
// GET جميع المهام الخاصة بالمستخدم
// ======================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { includeArchived } = req.query;
    
    const filter = { userId: req.user.id };
    if (includeArchived !== 'true') {
      filter.archived = false;
    }

    const todos = await Todo.find(filter).sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    console.error('Error fetching todos:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// GET المهام المشتركة معي
// ======================
router.get('/shared', authMiddleware, async (req, res) => {
  try {
    const todos = await Todo.find({ 
      sharedWith: req.user.id, 
      archived: false 
    }).sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    console.error('Error fetching shared todos:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// GET المهام المؤرشفة فقط
// ======================
router.get('/archived', authMiddleware, async (req, res) => {
  try {
    const todos = await Todo.find({ 
      userId: req.user.id, 
      archived: true 
    }).sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    console.error('Error fetching archived todos:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// GET المهام المفضلة فقط
// ======================
router.get('/starred', authMiddleware, async (req, res) => {
  try {
    const todos = await Todo.find({ 
      userId: req.user.id, 
      starred: true,
      archived: false 
    }).sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    console.error('Error fetching starred todos:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// POST إنشاء مهمة جديدة
// ======================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      title, 
      description,
      notes,
      completed, 
      priority, 
      category, 
      dueDate,
      tags,
      starred,
      customFont
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    const todo = new Todo({ 
      title, 
      description: description || '',
      notes: notes || '',
      completed: completed || false,
      priority: priority || 'medium',
      category: category || 'personal',
      dueDate: dueDate || null,
      tags: tags || [],
      starred: starred || false,
      customFont: customFont || 'default',
      userId: req.user.id
    });
    await todo.save();

    // ✅ بث التحديث لليوزر الحالي فقط
    emitToUser(req, 'todoUpdated', todo);

    res.status(201).json(todo);
  } catch (err) {
    console.error('Error creating todo:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// PUT تحديث مهمة
// ======================
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    // ✅ بث التحديث لليوزر
    emitToUser(req, 'todoUpdated', todo);

    res.json(todo);
  } catch (err) {
    console.error('Error updating todo:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// PATCH تبديل حالة Star/Favorite
// ======================
router.patch('/:id/star', authMiddleware, async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    todo.starred = !todo.starred;
    await todo.save();

    // ✅ بث التحديث لليوزر
    emitToUser(req, 'todoUpdated', todo);

    res.json(todo);
  } catch (err) {
    console.error('Error toggling star:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// PATCH تبديل حالة Archive
// ======================
router.patch('/:id/archive', authMiddleware, async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    todo.archived = !todo.archived;
    await todo.save();

    // ✅ بث التحديث لليوزر
    emitToUser(req, 'todoUpdated', todo);

    res.json(todo);
  } catch (err) {
    console.error('Error toggling archive:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// POST رفع ملف لمهمة
// ======================
router.post('/:id/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    todo.attachments.push({
      filename: req.file.originalname,
      url: `/uploads/${req.file.filename}`
    });
    await todo.save();

    // ✅ بث التحديث لليوزر
    emitToUser(req, 'todoUpdated', todo);

    res.json(todo);
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// DELETE حذف ملف من مهمة
// ======================
router.delete('/:id/attachment/:attachmentId', authMiddleware, async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    todo.attachments = todo.attachments.filter(
      att => att._id.toString() !== req.params.attachmentId
    );
    await todo.save();

    // ✅ بث التحديث لليوزر
    emitToUser(req, 'todoUpdated', todo);

    res.json(todo);
  } catch (err) {
    console.error('Error deleting attachment:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// POST مشاركة مهمة مع مستخدم آخر
// ======================
router.post('/:id/share', authMiddleware, async (req, res) => {
  try {
    const { userEmail } = req.body;
    const User = require('../models/User');

    const userToShare = await User.findOne({ email: userEmail });
    if (!userToShare) {
      return res.status(404).json({ error: 'User not found' });
    }

    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    if (!todo.sharedWith.includes(userToShare._id)) {
      todo.sharedWith.push(userToShare._id);
      await todo.save();

      // إنشاء إشعار
      const note = await Notification.create({
        user: userToShare._id,
        title: `قام ${req.user.name || req.user.email} بمشاركة المهمة "${todo.title}" معك`,
        todo: todo._id,
        read: false,
        type: 'shared'
      });

      // ✅ بث الإشعار للمستخدم المشارك معه
      
const io = req.app.get('io');
if (io) {
  // أضف اسم المرسل داخل الإشعار عشان الواجهة تعرضه
  note.senderName = req.user?.name || req.user?.email || 'مستخدم';
  io.to(userToShare._id.toString()).emit('newNotification', note);
  console.log(`📤 Sent notification from ${note.senderName} to user ${userToShare._id}`);
}

      

      // ✅ بث تحديث للمستخدم الحالي
      emitToUser(req, 'todoUpdated', todo);

      // إرسال بريد إلكتروني (اختياري)
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          });
          await transporter.sendMail({
            to: userToShare.email,
            from: process.env.SMTP_USER,
            subject: 'تمت مشاركة مهمة معك - MERN Todo',
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                  <h2 style="color: #10b981;">مهمة جديدة تمت مشاركتها معك 📋</h2>
                  <p>مرحباً <strong>${userToShare.name || userToShare.email}</strong>,</p>
                  <p>قام <strong>${req.user.name || req.user.email}</strong> بمشاركة المهمة التالية معك:</p>
                  <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0;">
                    <h3 style="margin: 0; color: #1f2937;">${todo.title}</h3>
                    ${todo.notes ? `<p style="color: #6b7280; margin-top: 10px;">${todo.notes}</p>` : ''}
                  </div>
                  <p>سجل دخولك إلى تطبيق MERN Todo للاطلاع على التفاصيل الكاملة.</p>
                  <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">هذا بريد إلكتروني تلقائي، يرجى عدم الرد عليه.</p>
                </div>
              </div>
            `
          });
          console.log('✅ Email sent successfully');
        } catch (emailErr) {
          console.error('❌ Email error:', emailErr.message);
        }
      }
    }
    
    res.json(todo);
  } catch (err) {
    console.error('Error sharing task:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// DELETE حذف مهمة
// ======================
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { permanent } = req.query;

    if (permanent === 'true') {
      const todo = await Todo.findOneAndDelete({ 
        _id: req.params.id, 
        userId: req.user.id 
      });
      if (!todo) return res.status(404).json({ error: 'Todo not found' });

      // ✅ بث حذف المهمة
      emitToUser(req, 'todoDeleted', todo._id);

      res.json({ message: 'Todo permanently deleted' });
    } else {
      const todo = await Todo.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { archived: true },
        { new: true }
      );
      if (!todo) return res.status(404).json({ error: 'Todo not found' });

      // ✅ بث التحديث لليوزر
      emitToUser(req, 'todoUpdated', todo);

      res.json({ message: 'Todo archived', todo });
    }
  } catch (err) {
    console.error('Error deleting todo:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;