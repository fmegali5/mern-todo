const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();

// 🔥 مارك as read - متعدلة علشان تدعم كل أنواع الإشعارات
router.put('/:id/read', auth, async (req, res) => {
  try {
    console.log('🔄 محاولة تعليم الإشعار كمقروء:', {
      notificationId: req.params.id,
      userId: req.user.id,
      userEmail: req.user.email
    });

    const note = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id,
        $or: [
          { user: req.user.id },           // للإشعارات العادية
          { receiver: req.user.id },       // للإشعارات المشتركة (بالـ ID)
          { receiverEmail: req.user.email } // للإشعارات المشتركة (بالـ email)
        ]
      },
      { 
        read: true, 
        readAt: new Date() 
      },
      { new: true }
    );
    
    if (!note) {
      console.log('❌ الإشعار مش موجود أو مش مسموح للوصول');
      return res.status(404).json({ 
        success: false,
        error: 'Notification not found or access denied' 
      });
    }
    
    console.log('✅ تم تحديث الإشعار:', note._id);
    res.json({ 
      success: true, 
      message: 'تم تعليم الإشعار كمقروء',
      notification: note 
    });
    
  } catch (err) {
    console.error('❌ خطأ في السيرفر:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// 🔥 route جديدة علشان ن create إشعارات مشاركة
router.post('/share', auth, async (req, res) => {
  try {
    const { 
      todoId, 
      receiverEmail, 
      senderName = req.user.name, // 🔥 ناخد الاسم من الـ user
      message 
    } = req.body;

    // 🔥 ن create الإشعار بالبيانات الكاملة
    const notification = new Notification({
      sender: req.user.id,
      senderName: senderName || req.user.name, // 🔥确保有名字
      senderEmail: req.user.email,
      receiverEmail: receiverEmail,
      title: 'مهمة مشاركة',
      todo: todoId,
      type: 'shared',
      message: message || `قام ${senderName || req.user.name} بمشاركة مهمة معك`
    });

    await notification.save();
    
    console.log('✅ تم إنشاء إشعار مشاركة جديد:', notification._id);
    
    res.json({
      success: true,
      message: 'تم إرسال الإشعار بنجاح',
      notification: notification
    });

  } catch (err) {
    console.error('❌ خطأ في إنشاء الإشعار:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

module.exports = router;
