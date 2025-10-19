const mongoose = require('mongoose');
const { Schema } = mongoose;

// ======================
// تعريف مخطط (Schema) لمهام (Todo) - محدث بكل الميزات الجديدة
// ======================
const todoSchema = new Schema(
  {
    // عنوان المهمة: مطلوب، إزالة الفراغات من البداية والنهاية
    title: { type: String, required: true, trim: true },

    // وصف المهمة: اختياري، افتراضي نص فارغ
    description: { type: String, default: '' },

    // ملاحظات تفصيلية للمهمة (Notes)
    notes: { type: String, default: '' },

    // حالة المهمة: مكتملة أم لا، افتراضي false
    completed: { type: Boolean, default: false },

    // تاريخ الاستحقاق (Due Date): اختياري
    dueDate: { type: Date },

    // أولوية المهمة: low, medium, high - الافتراضي medium
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },

    // تصنيف المهمة: personal, work, study, other - الافتراضي personal
    category: { type: String, enum: ['personal', 'work', 'study', 'other'], default: 'personal' },

    // وسوم (Tags) مخصصة للمهمة
    tags: { type: [String], default: [] },

    // مهمة مفضلة (Star/Favorite)
    starred: { type: Boolean, default: false },

    // مهمة في الأرشيف
    archived: { type: Boolean, default: false },

    // ملفات مرفقة (File Attachments)
    attachments: [
      {
        filename: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now }
      }
    ],

    // مشاركة المهمة (Shared with users)
    sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // إشعارات (Notifications sent)
    notificationSent: { type: Boolean, default: false },

    // تذكير بالبريد (Email reminder sent)
    emailReminderSent: { type: Boolean, default: false },

    // الخط المخصص (Custom Font)
    customFont: { type: String, default: 'default' },

    // ربط المهمة بالمستخدم: المرجع لموديل User، مطلوب
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { 
    timestamps: true // يضيف createdAt و updatedAt تلقائياً لكل مهمة
  }
);

// تصدير الموديل لاستخدامه في باقي أجزاء التطبيق
module.exports = mongoose.model('Todo', todoSchema);
