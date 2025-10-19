const mongoose = require('mongoose');
const { Schema } = mongoose;

// ======================
// تعريف مخطط (Schema) المستخدم - محدث مع Avatar
// ======================
const userSchema = new Schema(
  {
    // اسم المستخدم: مطلوب، إزالة الفراغات من البداية والنهاية، الحد الأدنى 2 حرف
    name: { type: String, required: true, trim: true, minlength: 2 },
    // البريد الإلكتروني: مطلوب، فريد، تحويله لحروف صغيرة، إزالة الفراغات
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // كلمة المرور: مطلوبة، الحد الأدنى 6 أحرف
    password: { type: String, required: true, minlength: 6 },
    // صورة الملف الشخصي (Avatar): اختياري، يخزن مسار الصورة
    avatar: {
      type: String,
      default: '' // إذا لم يرفع المستخدم صورة، سيكون فارغ
    }
  },
  {
    timestamps: true // يضيف createdAt و updatedAt تلقائياً لكل مستند
  }
);

// تصدير الموديل لاستخدامه في باقي أجزاء التطبيق
module.exports = mongoose.model('User', userSchema);
