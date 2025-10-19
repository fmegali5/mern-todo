const jwt = require('jsonwebtoken');

// ======================
// Middleware للتحقق من التوكن (JWT) وحماية المسارات
// ======================
module.exports = function (req, res, next) {
  // استرجاع التوكن من الهيدر Authorization (صيغة: "Bearer <token>")
  const token = req.header('Authorization')?.split(' ')[1];

  // إذا لم يوجد توكن، رفض الوصول
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

  try {
    // التحقق من صحة التوكن وفك التشفير
    const decoded = jwt.verify(token, 'mysecretkey');

    // إضافة بيانات المستخدم إلى الطلب للاستفادة منها في المسار
    req.user = decoded;

    // السماح بالانتقال للـ route التالي
    next();
  } catch (err) {
    // إذا كان التوكن غير صالح
    res.status(401).json({ error: 'Token is not valid' });
  }
};
