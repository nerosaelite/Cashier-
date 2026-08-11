"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { demoData } from "./demo-data";
import type {
  Attendance,
  CartLine,
  Customer,
  Employee,
  Expense,
  Installment,
  Payroll,
  Product,
  Profile,
  Purchase,
  Sale,
  SuiteData,
  Supplier,
  Voucher,
} from "./suite-types";

type ListKey = "products" | "customers" | "suppliers" | "employees" | "attendance" | "payroll" | "expenses" | "vouchers";
type RecordFor<K extends ListKey> = K extends "products" ? Product
  : K extends "customers" ? Customer
  : K extends "suppliers" ? Supplier
  : K extends "employees" ? Employee
  : K extends "attendance" ? Attendance
  : K extends "payroll" ? Payroll
  : K extends "expenses" ? Expense
  : Voucher;

type SaleInput = {
  customerId: number | null;
  saleType: "retail" | "wholesale" | "credit" | "installment";
  currency: "IQD" | "USD";
  discount: number;
  paid: number;
  installmentCount: number;
  firstDue: string | null;
  notes: string;
  cart: CartLine[];
};

type PurchaseInput = {
  supplierId: number | null;
  supplierInvoice: string;
  currency: "IQD" | "USD";
  discount: number;
  paid: number;
  notes: string;
  cart: Array<Product & { quantity: number; unitCost: number }>;
};

const demoStorageKey = "nerosa-business-suite-demo-v1";
const tableMap: Record<ListKey, string> = {
  products: "pos_products",
  customers: "pos_customers",
  suppliers: "pos_suppliers",
  employees: "pos_employees",
  attendance: "pos_attendance",
  payroll: "pos_payroll",
  expenses: "pos_expenses",
  vouchers: "pos_vouchers",
};

function nextId(rows: Array<{ id: number }>) {
  return rows.reduce((maximum, item) => Math.max(maximum, Number(item.id) || 0), 0) + 1;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cloneDemo(): SuiteData {
  return JSON.parse(JSON.stringify(demoData)) as SuiteData;
}

export function useSuiteStore(supabaseUrl?: string, supabaseKey?: string) {
  const isDemo = !supabaseUrl || !supabaseKey;
  const client = useMemo<SupabaseClient | null>(
    () => (isDemo ? null : createClient(supabaseUrl, supabaseKey)),
    [isDemo, supabaseKey, supabaseUrl],
  );
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<SuiteData>(() => cloneDemo());
  const [loading, setLoading] = useState(!isDemo);
  const [ready, setReady] = useState(isDemo);
  const [error, setError] = useState("");

  const persistDemo = useCallback((next: SuiteData) => {
    setData(next);
    if (typeof window !== "undefined") localStorage.setItem(demoStorageKey, JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (!isDemo || typeof window === "undefined") return;
    const saved = localStorage.getItem(demoStorageKey);
    if (!saved) return;
    let timer: number | undefined;
    try {
      const restored = JSON.parse(saved) as SuiteData;
      timer = window.setTimeout(() => setData(restored), 0);
    } catch {
      localStorage.removeItem(demoStorageKey);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [isDemo]);

  const loadRemoteData = useCallback(async (activeSession: Session) => {
    if (!client) return;
    setLoading(true);
    setError("");
    try {
      const profileResponse = await client
        .from("pos_profiles")
        .select("*")
        .eq("user_id", activeSession.user.id)
        .maybeSingle();
      let profileRow = profileResponse.data;
      const profileError = profileResponse.error;
      if (profileError) throw profileError;

      if (!profileRow) {
        const companyName = String(activeSession.user.user_metadata?.company_name || "Nerosa Elite");
        const { error: bootstrapError } = await client.rpc("pos_bootstrap_owner", { company_name: companyName });
        if (bootstrapError) throw bootstrapError;
        const retry = await client.from("pos_profiles").select("*").eq("user_id", activeSession.user.id).single();
        if (retry.error) throw retry.error;
        profileRow = retry.data;
      }
      if (!profileRow?.is_active) throw new Error("هذا المستخدم غير فعال. راجع مدير النظام.");
      const orgId = Number(profileRow.organization_id);

      const [
        organizationResult,
        profilesResult,
        productsResult,
        customersResult,
        balancesResult,
        suppliersResult,
        employeesResult,
        attendanceResult,
        payrollResult,
        salesResult,
        purchasesResult,
        installmentsResult,
        expensesResult,
        vouchersResult,
      ] = await Promise.all([
        client.from("pos_organizations").select("*").eq("id", orgId).single(),
        client.from("pos_profiles").select("*").eq("organization_id", orgId).order("created_at"),
        client.from("pos_products").select("*").eq("organization_id", orgId).order("name"),
        client.from("pos_customers").select("*").eq("organization_id", orgId).order("name"),
        client.from("pos_customer_balances").select("*").eq("organization_id", orgId),
        client.from("pos_suppliers").select("*").eq("organization_id", orgId).order("name"),
        client.from("pos_employees").select("*").eq("organization_id", orgId).order("name"),
        client.from("pos_attendance").select("*").eq("organization_id", orgId).order("work_date", { ascending: false }).limit(500),
        client.from("pos_payroll").select("*").eq("organization_id", orgId).order("payroll_month", { ascending: false }).limit(500),
        client.from("pos_sales").select("*").eq("organization_id", orgId).order("sold_at", { ascending: false }).limit(1000),
        client.from("pos_purchases").select("*").eq("organization_id", orgId).order("purchased_at", { ascending: false }).limit(1000),
        client.from("pos_installments").select("*").eq("organization_id", orgId).order("due_date").limit(1000),
        client.from("pos_expenses").select("*").eq("organization_id", orgId).order("occurred_on", { ascending: false }).limit(1000),
        client.from("pos_vouchers").select("*").eq("organization_id", orgId).order("voucher_date", { ascending: false }).limit(1000),
      ]);
      const firstError = [organizationResult, profilesResult, productsResult, customersResult, suppliersResult, employeesResult, attendanceResult, payrollResult, salesResult, purchasesResult, installmentsResult, expensesResult, vouchersResult]
        .find((result) => result.error)?.error;
      if (firstError) throw firstError;

      const balances = new Map<number, number>(
        ((balancesResult.data || []) as Array<{ customer_id: number; balance: number }>).map((row) => [Number(row.customer_id), Number(row.balance)]),
      );
      const customers = ((customersResult.data || []) as Customer[]).map((customer) => ({
        ...customer,
        opening_balance: Number(customer.opening_balance),
        credit_limit: Number(customer.credit_limit),
        balance: balances.get(Number(customer.id)) ?? Number(customer.opening_balance),
      }));

      setData({
        organization: organizationResult.data as SuiteData["organization"],
        profile: profileRow as Profile,
        profiles: (profilesResult.data || []) as Profile[],
        products: (productsResult.data || []) as Product[],
        customers,
        suppliers: (suppliersResult.data || []) as Supplier[],
        employees: (employeesResult.data || []) as Employee[],
        attendance: (attendanceResult.data || []) as Attendance[],
        payroll: (payrollResult.data || []) as Payroll[],
        sales: (salesResult.data || []) as Sale[],
        purchases: (purchasesResult.data || []) as Purchase[],
        installments: (installmentsResult.data || []) as Installment[],
        expenses: (expensesResult.data || []) as Expense[],
        vouchers: (vouchersResult.data || []) as Voucher[],
      });
      setReady(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!client) return;
    let mounted = true;
    void client.auth.getSession().then(({ data: authData }) => {
      if (!mounted) return;
      setSession(authData.session);
      if (authData.session) void loadRemoteData(authData.session);
      else setLoading(false);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (nextSession) void loadRemoteData(nextSession);
      else setReady(false);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [client, loadRemoteData]);

  async function signIn(email: string, password: string) {
    if (!client) return;
    const { error: authError } = await client.auth.signInWithPassword({ email, password });
    if (authError) throw authError;
  }

  async function signUp(companyName: string, fullName: string, email: string, password: string) {
    if (!client) return { needsConfirmation: false };
    const { data: authData, error: authError } = await client.auth.signUp({
      email,
      password,
      options: { data: { company_name: companyName, full_name: fullName } },
    });
    if (authError) throw authError;
    if (authData.session) await loadRemoteData(authData.session);
    return { needsConfirmation: !authData.session };
  }

  async function signOut() {
    if (client) await client.auth.signOut();
  }

  async function addRecord<K extends ListKey>(key: K, payload: Omit<RecordFor<K>, "id" | "organization_id">) {
    if (isDemo) {
      const rows = data[key] as unknown as Array<RecordFor<K> & { id: number; organization_id: number }>;
      const record = { ...payload, id: nextId(rows), organization_id: data.organization.id } as RecordFor<K>;
      const next = { ...data, [key]: [...rows, record] } as SuiteData;
      persistDemo(next);
      return record;
    }
    if (!client) throw new Error("Supabase غير مربوط");
    const { data: inserted, error: insertError } = await client
      .from(tableMap[key])
      .insert({ ...payload, organization_id: data.organization.id })
      .select()
      .single();
    if (insertError) throw insertError;
    await loadRemoteData(session!);
    return inserted as RecordFor<K>;
  }

  async function updateRecord<K extends ListKey>(key: K, id: number, payload: Partial<RecordFor<K>>) {
    if (isDemo) {
      const rows = data[key] as unknown as Array<RecordFor<K> & { id: number }>;
      persistDemo({ ...data, [key]: rows.map((row) => row.id === id ? { ...row, ...payload } : row) } as SuiteData);
      return;
    }
    if (!client) throw new Error("Supabase غير مربوط");
    const { error: updateError } = await client.from(tableMap[key]).update(payload as never).eq("id", id);
    if (updateError) throw updateError;
    await loadRemoteData(session!);
  }

  async function saveOrganization(payload: Partial<SuiteData["organization"]>) {
    if (isDemo) {
      persistDemo({ ...data, organization: { ...data.organization, ...payload } });
      return;
    }
    if (!client) throw new Error("Supabase غير مربوط");
    const { error: updateError } = await client.from("pos_organizations").update(payload).eq("id", data.organization.id);
    if (updateError) throw updateError;
    await loadRemoteData(session!);
  }

  async function createSale(input: SaleInput) {
    const subtotal = input.cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const total = Math.max(subtotal - input.discount, 0);
    const paid = Math.min(Math.max(input.paid, 0), total);
    if (isDemo) {
      const id = nextId(data.sales);
      const invoiceNumber = `NER-S-${today().replaceAll("-", "")}-${String(id).padStart(6, "0")}`;
      const sale: Sale = { id, organization_id: 1, customer_id: input.customerId, invoice_number: invoiceNumber, sale_type: input.saleType, currency: input.currency, subtotal, discount: input.discount, total, paid, due: total - paid, status: "completed", sold_at: new Date().toISOString() };
      const products = data.products.map((product) => {
        const line = input.cart.find((cartLine) => cartLine.id === product.id);
        return line ? { ...product, stock: Number(product.stock) - line.quantity } : product;
      });
      const installments = [...data.installments];
      if (input.saleType === "installment" && input.customerId && total > paid && input.installmentCount > 0) {
        const amount = (total - paid) / input.installmentCount;
        for (let index = 0; index < input.installmentCount; index += 1) {
          const dueDate = new Date(input.firstDue || Date.now() + 30 * 86400000);
          dueDate.setMonth(dueDate.getMonth() + index);
          installments.push({ id: nextId(installments), organization_id: 1, sale_id: id, customer_id: input.customerId, installment_number: index + 1, due_date: dueDate.toISOString().slice(0, 10), amount, paid_amount: 0, paid_at: null, status: "pending", notes: null });
        }
      }
      persistDemo({ ...data, products, installments, sales: [sale, ...data.sales] });
      return { id, invoice_number: invoiceNumber, total, paid, due: total - paid };
    }
    if (!client) throw new Error("Supabase غير مربوط");
    const { data: result, error: rpcError } = await client.rpc("pos_create_sale", {
      p_customer_id: input.customerId,
      p_sale_type: input.saleType,
      p_currency: input.currency,
      p_discount: input.discount,
      p_paid: input.paid,
      p_items: input.cart.map((line) => ({ product_id: line.id, quantity: line.quantity, unit_price: line.unitPrice })),
      p_installment_count: input.installmentCount,
      p_first_due: input.firstDue,
      p_notes: input.notes || null,
    });
    if (rpcError) throw rpcError;
    await loadRemoteData(session!);
    return result as { id: number; invoice_number: string; total: number; paid: number; due: number };
  }

  async function createPurchase(input: PurchaseInput) {
    const subtotal = input.cart.reduce((sum, line) => sum + line.unitCost * line.quantity, 0);
    const total = Math.max(subtotal - input.discount, 0);
    const paid = Math.min(Math.max(input.paid, 0), total);
    if (isDemo) {
      const id = nextId(data.purchases);
      const invoiceNumber = `NER-P-${today().replaceAll("-", "")}-${String(id).padStart(6, "0")}`;
      const purchase: Purchase = { id, organization_id: 1, supplier_id: input.supplierId, invoice_number: invoiceNumber, supplier_invoice: input.supplierInvoice, currency: input.currency, subtotal, discount: input.discount, total, paid, due: total - paid, status: "completed", purchased_at: new Date().toISOString() };
      const products = data.products.map((product) => {
        const line = input.cart.find((cartLine) => cartLine.id === product.id);
        return line ? { ...product, stock: Number(product.stock) + line.quantity, cost: line.unitCost } : product;
      });
      persistDemo({ ...data, products, purchases: [purchase, ...data.purchases] });
      return purchase;
    }
    if (!client) throw new Error("Supabase غير مربوط");
    const { data: result, error: rpcError } = await client.rpc("pos_create_purchase", {
      p_supplier_id: input.supplierId,
      p_supplier_invoice: input.supplierInvoice || null,
      p_currency: input.currency,
      p_discount: input.discount,
      p_paid: input.paid,
      p_items: input.cart.map((line) => ({ product_id: line.id, quantity: line.quantity, unit_cost: line.unitCost })),
      p_notes: input.notes || null,
    });
    if (rpcError) throw rpcError;
    await loadRemoteData(session!);
    return result;
  }

  async function payInstallment(id: number, amount: number, notes = "") {
    if (isDemo) {
      const installments = data.installments.map((item) => item.id === id ? {
        ...item,
        paid_amount: Math.min(item.amount, Number(item.paid_amount) + amount),
        paid_at: Number(item.paid_amount) + amount >= item.amount ? new Date().toISOString() : item.paid_at,
        status: (Number(item.paid_amount) + amount >= item.amount ? "paid" : "partial") as Installment["status"],
      } : item);
      persistDemo({ ...data, installments });
      return;
    }
    if (!client) throw new Error("Supabase غير مربوط");
    const { error: rpcError } = await client.rpc("pos_pay_installment", { p_installment_id: id, p_amount: amount, p_notes: notes || null });
    if (rpcError) throw rpcError;
    await loadRemoteData(session!);
  }

  async function manageUsers(payload: Record<string, unknown>) {
    if (isDemo) {
      if (payload.action === "create") {
        const profile: Profile = { user_id: `demo-${Date.now()}`, organization_id: 1, full_name: String(payload.full_name), email: String(payload.email), role: String(payload.role) as Profile["role"], is_active: true };
        persistDemo({ ...data, profiles: [...data.profiles, profile] });
      }
      if (payload.action === "set_active") {
        persistDemo({ ...data, profiles: data.profiles.map((profile) => profile.user_id === payload.user_id ? { ...profile, is_active: Boolean(payload.is_active) } : profile) });
      }
      return;
    }
    if (!client) throw new Error("Supabase غير مربوط");
    const { data: result, error: functionError } = await client.functions.invoke("pos-admin-users", { body: payload });
    if (functionError) throw functionError;
    if (result?.error) throw new Error(result.error);
    await loadRemoteData(session!);
  }

  async function resetSystem(confirmText: string) {
    if (isDemo) {
      if (confirmText !== "تصفير") throw new Error("اكتب كلمة تصفير للتأكيد");
      const next = cloneDemo();
      next.products = [];
      next.customers = [];
      next.suppliers = [];
      next.employees = [];
      next.attendance = [];
      next.payroll = [];
      next.sales = [];
      next.purchases = [];
      next.installments = [];
      next.expenses = [];
      next.vouchers = [];
      persistDemo(next);
      return;
    }
    if (!client) throw new Error("Supabase غير مربوط");
    const { error: rpcError } = await client.rpc("pos_reset_organization", { confirm_text: confirmText });
    if (rpcError) throw rpcError;
    await loadRemoteData(session!);
  }

  function restoreDemo(backup: SuiteData) {
    if (!isDemo) throw new Error("استيراد النسخ المباشر متاح في الوضع التجريبي. لقاعدة Supabase استخدم النسخ الاحتياطية من لوحة Supabase.");
    persistDemo(backup);
  }

  function resetDemoSample() {
    persistDemo(cloneDemo());
  }

  return {
    isDemo,
    client,
    session,
    data,
    loading,
    ready,
    error,
    reload: () => session ? loadRemoteData(session) : Promise.resolve(),
    signIn,
    signUp,
    signOut,
    addRecord,
    updateRecord,
    saveOrganization,
    createSale,
    createPurchase,
    payInstallment,
    manageUsers,
    resetSystem,
    restoreDemo,
    resetDemoSample,
  };
}
