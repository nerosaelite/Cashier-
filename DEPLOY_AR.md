# خطوات نشر برنامج نيروزا

## أولاً: إعداد Supabase

1. ادخل إلى مشروعك في Supabase.
2. من القائمة افتح **SQL Editor** ثم **New query**.
3. افتح ملف `supabase/schema.sql` من المشروع، انسخه كاملاً، ثم اضغط **Run**.
4. من **Authentication → Providers** تأكد أن Email مفعّل.
5. من **Project Settings → API** انسخ:
   - Project URL
   - Publishable key
6. من جهاز كمبيوتر افتح Terminal داخل مجلد المشروع ونفّذ:

```bash
npm install
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy pos-admin-users
```

أول شخص يضغط **إنشاء حساب المالك** داخل البرنامج يصبح مالك الشركة. بعد ذلك ينشئ بقية المستخدمين من صفحة «المستخدمون».

## ثانياً: رفع المشروع إلى GitHub

1. فك ضغط ملف ZIP.
2. أنشئ Repository جديداً في GitHub.
3. ارفع **محتويات المجلد** إلى الـRepository، وليس ملف ZIP نفسه.
4. افتح داخل GitHub:
   **Settings → Secrets and variables → Actions → New repository secret**
5. أضف السرّين التاليين:

| الاسم | القيمة |
| --- | --- |
| `VITE_SUPABASE_URL` | رابط مشروع Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | المفتاح القابل للنشر |

6. افتح **Settings → Pages** واجعل المصدر **GitHub Actions**.
7. ادخل إلى **Actions** وشغّل `Deploy Nerosa to GitHub Pages`، أو ارفع أي تعديل إلى فرع `main`.
8. بعد نجاح النشر يظهر رابط الموقع في صفحة Actions وPages.

## ثالثاً: إعداد أول حساب

1. افتح رابط البرنامج.
2. اضغط **إنشاء حساب المالك**.
3. اكتب اسم الشركة واسمك والبريد وكلمة سر لا تقل عن 8 أحرف.
4. إذا كان تأكيد البريد مفعلاً في Supabase، افتح رسالة التأكيد ثم سجّل الدخول.
5. عدّل بيانات الشركة والفاتورة من صفحة **الإعدادات**.
6. أنشئ حسابات الموظفين من صفحة **المستخدمون**.

## الكاميرا على الآيفون

- افتح الموقع في Safari.
- وافق على إذن الكاميرا.
- إذا رفضته سابقاً: إعدادات iPhone → Safari → Camera → Allow.
- الموقع المنشور يستخدم HTTPS، وهو مطلوب لتشغيل الكاميرا.

## النسخة الاحتياطية

- من الإعدادات اضغط **تنزيل نسخة احتياطية JSON** دورياً.
- Supabase يوفر نسخاً احتياطية إضافية حسب خطة المشروع.
- لا تستخدم «تصفير النظام» إلا بعد تنزيل نسخة احتياطية.

