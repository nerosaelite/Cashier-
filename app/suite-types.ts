export type Role = "owner" | "admin" | "manager" | "cashier" | "accountant";
export type Currency = "IQD" | "USD";

export type Organization = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  tax_number: string | null;
  logo_url: string | null;
  default_currency: Currency;
  exchange_rate: number;
  invoice_size: "80mm" | "A4";
  invoice_header: string | null;
  invoice_footer: string;
  theme_color: string;
  scale_prefix: string;
  scale_product_digits: number;
  scale_weight_digits: number;
  scale_weight_decimals: number;
};

export type Profile = {
  user_id: string;
  organization_id: number;
  full_name: string;
  email: string | null;
  role: Role;
  is_active: boolean;
  created_at?: string;
};

export type Product = {
  id: number;
  organization_id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string;
  unit: string;
  cost: number;
  retail_price: number;
  wholesale_price: number;
  currency: Currency;
  stock: number;
  min_stock: number;
  track_weight: boolean;
  scale_product_code: string | null;
  is_active: boolean;
};

export type Customer = {
  id: number;
  organization_id: number;
  name: string;
  phone: string | null;
  address: string | null;
  opening_balance: number;
  credit_limit: number;
  notes: string | null;
  balance?: number;
};

export type Supplier = {
  id: number;
  organization_id: number;
  name: string;
  phone: string | null;
  address: string | null;
  opening_balance: number;
  notes: string | null;
};

export type Employee = {
  id: number;
  organization_id: number;
  name: string;
  phone: string | null;
  position: string | null;
  hire_date: string;
  salary: number;
  currency: Currency;
  is_active: boolean;
  notes: string | null;
};

export type Attendance = {
  id: number;
  organization_id: number;
  employee_id: number;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: "present" | "absent" | "leave";
  notes: string | null;
};

export type Payroll = {
  id: number;
  organization_id: number;
  employee_id: number;
  payroll_month: string;
  base_salary: number;
  bonus: number;
  deduction: number;
  net_salary: number;
  currency: Currency;
  is_paid: boolean;
  paid_at: string | null;
  notes: string | null;
};

export type Sale = {
  id: number;
  organization_id: number;
  customer_id: number | null;
  invoice_number: string;
  sale_type: "retail" | "wholesale" | "credit" | "installment";
  currency: Currency;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  status: string;
  sold_at: string;
};

export type Purchase = {
  id: number;
  organization_id: number;
  supplier_id: number | null;
  invoice_number: string;
  supplier_invoice: string | null;
  currency: Currency;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  status: string;
  purchased_at: string;
};

export type Installment = {
  id: number;
  organization_id: number;
  sale_id: number;
  customer_id: number;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  paid_at: string | null;
  status: "pending" | "partial" | "paid" | "late";
  notes: string | null;
};

export type Expense = {
  id: number;
  organization_id: number;
  category: string;
  amount: number;
  currency: Currency;
  exchange_rate: number;
  occurred_on: string;
  notes: string | null;
};

export type Voucher = {
  id: number;
  organization_id: number;
  voucher_number: string;
  voucher_type: "receipt" | "payment" | "waiver" | "disbursement";
  party_type: "customer" | "supplier" | "employee" | "other" | null;
  party_id: number | null;
  party_name: string | null;
  amount: number;
  currency: Currency;
  voucher_date: string;
  notes: string | null;
};

export type CartLine = Product & { quantity: number; unitPrice: number };

export type SuiteData = {
  organization: Organization;
  profile: Profile;
  profiles: Profile[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  employees: Employee[];
  attendance: Attendance[];
  payroll: Payroll[];
  sales: Sale[];
  purchases: Purchase[];
  installments: Installment[];
  expenses: Expense[];
  vouchers: Voucher[];
};

export type Section =
  | "dashboard"
  | "sales"
  | "products"
  | "purchases"
  | "customers"
  | "installments"
  | "employees"
  | "finance"
  | "reports"
  | "users"
  | "settings";

