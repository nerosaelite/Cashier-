"use client";

import { FormEvent, useState } from "react";

export function AuthScreen({
  loading,
  error,
  onSignIn,
  onSignUp,
}: {
  loading: boolean;
  error: string;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (company: string, name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean } | undefined>;
}) {
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ company: "Nerosa Elite", name: "", email: "", password: "" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "login") {
        await onSignIn(form.email, form.password);
      } else {
        const result = await onSignUp(form.company, form.name, form.email, form.password);
        if (result?.needsConfirmation) setMessage("تم إنشاء الحساب. افتح رسالة التأكيد في بريدك ثم سجّل الدخول.");
      }
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : "تعذر إكمال العملية");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page" dir="rtl">
      <section className="auth-card">
        <div className="auth-brand"><span>ن</span><div><b>NEROSA ELITE</b><strong>نظام إدارة الأعمال</strong></div></div>
        <div className="auth-tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>تسجيل الدخول</button>
          <button className={mode === "setup" ? "active" : ""} onClick={() => setMode("setup")}>إنشاء حساب المالك</button>
        </div>
        <form onSubmit={submit} className="auth-form">
          {mode === "setup" && <>
            <label><span>اسم الشركة</span><input required value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></label>
            <label><span>اسم المالك</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          </>}
          <label><span>البريد الإلكتروني</span><input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label><span>كلمة السر</span><input required minLength={8} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          {(message || error) && <p className="form-message">{message || error}</p>}
          <button className="primary-button" disabled={busy || loading}>{busy || loading ? "جاري التحميل..." : mode === "login" ? "دخول إلى النظام" : "إنشاء الشركة والحساب"}</button>
        </form>
        <p className="auth-note">كل مستخدم يدخل بكلمة سر خاصة به، والصلاحيات يحددها المالك.</p>
      </section>
    </main>
  );
}

