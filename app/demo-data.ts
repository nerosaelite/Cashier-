import type { SuiteData } from "./suite-types";

const today = new Date().toISOString().slice(0, 10);
const now = new Date().toISOString();

export const demoData: SuiteData = {
  organization: {
    id: 1,
    name: "Nerosa Elite",
    phone: "0750 000 0000",
    address: "أربيل – شارع التربية",
    tax_number: null,
    logo_url: null,
    default_currency: "IQD",
    exchange_rate: 1310,
    invoice_size: "80mm",
    invoice_header: "عطور وحقائب مختارة بعناية",
    invoice_footer: "شكراً لزيارتكم نيروزا إيليت",
    theme_color: "#d94f82",
    scale_prefix: "21",
    scale_product_digits: 5,
    scale_weight_digits: 5,
    scale_weight_decimals: 3,
  },
  profile: {
    user_id: "demo-owner",
    organization_id: 1,
    full_name: "مدير النظام",
    email: "owner@nerosa.local",
    role: "owner",
    is_active: true,
  },
  profiles: [
    { user_id: "demo-owner", organization_id: 1, full_name: "مدير النظام", email: "owner@nerosa.local", role: "owner", is_active: true },
    { user_id: "demo-cashier", organization_id: 1, full_name: "كاشير الفرع", email: "cashier@nerosa.local", role: "cashier", is_active: true },
  ],
  products: [
    { id: 1, organization_id: 1, name: "بينك دايموند", sku: "PER-001", barcode: "6291108734567", category: "عطور", unit: "قطعة", cost: 18000, retail_price: 25000, wholesale_price: 22000, currency: "IQD", stock: 9, min_stock: 3, track_weight: false, scale_product_code: null, is_active: true },
    { id: 2, organization_id: 1, name: "بلو دايموند", sku: "PER-002", barcode: "6291108734574", category: "عطور", unit: "قطعة", cost: 18000, retail_price: 25000, wholesale_price: 22000, currency: "IQD", stock: 6, min_stock: 3, track_weight: false, scale_product_code: null, is_active: true },
    { id: 3, organization_id: 1, name: "مسك الشمس", sku: "MUS-001", barcode: "6291108734581", category: "مسك", unit: "قطعة", cost: 12000, retail_price: 18000, wholesale_price: 16000, currency: "IQD", stock: 2, min_stock: 3, track_weight: false, scale_product_code: null, is_active: true },
    { id: 4, organization_id: 1, name: "حقيبة كلاسيك", sku: "BAG-001", barcode: "6291108734598", category: "حقائب", unit: "قطعة", cost: 28000, retail_price: 45000, wholesale_price: 40000, currency: "IQD", stock: 5, min_stock: 2, track_weight: false, scale_product_code: null, is_active: true },
  ],
  customers: [
    { id: 1, organization_id: 1, name: "سارة أحمد", phone: "0750 111 2233", address: "أربيل", opening_balance: 0, credit_limit: 500000, notes: null, balance: 50000 },
    { id: 2, organization_id: 1, name: "محمد كريم", phone: "0751 444 5566", address: "عنكاوا", opening_balance: 0, credit_limit: 1000000, notes: "عميل جملة", balance: 0 },
  ],
  suppliers: [
    { id: 1, organization_id: 1, name: "مورد دبي", phone: "+971 50 000 0000", address: "دبي", opening_balance: 0, notes: null },
  ],
  employees: [
    { id: 1, organization_id: 1, name: "آرام خالد", phone: "0750 222 3344", position: "كاشير", hire_date: today, salary: 650000, currency: "IQD", is_active: true, notes: null },
    { id: 2, organization_id: 1, name: "روناك علي", phone: "0751 333 4455", position: "مبيعات", hire_date: today, salary: 600000, currency: "IQD", is_active: true, notes: null },
  ],
  attendance: [
    { id: 1, organization_id: 1, employee_id: 1, work_date: today, check_in: now, check_out: null, status: "present", notes: null },
  ],
  payroll: [],
  sales: [
    { id: 1, organization_id: 1, customer_id: 1, invoice_number: "NER-S-DEMO-001", sale_type: "installment", currency: "IQD", subtotal: 75000, discount: 0, total: 75000, paid: 25000, due: 50000, status: "completed", sold_at: now },
  ],
  purchases: [],
  installments: [
    { id: 1, organization_id: 1, sale_id: 1, customer_id: 1, installment_number: 1, due_date: today, amount: 25000, paid_amount: 0, paid_at: null, status: "pending", notes: null },
    { id: 2, organization_id: 1, sale_id: 1, customer_id: 1, installment_number: 2, due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), amount: 25000, paid_amount: 0, paid_at: null, status: "pending", notes: null },
  ],
  expenses: [
    { id: 1, organization_id: 1, category: "إيجار", amount: 500000, currency: "IQD", exchange_rate: 1, occurred_on: today, notes: "إيجار المحل" },
  ],
  vouchers: [],
};

