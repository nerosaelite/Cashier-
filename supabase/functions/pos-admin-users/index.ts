import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return response({ error: "يجب تسجيل الدخول" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publishableKey || !serviceRoleKey) return response({ error: "إعدادات الخادم ناقصة" }, 500);

  const callerClient = createClient(url, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return response({ error: "الجلسة غير صالحة" }, 401);

  const { data: caller, error: callerError } = await adminClient
    .from("pos_profiles")
    .select("organization_id, role, is_active")
    .eq("user_id", userData.user.id)
    .single();
  if (callerError || !caller?.is_active || !["owner", "admin"].includes(caller.role)) {
    return response({ error: "ليس لديك صلاحية إدارة المستخدمين" }, 403);
  }

  try {
    const payload = await request.json();
    const action = String(payload.action || "list");

    if (action === "list") {
      const { data, error } = await adminClient
        .from("pos_profiles")
        .select("user_id, full_name, email, role, is_active, created_at")
        .eq("organization_id", caller.organization_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return response({ users: data });
    }

    if (action === "create") {
      const email = String(payload.email || "").trim().toLowerCase();
      const password = String(payload.password || "");
      const fullName = String(payload.full_name || "").trim();
      const role = ["admin", "manager", "cashier", "accountant"].includes(payload.role)
        ? payload.role
        : "cashier";
      if (!email || password.length < 8 || !fullName) {
        return response({ error: "أدخل الاسم والبريد وكلمة سر من 8 أحرف على الأقل" }, 400);
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
        app_metadata: { organization_id: caller.organization_id, pos_role: role },
      });
      if (error || !data.user) throw error || new Error("تعذر إنشاء المستخدم");

      const { error: profileError } = await adminClient.from("pos_profiles").insert({
        user_id: data.user.id,
        organization_id: caller.organization_id,
        full_name: fullName,
        email,
        role,
        is_active: true,
      });
      if (profileError) {
        await adminClient.auth.admin.deleteUser(data.user.id);
        throw profileError;
      }
      return response({ user_id: data.user.id, message: "تم إنشاء المستخدم" }, 201);
    }

    if (action === "set_active") {
      const targetUserId = String(payload.user_id || "");
      const isActive = Boolean(payload.is_active);
      if (!targetUserId || targetUserId === userData.user.id) {
        return response({ error: "لا يمكنك إلغاء حسابك الحالي" }, 400);
      }
      const { error } = await adminClient
        .from("pos_profiles")
        .update({ is_active: isActive })
        .eq("user_id", targetUserId)
        .eq("organization_id", caller.organization_id)
        .neq("role", "owner");
      if (error) throw error;
      return response({ message: isActive ? "تم تفعيل المستخدم" : "تم إلغاء المستخدم" });
    }

    if (action === "reset_password") {
      const targetUserId = String(payload.user_id || "");
      const password = String(payload.password || "");
      if (!targetUserId || password.length < 8) return response({ error: "كلمة السر يجب أن تكون 8 أحرف على الأقل" }, 400);
      const { data: target } = await adminClient
        .from("pos_profiles")
        .select("user_id")
        .eq("user_id", targetUserId)
        .eq("organization_id", caller.organization_id)
        .maybeSingle();
      if (!target) return response({ error: "المستخدم غير موجود" }, 404);
      const { error } = await adminClient.auth.admin.updateUserById(targetUserId, { password });
      if (error) throw error;
      return response({ message: "تم تغيير كلمة السر" });
    }

    return response({ error: "العملية غير معروفة" }, 400);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "حدث خطأ غير متوقع" }, 400);
  }
});

