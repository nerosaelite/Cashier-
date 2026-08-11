"use client";

import JsBarcode from "jsbarcode";
import { FormEvent, ReactNode, useCallback, useRef, useState } from "react";
import { AuthScreen } from "./auth-screen";
import { BarcodeScanner } from "./barcode-scanner";
import type { CartLine, Currency, Product, Section, SuiteData } from "./suite-types";
import { formatMoney, makeScaleBarcode, parseScaleBarcode, roleLabel, saleTypeLabel, shortDate, toBaseCurrency } from "./suite-utils";
import { useSuiteStore } from "./use-suite-store";

const navigation: Array<{ id: Section; label: string; icon: string }> = [
  { id: "dashboard", label: "الرئيسية", icon: "⌂" },
  { id: "sales", label: "المبيعات", icon: "▦" },
  { id: "products", label: "المنتجات والمخزون", icon: "◇" },
  { id: "purchases", label: "المشتريات", icon: "⇩" },
  { id: "customers", label: "العملاء والموردون", icon: "◎" },
  { id: "installments", label: "الأقساط", icon: "◴" },
  { id: "employees", label: "الموظفون", icon: "♙" },
  { id: "finance", label: "الحسابات والسندات", icon: "₡" },
  { id: "reports", label: "التقارير", icon: "▥" },
  { id: "users", label: "المستخدمون", icon: "⚿" },
  { id: "settings", label: "الإعدادات", icon: "⚙" },
];

type Store = ReturnType<typeof useSuiteStore>;
type ToastFn = (text: string, type?: "success" | "error") => void;

export default function BusinessSuite({ supabaseUrl, supabaseKey }: { supabaseUrl?: string; supabaseKey?: string }) {
  const store = useSuiteStore(supabaseUrl, supabaseKey);
  const [section, setSection] = useState<Section>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const notify = useCallback<ToastFn>((text, type = "success") => {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  if (!store.isDemo && !store.session) {
    return <AuthScreen loading={store.loading} error={store.error} onSignIn={store.signIn} onSignUp={store.signUp} />;
  }
  if (store.loading && !store.ready) return <LoadingScreen />;

  function changeSection(next: Section) {
    setSection(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="suite-shell" dir="rtl" style={{ "--brand": store.data.organization.theme_color } as React.CSSProperties}>
      <aside className={`suite-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="suite-brand"><span>ن</span><div><b>NEROSA ELITE</b><small>BUSINESS SUITE</small></div></div>
        <nav>{navigation.map((item) => <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => changeSection(item.id)}><i>{item.icon}</i><span>{item.label}</span></button>)}</nav>
        <div className="user-panel"><div className="avatar">{store.data.profile.full_name.slice(0, 1) || "ن"}</div><div><b>{store.data.profile.full_name}</b><small>{roleLabel(store.data.profile.role)}</small></div>{!store.isDemo && <button onClick={() => void store.signOut()} title="تسجيل الخروج">↪</button>}</div>
      </aside>
      {menuOpen && <button className="menu-backdrop" aria-label="إغلاق القائمة" onClick={() => setMenuOpen(false)} />}

      <main className="suite-main">
        <header className="suite-header">
          <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة">☰</button>
          <div><p>{store.data.organization.name}</p><h1>{navigation.find((item) => item.id === section)?.label}</h1></div>
          <div className="header-tools">
            {store.isDemo && <span className="demo-badge">نسخة تجريبية</span>}
            <button onClick={() => void store.reload()} aria-label="تحديث">↻</button>
          </div>
        </header>

        {store.error && <div className="page-alert error">{store.error}</div>}
        {section === "dashboard" && <Dashboard store={store} go={changeSection} />}
        {section === "sales" && <Sales store={store} notify={notify} />}
        {section === "products" && <Products store={store} notify={notify} />}
        {section === "purchases" && <Purchases store={store} notify={notify} />}
        {section === "customers" && <Customers store={store} notify={notify} />}
        {section === "installments" && <Installments store={store} notify={notify} />}
        {section === "employees" && <Employees store={store} notify={notify} />}
        {section === "finance" && <Finance store={store} notify={notify} />}
        {section === "reports" && <Reports store={store} />}
        {section === "users" && <Users store={store} notify={notify} />}
        {section === "settings" && <Settings store={store} notify={notify} />}
      </main>

      <nav className="mobile-tabs">
        {navigation.slice(0, 5).map((item) => <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => changeSection(item.id)}><i>{item.icon}</i><span>{item.label.split(" ")[0]}</span></button>)}
        <button onClick={() => setMenuOpen(true)}><i>☰</i><span>المزيد</span></button>
      </nav>
      {toast && <div className={`suite-toast ${toast.type}`}>{toast.type === "success" ? "✓" : "!"}<span>{toast.text}</span></div>}
    </div>
  );
}

function LoadingScreen() {
  return <main className="loading-page"><div className="loading-logo">ن</div><h1>نيروزا إيليت</h1><p>جاري تحميل نظام الإدارة...</p></main>;
}

function Dashboard({ store, go }: { store: Store; go: (section: Section) => void }) {
  const { data } = store;
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = data.sales.filter((sale) => sale.sold_at.slice(0, 10) === today && sale.status === "completed");
  const salesTotal = todaySales.reduce((sum, sale) => sum + toBaseCurrency(Number(sale.total), sale.currency, data.organization), 0);
  const todayExpenses = data.expenses.filter((expense) => expense.occurred_on === today).reduce((sum, expense) => sum + toBaseCurrency(Number(expense.amount), expense.currency, data.organization), 0);
  const overdue = data.installments.filter((item) => item.status !== "paid" && item.due_date < today);
  const lowStock = data.products.filter((product) => product.is_active && Number(product.stock) <= Number(product.min_stock));
  const outstanding = data.customers.reduce((sum, customer) => sum + Math.max(Number(customer.balance) || 0, 0), 0);

  return <div className="section-stack">
    <section className="welcome-card">
      <div><p>أهلاً {data.profile.full_name || "بك"}</p><h2>كل شغلك بمكان واحد</h2><span>المبيعات والمخزون والحسابات والموظفين محدثة لحظة بلحظة.</span></div>
      <button onClick={() => go("sales")}>ابدأ عملية بيع <b>←</b></button>
    </section>
    <section className="stats-grid">
      <StatCard label="مبيعات اليوم" value={formatMoney(salesTotal, data.organization.default_currency)} detail={`${todaySales.length} فاتورة`} tone="pink" />
      <StatCard label="صافي اليوم" value={formatMoney(salesTotal - todayExpenses, data.organization.default_currency)} detail={`المصاريف ${formatMoney(todayExpenses, data.organization.default_currency)}`} tone="green" />
      <StatCard label="ديون العملاء" value={formatMoney(outstanding, data.organization.default_currency)} detail={`${data.customers.filter((customer) => Number(customer.balance) > 0).length} عملاء`} tone="gold" />
      <StatCard label="أقساط متأخرة" value={String(overdue.length)} detail={formatMoney(overdue.reduce((sum, item) => sum + Number(item.amount) - Number(item.paid_amount), 0))} tone="red" />
    </section>
    <section className="quick-actions panel">
      <SectionTitle title="إضافة سريعة" subtitle="اختصارات لأكثر العمليات استعمالاً" />
      <div>{[
        ["sales", "▦", "بيع جديد"], ["products", "+", "منتج جديد"], ["purchases", "⇩", "فاتورة شراء"], ["finance", "₡", "تسجيل مصروف"], ["employees", "♙", "حضور موظف"], ["reports", "▥", "تقرير اليوم"],
      ].map(([target, icon, label]) => <button key={label} onClick={() => go(target as Section)}><i>{icon}</i><span>{label}</span></button>)}</div>
    </section>
    <div className="dashboard-columns">
      <section className="panel"><SectionTitle title="آخر المبيعات" action="عرض التقارير" onAction={() => go("reports")} />
        <div className="compact-list">{data.sales.slice(0, 5).map((sale) => <div key={sale.id}><span className="list-icon">✓</span><div><b>{sale.invoice_number}</b><small>{saleTypeLabel(sale.sale_type)} · {shortDate(sale.sold_at)}</small></div><strong>{formatMoney(Number(sale.total), sale.currency)}</strong></div>)}{!data.sales.length && <Empty text="لا توجد مبيعات بعد" />}</div>
      </section>
      <section className="panel"><SectionTitle title="تنبيهات المخزون" action="إدارة المخزون" onAction={() => go("products")} />
        <div className="compact-list">{lowStock.slice(0, 5).map((product) => <div key={product.id}><span className="list-icon warning">!</span><div><b>{product.name}</b><small>الحد الأدنى {product.min_stock}</small></div><strong className="danger-text">{product.stock} {product.unit}</strong></div>)}{!lowStock.length && <Empty text="المخزون بحالة جيدة" />}</div>
      </section>
    </div>
  </div>;
}

function StatCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <article className={`stat-card ${tone}`}><p>{label}</p><h3>{value}</h3><small>{detail}</small></article>;
}

function SectionTitle({ title, subtitle, action, onAction }: { title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return <div className="section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <button onClick={onAction}>{action} ←</button>}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="empty-small">{text}</div>;
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className={`suite-modal ${wide ? "wide" : ""}`} onMouseDown={(event) => event.stopPropagation()}><header><h2>{title}</h2><button type="button" onClick={onClose}>×</button></header>{children}</section></div>;
}

function Field({ label, children, full = false }: { label: string; children: ReactNode; full?: boolean }) {
  return <label className={full ? "field full" : "field"}><span>{label}</span>{children}</label>;
}

function Sales({ store, notify }: { store: Store; notify: ToastFn }) {
  const { data } = store;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [saleType, setSaleType] = useState<"retail" | "wholesale" | "credit" | "installment">("retail");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [currency, setCurrency] = useState<Currency>(data.organization.default_currency);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [firstDue, setFirstDue] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [scanner, setScanner] = useState(false);
  const [busy, setBusy] = useState(false);
  const categories = ["الكل", ...Array.from(new Set(data.products.map((product) => product.category)))];
  const products = data.products.filter((product) => product.is_active && (category === "الكل" || product.category === category) && (!query.trim() || product.name.toLowerCase().includes(query.toLowerCase()) || product.barcode?.includes(query) || product.sku?.toLowerCase().includes(query.toLowerCase())));
  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const total = Math.max(subtotal - discount, 0);

  const add = useCallback((product: Product, quantity = 1) => {
    if (Number(product.stock) < quantity) return notify("المخزون غير كافٍ", "error");
    const price = saleType === "wholesale" ? Number(product.wholesale_price) : Number(product.retail_price);
    setCart((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (existing) return current.map((line) => line.id === product.id ? { ...line, quantity: Math.min(Number(product.stock), line.quantity + quantity), unitPrice: price } : line);
      return [...current, { ...product, quantity, unitPrice: price }];
    });
  }, [notify, saleType]);

  function changeType(next: typeof saleType) {
    setSaleType(next);
    setCart((current) => current.map((line) => ({ ...line, unitPrice: next === "wholesale" ? Number(line.wholesale_price) : Number(line.retail_price) })));
  }

  const onScan = useCallback((value: string) => {
    setScanner(false);
    const scale = parseScaleBarcode(value, data.products, data.organization);
    if (scale) {
      add(scale.product, scale.weight);
      notify(`تمت إضافة ${scale.product.name} بوزن ${scale.weight} كغم`);
      return;
    }
    const product = data.products.find((item) => item.barcode === value);
    if (!product) {
      setQuery(value);
      notify("الباركود غير مسجل. أضف المنتج أولاً.", "error");
      return;
    }
    add(product);
    notify(`تمت إضافة ${product.name}`);
  }, [add, data.organization, data.products, notify]);

  async function finishSale() {
    if (!cart.length) return notify("أضف منتجاً إلى السلة", "error");
    if ((saleType === "credit" || saleType === "installment") && !customerId) return notify("اختر العميل للبيع الآجل أو القسط", "error");
    setBusy(true);
    try {
      const result = await store.createSale({ customerId, saleType, currency, discount, paid, installmentCount: saleType === "installment" ? installmentCount : 0, firstDue: saleType === "installment" ? firstDue : null, notes: "", cart });
      printInvoice(data, result.invoice_number, cart, subtotal, discount, Number(result.total), Number(result.paid), currency, customerId ? data.customers.find((item) => item.id === customerId)?.name : undefined);
      setCart([]);
      setDiscount(0);
      setPaid(0);
      setCustomerId(null);
      notify(`تم حفظ الفاتورة ${result.invoice_number}`);
    } catch (saleError) {
      notify(saleError instanceof Error ? saleError.message : "تعذر تسجيل البيع", "error");
    } finally {
      setBusy(false);
    }
  }

  return <div className="pos-layout">
    <section className="pos-catalog panel">
      <div className="pos-search-row"><div className="search-input"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو امسح الباركود" /></div><button className="scan-action" onClick={() => setScanner(true)}><i className="scan-symbol" />مسح</button></div>
      <div className="chip-row">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <div className="product-grid">{products.map((product) => <button key={product.id} className="product-card" onClick={() => add(product)} disabled={Number(product.stock) <= 0}><span className="product-avatar">{product.name.slice(0, 1)}</span><b>{product.name}</b><small>{product.barcode || product.sku || "بدون باركود"}</small><strong>{formatMoney(saleType === "wholesale" ? Number(product.wholesale_price) : Number(product.retail_price), product.currency)}</strong><em className={Number(product.stock) <= Number(product.min_stock) ? "low" : ""}>{product.stock} {product.unit}</em></button>)}{!products.length && <div className="products-empty">ما لكينا منتج مطابق</div>}</div>
    </section>
    <aside className="cart-panel panel">
      <div className="cart-head"><div><p>الفاتورة الحالية</p><h2>{cart.reduce((sum, line) => sum + line.quantity, 0).toFixed(3).replace(/\.000$/, "")} مواد</h2></div><button onClick={() => setCart([])} disabled={!cart.length}>تفريغ</button></div>
      <div className="sale-type-tabs">{(["retail", "wholesale", "credit", "installment"] as const).map((type) => <button key={type} className={saleType === type ? "active" : ""} onClick={() => changeType(type)}>{saleTypeLabel(type)}</button>)}</div>
      <div className="cart-lines">{cart.map((line) => <div className="cart-line" key={line.id}><div><b>{line.name}</b><small>{formatMoney(line.unitPrice, line.currency)}</small></div><div className="quantity"><button onClick={() => setCart((current) => current.map((item) => item.id === line.id ? { ...item, quantity: Math.min(Number(item.stock), item.quantity + (item.track_weight ? 0.1 : 1)) } : item))}>+</button><input inputMode="decimal" value={line.quantity} onChange={(event) => setCart((current) => current.map((item) => item.id === line.id ? { ...item, quantity: Math.max(0.001, Number(event.target.value) || 0) } : item))} /><button onClick={() => setCart((current) => line.quantity <= (line.track_weight ? 0.1 : 1) ? current.filter((item) => item.id !== line.id) : current.map((item) => item.id === line.id ? { ...item, quantity: item.quantity - (item.track_weight ? 0.1 : 1) } : item))}>−</button></div><strong>{formatMoney(line.unitPrice * line.quantity, line.currency)}</strong></div>)}{!cart.length && <div className="cart-empty"><i>▦</i><b>السلة فارغة</b><span>اختر منتجاً أو امسح الباركود</span></div>}</div>
      <div className="cart-options">
        {(saleType === "credit" || saleType === "installment") && <Field label="العميل"><select value={customerId || ""} onChange={(event) => setCustomerId(Number(event.target.value) || null)}><option value="">اختر العميل</option>{data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></Field>}
        <div className="inline-fields"><Field label="العملة"><select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}><option value="IQD">دينار</option><option value="USD">دولار</option></select></Field><Field label="الخصم"><input inputMode="numeric" value={discount || ""} onChange={(event) => setDiscount(Number(event.target.value) || 0)} /></Field></div>
        {(saleType === "credit" || saleType === "installment") && <Field label="المبلغ المدفوع"><input inputMode="numeric" value={paid || ""} onChange={(event) => setPaid(Number(event.target.value) || 0)} /></Field>}
        {saleType === "installment" && <div className="inline-fields"><Field label="عدد الأقساط"><input type="number" min="1" max="36" value={installmentCount} onChange={(event) => setInstallmentCount(Math.max(1, Number(event.target.value) || 1))} /></Field><Field label="أول استحقاق"><input type="date" value={firstDue} onChange={(event) => setFirstDue(event.target.value)} /></Field></div>}
      </div>
      <dl className="cart-totals"><div><dt>المجموع</dt><dd>{formatMoney(subtotal, currency)}</dd></div><div><dt>الخصم</dt><dd>− {formatMoney(discount, currency)}</dd></div><div className="final"><dt>المبلغ النهائي</dt><dd>{formatMoney(total, currency)}</dd></div></dl>
      <button className="primary-button checkout" onClick={() => void finishSale()} disabled={busy || !cart.length}>{busy ? "جاري الحفظ..." : "إتمام البيع وطباعة الفاتورة"}<b>←</b></button>
    </aside>
    {scanner && <BarcodeScanner onRead={onScan} onClose={() => setScanner(false)} />}
  </div>;
}

function printInvoice(data: SuiteData, invoiceNumber: string, cart: CartLine[], subtotal: number, discount: number, total: number, paid: number, currency: Currency, customer?: string) {
  const popup = window.open("", "_blank", "width=520,height=760");
  if (!popup) return;
  const rows = cart.map((line) => `<tr><td>${line.name}</td><td>${line.quantity}</td><td>${formatMoney(line.unitPrice, currency)}</td><td>${formatMoney(line.unitPrice * line.quantity, currency)}</td></tr>`).join("");
  popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${invoiceNumber}</title><style>body{font-family:Arial,sans-serif;margin:20px;color:#20161a;max-width:${data.organization.invoice_size === "80mm" ? "300px" : "900px"};margin-inline:auto}.brand{text-align:center;border-bottom:2px solid ${data.organization.theme_color};padding-bottom:12px}.brand h1{margin:0;color:${data.organization.theme_color};font-size:24px}.meta{font-size:12px;line-height:1.8;margin:12px 0}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:8px 4px;border-bottom:1px solid #ddd;text-align:right}.totals{margin-top:14px;border-top:2px solid #222;padding-top:8px}.totals div{display:flex;justify-content:space-between;padding:4px}.total{font-size:17px;font-weight:bold}.footer{text-align:center;margin-top:18px;font-size:12px}@media print{body{margin:0}}</style></head><body><div class="brand"><h1>${data.organization.name}</h1><div>${data.organization.invoice_header || ""}</div></div><div class="meta">رقم الفاتورة: <b>${invoiceNumber}</b><br>التاريخ: ${new Date().toLocaleString("ar-IQ")}<br>${customer ? `العميل: ${customer}<br>` : ""}${data.organization.phone ? `الهاتف: ${data.organization.phone}<br>` : ""}${data.organization.address || ""}</div><table><thead><tr><th>المادة</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div><span>المجموع</span><b>${formatMoney(subtotal, currency)}</b></div><div><span>الخصم</span><b>${formatMoney(discount, currency)}</b></div><div class="total"><span>الإجمالي</span><b>${formatMoney(total, currency)}</b></div><div><span>المدفوع</span><b>${formatMoney(paid, currency)}</b></div><div><span>المتبقي</span><b>${formatMoney(Math.max(total - paid, 0), currency)}</b></div></div><p class="footer">${data.organization.invoice_footer}</p><script>window.onload=()=>window.print()</script></body></html>`);
  popup.document.close();
}

function Products({ store, notify }: { store: Store; notify: ToastFn }) {
  const { data } = store;
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [scanner, setScanner] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [copies, setCopies] = useState(1);
  const [draft, setDraft] = useState({ name: "", sku: "", barcode: "", category: "عطور", unit: "قطعة", cost: "", retail_price: "", wholesale_price: "", currency: data.organization.default_currency as Currency, stock: "", min_stock: "0", track_weight: false, scale_product_code: "" });
  const filtered = data.products.filter((product) => !query.trim() || product.name.toLowerCase().includes(query.toLowerCase()) || product.barcode?.includes(query) || product.sku?.toLowerCase().includes(query.toLowerCase()));

  function openNew() {
    setEditingId(null);
    setDraft({ name: "", sku: "", barcode: "", category: "عطور", unit: "قطعة", cost: "", retail_price: "", wholesale_price: "", currency: data.organization.default_currency, stock: "", min_stock: "0", track_weight: false, scale_product_code: "" });
    setModal(true);
  }
  function openEdit(product: Product) {
    setEditingId(product.id);
    setDraft({ name: product.name, sku: product.sku || "", barcode: product.barcode || "", category: product.category, unit: product.unit, cost: String(product.cost), retail_price: String(product.retail_price), wholesale_price: String(product.wholesale_price), currency: product.currency, stock: String(product.stock), min_stock: String(product.min_stock), track_weight: product.track_weight, scale_product_code: product.scale_product_code || "" });
    setModal(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const payload = { name: draft.name.trim(), sku: draft.sku.trim() || null, barcode: draft.barcode.trim() || null, category: draft.category, unit: draft.unit, cost: Number(draft.cost) || 0, retail_price: Number(draft.retail_price) || 0, wholesale_price: Number(draft.wholesale_price) || Number(draft.retail_price) || 0, currency: draft.currency, stock: Number(draft.stock) || 0, min_stock: Number(draft.min_stock) || 0, track_weight: draft.track_weight, scale_product_code: draft.track_weight ? draft.scale_product_code.trim() || null : null, is_active: true };
    try {
      if (editingId) await store.updateRecord("products", editingId, payload);
      else await store.addRecord("products", payload);
      setModal(false);
      notify(editingId ? "تم تحديث المنتج" : "تمت إضافة المنتج");
    } catch (saveError) {
      notify(saveError instanceof Error ? saveError.message : "تعذر حفظ المنتج", "error");
    } finally { setBusy(false); }
  }

  function printProductBarcode(product: Product, forcedBarcode?: string) {
    const value = forcedBarcode || product.barcode || product.sku;
    if (!value) return notify("أدخل باركوداً للمنتج أولاً", "error");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, value, { format: /^\d{13}$/.test(value) ? "EAN13" : "CODE128", displayValue: true, fontSize: 15, height: 52, margin: 8 });
    const popup = window.open("", "_blank", "width=640,height=720");
    if (!popup) return;
    popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>باركود ${product.name}</title><style>@page{margin:6mm}body{font-family:Arial;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.label{border:1px dashed #aaa;padding:9px;text-align:center;break-inside:avoid}.label b{display:block;font-size:12px;margin-bottom:4px}.label svg{max-width:100%;height:auto}.label small{display:block}</style></head><body>${Array.from({ length: Math.max(1, copies) }, () => `<div class="label"><b>${product.name}</b>${svg.outerHTML}<small>${formatMoney(Number(product.retail_price), product.currency)}</small></div>`).join("")}<script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  }

  return <div className="section-stack">
    <section className="panel page-toolbar"><div className="search-input"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو الباركود أو الرمز" /></div><div className="toolbar-actions"><label className="copies-control">نسخ <input type="number" min="1" max="100" value={copies} onChange={(event) => setCopies(Math.max(1, Number(event.target.value) || 1))} /></label><button className="primary-button compact" onClick={openNew}>+ إضافة منتج</button></div></section>
    <section className="stats-grid mini"><StatCard label="عدد المنتجات" value={String(data.products.length)} detail="منتج مسجل" tone="pink" /><StatCard label="قيمة المخزون" value={formatMoney(data.products.reduce((sum, item) => sum + Number(item.stock) * Number(item.cost), 0))} detail="بسعر التكلفة" tone="green" /><StatCard label="مخزون منخفض" value={String(data.products.filter((item) => Number(item.stock) <= Number(item.min_stock)).length)} detail="يحتاج متابعة" tone="red" /></section>
    <section className="panel table-panel"><div className="responsive-table"><table><thead><tr><th>المنتج</th><th>الباركود</th><th>القسم</th><th>التكلفة</th><th>مفرد</th><th>جملة</th><th>المخزون</th><th>إجراءات</th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id}><td><b>{product.name}</b><small>{product.sku || "—"}</small></td><td className="latin">{product.barcode || "—"}</td><td>{product.category}</td><td>{formatMoney(Number(product.cost), product.currency)}</td><td>{formatMoney(Number(product.retail_price), product.currency)}</td><td>{formatMoney(Number(product.wholesale_price), product.currency)}</td><td><span className={`stock-pill ${Number(product.stock) <= Number(product.min_stock) ? "low" : ""}`}>{product.stock} {product.unit}</span></td><td><div className="row-actions"><button onClick={() => openEdit(product)}>تعديل</button><button onClick={() => printProductBarcode(product)}>طباعة</button></div></td></tr>)}</tbody></table></div>{!filtered.length && <Empty text="لا توجد منتجات مطابقة" />}</section>
    {modal && <Modal title={editingId ? "تعديل المنتج" : "إضافة منتج جديد"} onClose={() => setModal(false)} wide><form className="form-grid suite-form" onSubmit={save}>
      <Field label="اسم المنتج" full><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
      <Field label="رمز المنتج SKU"><input value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value })} /></Field>
      <Field label="الباركود"><div className="input-action"><input inputMode="numeric" value={draft.barcode} onChange={(event) => setDraft({ ...draft, barcode: event.target.value.replace(/\D/g, "") })} /><button type="button" onClick={() => setScanner(true)}>مسح</button></div></Field>
      <Field label="القسم"><input list="product-categories" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /><datalist id="product-categories"><option value="عطور" /><option value="مسك" /><option value="حقائب" /><option value="أخرى" /></datalist></Field>
      <Field label="الوحدة"><select value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })}><option>قطعة</option><option>كغم</option><option>غرام</option><option>علبة</option><option>متر</option></select></Field>
      <Field label="سعر التكلفة"><input required inputMode="decimal" value={draft.cost} onChange={(event) => setDraft({ ...draft, cost: event.target.value })} /></Field>
      <Field label="سعر المفرد"><input required inputMode="decimal" value={draft.retail_price} onChange={(event) => setDraft({ ...draft, retail_price: event.target.value })} /></Field>
      <Field label="سعر الجملة"><input required inputMode="decimal" value={draft.wholesale_price} onChange={(event) => setDraft({ ...draft, wholesale_price: event.target.value })} /></Field>
      <Field label="العملة"><select value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value as Currency })}><option value="IQD">دينار</option><option value="USD">دولار</option></select></Field>
      <Field label="الرصيد الحالي"><input required inputMode="decimal" value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} /></Field>
      <Field label="حد التنبيه"><input required inputMode="decimal" value={draft.min_stock} onChange={(event) => setDraft({ ...draft, min_stock: event.target.value })} /></Field>
      <label className="toggle-field full"><input type="checkbox" checked={draft.track_weight} onChange={(event) => setDraft({ ...draft, track_weight: event.target.checked })} /><span><b>منتج موزون</b><small>يُقرأ الوزن تلقائياً من باركود الميزان</small></span></label>
      {draft.track_weight && <Field label="رمز المنتج في الميزان" full><input required inputMode="numeric" value={draft.scale_product_code} onChange={(event) => setDraft({ ...draft, scale_product_code: event.target.value.replace(/\D/g, "") })} /></Field>}
      <div className="form-actions full"><button type="button" className="secondary-button" onClick={() => setModal(false)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy ? "جاري الحفظ..." : "حفظ المنتج"}</button></div>
    </form></Modal>}
    {scanner && <BarcodeScanner onRead={(value) => { setDraft((current) => ({ ...current, barcode: value })); setScanner(false); notify("تم إدخال الباركود"); }} onClose={() => setScanner(false)} />}
  </div>;
}

function Purchases({ store, notify }: { store: Store; notify: ToastFn }) {
  const { data } = store;
  const [cart, setCart] = useState<Array<Product & { quantity: number; unitCost: number }>>([]);
  const [supplierId, setSupplierId] = useState<number | null>(data.suppliers[0]?.id || null);
  const [supplierInvoice, setSupplierInvoice] = useState("");
  const [currency, setCurrency] = useState<Currency>(data.organization.default_currency);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const total = Math.max(cart.reduce((sum, line) => sum + line.quantity * line.unitCost, 0) - discount, 0);

  function addProduct(product: Product) {
    setCart((current) => current.some((line) => line.id === product.id) ? current : [...current, { ...product, quantity: 1, unitCost: Number(product.cost) }]);
  }
  async function submit() {
    if (!cart.length) return notify("أضف منتجات إلى فاتورة الشراء", "error");
    setBusy(true);
    try {
      await store.createPurchase({ supplierId, supplierInvoice, currency, discount, paid, notes, cart });
      setCart([]); setDiscount(0); setPaid(0); setSupplierInvoice(""); setNotes("");
      notify("تم تسجيل المشتريات وتحديث المخزون");
    } catch (purchaseError) { notify(purchaseError instanceof Error ? purchaseError.message : "تعذر تسجيل المشتريات", "error"); }
    finally { setBusy(false); }
  }

  return <div className="section-stack">
    <div className="purchase-layout">
      <section className="panel">
        <SectionTitle title="تسجيل فاتورة شراء" subtitle="تضاف الكميات إلى المخزون تلقائياً" />
        <div className="form-grid suite-form compact-form">
          <Field label="المورد"><select value={supplierId || ""} onChange={(event) => setSupplierId(Number(event.target.value) || null)}><option value="">بدون مورد</option>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field>
          <Field label="رقم فاتورة المورد"><input value={supplierInvoice} onChange={(event) => setSupplierInvoice(event.target.value)} /></Field>
          <Field label="العملة"><select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}><option value="IQD">دينار</option><option value="USD">دولار</option></select></Field>
          <Field label="الخصم"><input inputMode="decimal" value={discount || ""} onChange={(event) => setDiscount(Number(event.target.value) || 0)} /></Field>
          <Field label="المدفوع"><input inputMode="decimal" value={paid || ""} onChange={(event) => setPaid(Number(event.target.value) || 0)} /></Field>
          <Field label="ملاحظات"><input value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
        </div>
        <div className="purchase-products"><p>اختر المنتجات</p><div>{data.products.filter((product) => product.is_active).map((product) => <button key={product.id} onClick={() => addProduct(product)}>{product.name}<small>{formatMoney(Number(product.cost), product.currency)}</small></button>)}</div></div>
        <div className="purchase-lines">{cart.map((line) => <div key={line.id}><b>{line.name}</b><label>الكمية<input inputMode="decimal" value={line.quantity} onChange={(event) => setCart((current) => current.map((item) => item.id === line.id ? { ...item, quantity: Number(event.target.value) || 0 } : item))} /></label><label>التكلفة<input inputMode="decimal" value={line.unitCost} onChange={(event) => setCart((current) => current.map((item) => item.id === line.id ? { ...item, unitCost: Number(event.target.value) || 0 } : item))} /></label><strong>{formatMoney(line.quantity * line.unitCost, currency)}</strong><button onClick={() => setCart((current) => current.filter((item) => item.id !== line.id))}>×</button></div>)}{!cart.length && <Empty text="اختر منتجاً من القائمة أعلاه" />}</div>
        <div className="purchase-total"><span>إجمالي الفاتورة</span><strong>{formatMoney(total, currency)}</strong></div>
        <button className="primary-button" onClick={() => void submit()} disabled={busy || !cart.length}>{busy ? "جاري الحفظ..." : "حفظ الفاتورة وتحديث المخزون"}</button>
      </section>
      <section className="panel"><SectionTitle title="آخر المشتريات" /><div className="compact-list">{data.purchases.slice(0, 12).map((purchase) => <div key={purchase.id}><span className="list-icon">⇩</span><div><b>{purchase.invoice_number}</b><small>{shortDate(purchase.purchased_at)} · {data.suppliers.find((item) => item.id === purchase.supplier_id)?.name || "بدون مورد"}</small></div><strong>{formatMoney(Number(purchase.total), purchase.currency)}</strong></div>)}{!data.purchases.length && <Empty text="لا توجد مشتريات مسجلة" />}</div></section>
    </div>
  </div>;
}

function Customers({ store, notify }: { store: Store; notify: ToastFn }) {
  const { data } = store;
  const [tab, setTab] = useState<"customers" | "suppliers">("customers");
  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "", address: "", opening_balance: "0", credit_limit: "0", notes: "" });

  function openNew() { setDraft({ name: "", phone: "", address: "", opening_balance: "0", credit_limit: "0", notes: "" }); setModal(true); }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      if (tab === "customers") await store.addRecord("customers", { name: draft.name, phone: draft.phone || null, address: draft.address || null, opening_balance: Number(draft.opening_balance) || 0, credit_limit: Number(draft.credit_limit) || 0, notes: draft.notes || null, balance: Number(draft.opening_balance) || 0 });
      else await store.addRecord("suppliers", { name: draft.name, phone: draft.phone || null, address: draft.address || null, opening_balance: Number(draft.opening_balance) || 0, notes: draft.notes || null });
      setModal(false); notify(tab === "customers" ? "تمت إضافة العميل" : "تمت إضافة المورد");
    } catch (saveError) { notify(saveError instanceof Error ? saveError.message : "تعذر الحفظ", "error"); }
    finally { setBusy(false); }
  }
  const customers = data.customers.filter((item) => !query || item.name.includes(query) || item.phone?.includes(query));
  const suppliers = data.suppliers.filter((item) => !query || item.name.includes(query) || item.phone?.includes(query));

  return <div className="section-stack">
    <section className="panel page-toolbar"><div className="segmented"><button className={tab === "customers" ? "active" : ""} onClick={() => setTab("customers")}>العملاء</button><button className={tab === "suppliers" ? "active" : ""} onClick={() => setTab("suppliers")}>الموردون</button></div><div className="search-input"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالاسم أو الهاتف" /></div><button className="primary-button compact" onClick={openNew}>+ إضافة {tab === "customers" ? "عميل" : "مورد"}</button></section>
    {tab === "customers" ? <section className="customer-grid">{customers.map((customer) => <article className="customer-card panel" key={customer.id}><div className="customer-name"><span>{customer.name.slice(0, 1)}</span><div><h3>{customer.name}</h3><p>{customer.phone || "بدون هاتف"}</p></div></div><dl><div><dt>الرصيد</dt><dd className={Number(customer.balance) > 0 ? "danger-text" : "success-text"}>{formatMoney(Number(customer.balance) || 0)}</dd></div><div><dt>الحد الائتماني</dt><dd>{formatMoney(Number(customer.credit_limit))}</dd></div><div><dt>المشتريات</dt><dd>{data.sales.filter((sale) => sale.customer_id === customer.id).length} فاتورة</dd></div></dl><details><summary>كشف الحساب</summary><div className="statement-list">{data.sales.filter((sale) => sale.customer_id === customer.id).map((sale) => <div key={sale.id}><span>{sale.invoice_number}</span><b>{formatMoney(Number(sale.due), sale.currency)}</b></div>)}{!data.sales.some((sale) => sale.customer_id === customer.id) && <Empty text="لا توجد حركة" />}</div></details></article>)}{!customers.length && <Empty text="لا يوجد عملاء" />}</section> : <section className="customer-grid">{suppliers.map((supplier) => <article className="customer-card panel" key={supplier.id}><div className="customer-name"><span>{supplier.name.slice(0, 1)}</span><div><h3>{supplier.name}</h3><p>{supplier.phone || "بدون هاتف"}</p></div></div><dl><div><dt>فواتير الشراء</dt><dd>{data.purchases.filter((purchase) => purchase.supplier_id === supplier.id).length}</dd></div><div><dt>المتبقي</dt><dd>{formatMoney(data.purchases.filter((purchase) => purchase.supplier_id === supplier.id).reduce((sum, purchase) => sum + Number(purchase.due), Number(supplier.opening_balance)))}</dd></div></dl></article>)}{!suppliers.length && <Empty text="لا يوجد موردون" />}</section>}
    {modal && <Modal title={`إضافة ${tab === "customers" ? "عميل" : "مورد"}`} onClose={() => setModal(false)}><form className="form-grid suite-form" onSubmit={save}><Field label="الاسم" full><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field><Field label="رقم الهاتف"><input inputMode="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></Field><Field label="العنوان"><input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></Field><Field label="الرصيد الافتتاحي"><input inputMode="decimal" value={draft.opening_balance} onChange={(event) => setDraft({ ...draft, opening_balance: event.target.value })} /></Field>{tab === "customers" && <Field label="الحد الائتماني"><input inputMode="decimal" value={draft.credit_limit} onChange={(event) => setDraft({ ...draft, credit_limit: event.target.value })} /></Field>}<Field label="ملاحظات" full><textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></Field><div className="form-actions full"><button type="button" className="secondary-button" onClick={() => setModal(false)}>إلغاء</button><button className="primary-button" disabled={busy}>حفظ</button></div></form></Modal>}
  </div>;
}

function Installments({ store, notify }: { store: Store; notify: ToastFn }) {
  const { data } = store;
  const today = new Date().toISOString().slice(0, 10);
  const [status, setStatus] = useState<"all" | "late" | "pending" | "paid">("all");
  const [paying, setPaying] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const items = data.installments.map((item) => ({ ...item, computedStatus: item.status !== "paid" && item.due_date < today ? "late" : item.status })).filter((item) => status === "all" || item.computedStatus === status);
  const remaining = data.installments.reduce((sum, item) => sum + Math.max(Number(item.amount) - Number(item.paid_amount), 0), 0);
  const overdue = data.installments.filter((item) => item.status !== "paid" && item.due_date < today).reduce((sum, item) => sum + Number(item.amount) - Number(item.paid_amount), 0);

  async function pay() {
    if (!paying || Number(amount) <= 0) return;
    setBusy(true);
    try { await store.payInstallment(paying, Number(amount)); setPaying(null); setAmount(""); notify("تم تسجيل دفعة القسط وإنشاء سند قبض"); }
    catch (payError) { notify(payError instanceof Error ? payError.message : "تعذر تسجيل الدفعة", "error"); }
    finally { setBusy(false); }
  }
  return <div className="section-stack">
    <section className="stats-grid mini"><StatCard label="إجمالي المتبقي" value={formatMoney(remaining)} detail={`${data.installments.filter((item) => item.status !== "paid").length} قسط مفتوح`} tone="gold" /><StatCard label="المتأخر" value={formatMoney(overdue)} detail={`${data.installments.filter((item) => item.status !== "paid" && item.due_date < today).length} قسط متأخر`} tone="red" /><StatCard label="المحصّل" value={formatMoney(data.installments.reduce((sum, item) => sum + Number(item.paid_amount), 0))} detail="دفعات مسجلة" tone="green" /></section>
    <section className="panel"><div className="section-title"><div><h2>جدول الأقساط</h2><p>متابعة المستحق والمتأخر لكل عميل</p></div><div className="segmented small">{(["all", "late", "pending", "paid"] as const).map((item) => <button key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item)}>{({ all: "الكل", late: "متأخر", pending: "قادم", paid: "مدفوع" })[item]}</button>)}</div></div>
      <div className="responsive-table"><table><thead><tr><th>العميل</th><th>الفاتورة</th><th>القسط</th><th>الاستحقاق</th><th>المبلغ</th><th>المدفوع</th><th>الحالة</th><th></th></tr></thead><tbody>{items.map((item) => { const customer = data.customers.find((row) => row.id === item.customer_id); const sale = data.sales.find((row) => row.id === item.sale_id); return <tr key={item.id}><td><b>{customer?.name || "عميل"}</b><small>{customer?.phone}</small></td><td>{sale?.invoice_number || item.sale_id}</td><td>#{item.installment_number}</td><td>{shortDate(item.due_date)}</td><td>{formatMoney(Number(item.amount))}</td><td>{formatMoney(Number(item.paid_amount))}</td><td><span className={`status-pill ${item.computedStatus}`}>{({ late: "متأخر", pending: "قادم", partial: "جزئي", paid: "مدفوع" } as Record<string, string>)[item.computedStatus]}</span></td><td>{item.computedStatus !== "paid" && <button className="table-button" onClick={() => { setPaying(item.id); setAmount(String(Number(item.amount) - Number(item.paid_amount))); }}>تسديد</button>}</td></tr>; })}</tbody></table></div>{!items.length && <Empty text="لا توجد أقساط ضمن هذا التصنيف" />}
    </section>
    {paying && <Modal title="تسجيل دفعة قسط" onClose={() => setPaying(null)}><div className="suite-form"><Field label="المبلغ"><input autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field><button className="primary-button" onClick={() => void pay()} disabled={busy}>{busy ? "جاري التسجيل..." : "تسجيل الدفعة وإنشاء سند قبض"}</button></div></Modal>}
  </div>;
}

function Employees({ store, notify }: { store: Store; notify: ToastFn }) {
  const { data } = store;
  const [tab, setTab] = useState<"employees" | "attendance" | "payroll">("employees");
  const [modal, setModal] = useState<"employee" | "payroll" | null>(null);
  const [busy, setBusy] = useState(false);
  const [employee, setEmployee] = useState({ name: "", phone: "", position: "", hire_date: new Date().toISOString().slice(0, 10), salary: "", currency: data.organization.default_currency as Currency, notes: "" });
  const [payroll, setPayroll] = useState({ employee_id: "", payroll_month: new Date().toISOString().slice(0, 7) + "-01", base_salary: "", bonus: "0", deduction: "0", currency: data.organization.default_currency as Currency, notes: "" });
  const today = new Date().toISOString().slice(0, 10);

  async function addEmployee(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await store.addRecord("employees", { name: employee.name, phone: employee.phone || null, position: employee.position || null, hire_date: employee.hire_date, salary: Number(employee.salary) || 0, currency: employee.currency, is_active: true, notes: employee.notes || null }); setModal(null); notify("تمت إضافة الموظف"); }
    catch (saveError) { notify(saveError instanceof Error ? saveError.message : "تعذر الحفظ", "error"); }
    finally { setBusy(false); }
  }
  async function toggleAttendance(employeeId: number) {
    const current = data.attendance.find((item) => item.employee_id === employeeId && item.work_date === today);
    try {
      if (!current) await store.addRecord("attendance", { employee_id: employeeId, work_date: today, check_in: new Date().toISOString(), check_out: null, status: "present", notes: null });
      else if (!current.check_out) await store.updateRecord("attendance", current.id, { check_out: new Date().toISOString() });
      else return notify("تم تسجيل حضور وانصراف الموظف اليوم", "error");
      notify(current ? "تم تسجيل الانصراف" : "تم تسجيل الحضور");
    } catch (attendanceError) { notify(attendanceError instanceof Error ? attendanceError.message : "تعذر تسجيل الحضور", "error"); }
  }
  async function addPayroll(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await store.addRecord("payroll", { employee_id: Number(payroll.employee_id), payroll_month: payroll.payroll_month, base_salary: Number(payroll.base_salary) || 0, bonus: Number(payroll.bonus) || 0, deduction: Number(payroll.deduction) || 0, net_salary: Number(payroll.base_salary) + Number(payroll.bonus) - Number(payroll.deduction), currency: payroll.currency, is_paid: false, paid_at: null, notes: payroll.notes || null }); setModal(null); notify("تم إنشاء مسير الراتب"); }
    catch (payrollError) { notify(payrollError instanceof Error ? payrollError.message : "تعذر حفظ الراتب", "error"); }
    finally { setBusy(false); }
  }

  return <div className="section-stack">
    <section className="panel page-toolbar"><div className="segmented">{(["employees", "attendance", "payroll"] as const).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{({ employees: "الموظفون", attendance: "الحضور", payroll: "المرتبات" })[item]}</button>)}</div><button className="primary-button compact" onClick={() => setModal(tab === "payroll" ? "payroll" : "employee")}>+ {tab === "payroll" ? "مسير راتب" : "موظف جديد"}</button></section>
    {tab === "employees" && <section className="employee-grid">{data.employees.map((item) => <article className="employee-card panel" key={item.id}><span className="employee-avatar">{item.name.slice(0, 1)}</span><h3>{item.name}</h3><p>{item.position || "موظف"}</p><dl><div><dt>الراتب</dt><dd>{formatMoney(Number(item.salary), item.currency)}</dd></div><div><dt>تاريخ التعيين</dt><dd>{shortDate(item.hire_date)}</dd></div></dl><button onClick={() => void toggleAttendance(item.id)}>{data.attendance.find((row) => row.employee_id === item.id && row.work_date === today)?.check_out ? "مكتمل اليوم" : data.attendance.some((row) => row.employee_id === item.id && row.work_date === today) ? "تسجيل انصراف" : "تسجيل حضور"}</button></article>)}{!data.employees.length && <Empty text="لا يوجد موظفون" />}</section>}
    {tab === "attendance" && <section className="panel table-panel"><div className="responsive-table"><table><thead><tr><th>الموظف</th><th>التاريخ</th><th>الحضور</th><th>الانصراف</th><th>الحالة</th></tr></thead><tbody>{data.attendance.map((item) => <tr key={item.id}><td>{data.employees.find((employeeRow) => employeeRow.id === item.employee_id)?.name}</td><td>{shortDate(item.work_date)}</td><td>{item.check_in ? new Date(item.check_in).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }) : "—"}</td><td>{item.check_out ? new Date(item.check_out).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }) : "—"}</td><td><span className="status-pill paid">حاضر</span></td></tr>)}</tbody></table></div></section>}
    {tab === "payroll" && <section className="panel table-panel"><div className="responsive-table"><table><thead><tr><th>الموظف</th><th>الشهر</th><th>الأساسي</th><th>الإضافي</th><th>الخصم</th><th>الصافي</th><th>الحالة</th></tr></thead><tbody>{data.payroll.map((item) => <tr key={item.id}><td>{data.employees.find((employeeRow) => employeeRow.id === item.employee_id)?.name}</td><td>{shortDate(item.payroll_month)}</td><td>{formatMoney(Number(item.base_salary), item.currency)}</td><td>{formatMoney(Number(item.bonus), item.currency)}</td><td>{formatMoney(Number(item.deduction), item.currency)}</td><td><b>{formatMoney(Number(item.net_salary), item.currency)}</b></td><td><span className={`status-pill ${item.is_paid ? "paid" : "pending"}`}>{item.is_paid ? "مدفوع" : "غير مدفوع"}</span></td></tr>)}</tbody></table></div></section>}
    {modal === "employee" && <Modal title="إضافة موظف" onClose={() => setModal(null)}><form className="form-grid suite-form" onSubmit={addEmployee}><Field label="اسم الموظف" full><input required value={employee.name} onChange={(event) => setEmployee({ ...employee, name: event.target.value })} /></Field><Field label="الهاتف"><input value={employee.phone} onChange={(event) => setEmployee({ ...employee, phone: event.target.value })} /></Field><Field label="الوظيفة"><input value={employee.position} onChange={(event) => setEmployee({ ...employee, position: event.target.value })} /></Field><Field label="تاريخ التعيين"><input type="date" value={employee.hire_date} onChange={(event) => setEmployee({ ...employee, hire_date: event.target.value })} /></Field><Field label="الراتب"><input required inputMode="numeric" value={employee.salary} onChange={(event) => setEmployee({ ...employee, salary: event.target.value })} /></Field><Field label="العملة"><select value={employee.currency} onChange={(event) => setEmployee({ ...employee, currency: event.target.value as Currency })}><option value="IQD">دينار</option><option value="USD">دولار</option></select></Field><Field label="ملاحظات" full><textarea value={employee.notes} onChange={(event) => setEmployee({ ...employee, notes: event.target.value })} /></Field><button className="primary-button full" disabled={busy}>حفظ الموظف</button></form></Modal>}
    {modal === "payroll" && <Modal title="إنشاء مسير راتب" onClose={() => setModal(null)}><form className="form-grid suite-form" onSubmit={addPayroll}><Field label="الموظف" full><select required value={payroll.employee_id} onChange={(event) => { const selected = data.employees.find((item) => item.id === Number(event.target.value)); setPayroll({ ...payroll, employee_id: event.target.value, base_salary: selected ? String(selected.salary) : "" }); }}><option value="">اختر الموظف</option>{data.employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="الشهر"><input type="date" value={payroll.payroll_month} onChange={(event) => setPayroll({ ...payroll, payroll_month: event.target.value })} /></Field><Field label="الراتب الأساسي"><input inputMode="numeric" value={payroll.base_salary} onChange={(event) => setPayroll({ ...payroll, base_salary: event.target.value })} /></Field><Field label="إضافي"><input inputMode="numeric" value={payroll.bonus} onChange={(event) => setPayroll({ ...payroll, bonus: event.target.value })} /></Field><Field label="خصم"><input inputMode="numeric" value={payroll.deduction} onChange={(event) => setPayroll({ ...payroll, deduction: event.target.value })} /></Field><Field label="العملة"><select value={payroll.currency} onChange={(event) => setPayroll({ ...payroll, currency: event.target.value as Currency })}><option value="IQD">دينار</option><option value="USD">دولار</option></select></Field><button className="primary-button full" disabled={busy}>حفظ مسير الراتب</button></form></Modal>}
  </div>;
}

function Finance({ store, notify }: { store: Store; notify: ToastFn }) {
  const { data } = store;
  const [tab, setTab] = useState<"expenses" | "vouchers">("expenses");
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expense, setExpense] = useState({ category: "مصروف عام", amount: "", currency: data.organization.default_currency as Currency, occurred_on: new Date().toISOString().slice(0, 10), notes: "" });
  const [voucher, setVoucher] = useState({ voucher_type: "receipt" as "receipt" | "payment" | "waiver" | "disbursement", party_type: "customer" as "customer" | "supplier" | "employee" | "other", party_id: "", party_name: "", amount: "", currency: data.organization.default_currency as Currency, voucher_date: new Date().toISOString().slice(0, 10), notes: "" });

  async function saveExpense(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await store.addRecord("expenses", { category: expense.category, amount: Number(expense.amount), currency: expense.currency, exchange_rate: expense.currency === data.organization.default_currency ? 1 : Number(data.organization.exchange_rate), occurred_on: expense.occurred_on, notes: expense.notes || null }); setModal(false); notify("تم تسجيل المصروف"); }
    catch (saveError) { notify(saveError instanceof Error ? saveError.message : "تعذر تسجيل المصروف", "error"); }
    finally { setBusy(false); }
  }
  async function saveVoucher(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const partyList = voucher.party_type === "customer" ? data.customers : voucher.party_type === "supplier" ? data.suppliers : voucher.party_type === "employee" ? data.employees : [];
      const selected = partyList.find((item) => item.id === Number(voucher.party_id));
      await store.addRecord("vouchers", { voucher_number: `NER-V-${Date.now()}`, voucher_type: voucher.voucher_type, party_type: voucher.party_type, party_id: Number(voucher.party_id) || null, party_name: selected?.name || voucher.party_name || null, amount: Number(voucher.amount), currency: voucher.currency, voucher_date: voucher.voucher_date, notes: voucher.notes || null });
      setModal(false); notify("تم إنشاء السند");
    } catch (saveError) { notify(saveError instanceof Error ? saveError.message : "تعذر إنشاء السند", "error"); }
    finally { setBusy(false); }
  }
  const totalExpenses = data.expenses.reduce((sum, item) => sum + toBaseCurrency(Number(item.amount), item.currency, data.organization), 0);
  const receiptTotal = data.vouchers.filter((item) => item.voucher_type === "receipt").reduce((sum, item) => sum + toBaseCurrency(Number(item.amount), item.currency, data.organization), 0);
  const paymentTotal = data.vouchers.filter((item) => item.voucher_type === "payment" || item.voucher_type === "disbursement").reduce((sum, item) => sum + toBaseCurrency(Number(item.amount), item.currency, data.organization), 0);

  return <div className="section-stack">
    <section className="stats-grid mini"><StatCard label="إجمالي المصاريف" value={formatMoney(totalExpenses, data.organization.default_currency)} detail={`${data.expenses.length} حركة`} tone="red" /><StatCard label="سندات القبض" value={formatMoney(receiptTotal, data.organization.default_currency)} detail="مبالغ داخلة" tone="green" /><StatCard label="سندات الصرف" value={formatMoney(paymentTotal, data.organization.default_currency)} detail="مبالغ خارجة" tone="gold" /></section>
    <section className="panel page-toolbar"><div className="segmented"><button className={tab === "expenses" ? "active" : ""} onClick={() => setTab("expenses")}>المصاريف</button><button className={tab === "vouchers" ? "active" : ""} onClick={() => setTab("vouchers")}>السندات</button></div><button className="primary-button compact" onClick={() => setModal(true)}>+ {tab === "expenses" ? "تسجيل مصروف" : "إنشاء سند"}</button></section>
    <section className="panel table-panel"><div className="responsive-table">{tab === "expenses" ? <table><thead><tr><th>التاريخ</th><th>التصنيف</th><th>المبلغ</th><th>الملاحظات</th></tr></thead><tbody>{data.expenses.map((item) => <tr key={item.id}><td>{shortDate(item.occurred_on)}</td><td><b>{item.category}</b></td><td className="danger-text">{formatMoney(Number(item.amount), item.currency)}</td><td>{item.notes || "—"}</td></tr>)}</tbody></table> : <table><thead><tr><th>رقم السند</th><th>النوع</th><th>الطرف</th><th>المبلغ</th><th>التاريخ</th></tr></thead><tbody>{data.vouchers.map((item) => <tr key={item.id}><td>{item.voucher_number}</td><td><span className={`status-pill ${item.voucher_type === "receipt" ? "paid" : "pending"}`}>{({ receipt: "قبض", payment: "صرف", waiver: "سماح", disbursement: "تصريف" } as Record<string, string>)[item.voucher_type]}</span></td><td>{item.party_name || "عام"}</td><td>{formatMoney(Number(item.amount), item.currency)}</td><td>{shortDate(item.voucher_date)}</td></tr>)}</tbody></table>}</div></section>
    {modal && tab === "expenses" && <Modal title="تسجيل مصروف" onClose={() => setModal(false)}><form className="form-grid suite-form" onSubmit={saveExpense}><Field label="نوع المصروف" full><input required list="expense-types" value={expense.category} onChange={(event) => setExpense({ ...expense, category: event.target.value })} /><datalist id="expense-types"><option value="إيجار" /><option value="رواتب" /><option value="كهرباء" /><option value="نقل" /><option value="تسويق" /><option value="مصروف عام" /></datalist></Field><Field label="المبلغ"><input required inputMode="decimal" value={expense.amount} onChange={(event) => setExpense({ ...expense, amount: event.target.value })} /></Field><Field label="العملة"><select value={expense.currency} onChange={(event) => setExpense({ ...expense, currency: event.target.value as Currency })}><option value="IQD">دينار</option><option value="USD">دولار</option></select></Field><Field label="التاريخ"><input type="date" value={expense.occurred_on} onChange={(event) => setExpense({ ...expense, occurred_on: event.target.value })} /></Field><Field label="ملاحظات" full><textarea value={expense.notes} onChange={(event) => setExpense({ ...expense, notes: event.target.value })} /></Field><button className="primary-button full" disabled={busy}>حفظ المصروف</button></form></Modal>}
    {modal && tab === "vouchers" && <Modal title="إنشاء سند" onClose={() => setModal(false)}><form className="form-grid suite-form" onSubmit={saveVoucher}><Field label="نوع السند"><select value={voucher.voucher_type} onChange={(event) => setVoucher({ ...voucher, voucher_type: event.target.value as typeof voucher.voucher_type })}><option value="receipt">سند قبض</option><option value="payment">سند صرف</option><option value="waiver">سند سماح</option><option value="disbursement">سند تصريف</option></select></Field><Field label="نوع الطرف"><select value={voucher.party_type} onChange={(event) => setVoucher({ ...voucher, party_type: event.target.value as typeof voucher.party_type, party_id: "" })}><option value="customer">عميل</option><option value="supplier">مورد</option><option value="employee">موظف</option><option value="other">أخرى</option></select></Field>{voucher.party_type !== "other" ? <Field label="الطرف" full><select value={voucher.party_id} onChange={(event) => setVoucher({ ...voucher, party_id: event.target.value })}><option value="">اختر</option>{(voucher.party_type === "customer" ? data.customers : voucher.party_type === "supplier" ? data.suppliers : data.employees).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field> : <Field label="اسم الطرف" full><input value={voucher.party_name} onChange={(event) => setVoucher({ ...voucher, party_name: event.target.value })} /></Field>}<Field label="المبلغ"><input required inputMode="decimal" value={voucher.amount} onChange={(event) => setVoucher({ ...voucher, amount: event.target.value })} /></Field><Field label="العملة"><select value={voucher.currency} onChange={(event) => setVoucher({ ...voucher, currency: event.target.value as Currency })}><option value="IQD">دينار</option><option value="USD">دولار</option></select></Field><Field label="التاريخ"><input type="date" value={voucher.voucher_date} onChange={(event) => setVoucher({ ...voucher, voucher_date: event.target.value })} /></Field><Field label="البيان" full><textarea value={voucher.notes} onChange={(event) => setVoucher({ ...voucher, notes: event.target.value })} /></Field><button className="primary-button full" disabled={busy}>حفظ وطباعة السند</button></form></Modal>}
  </div>;
}

function Reports({ store }: { store: Store }) {
  const { data } = store;
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const sales = data.sales.filter((sale) => sale.sold_at.slice(0, 10) >= from && sale.sold_at.slice(0, 10) <= to && sale.status === "completed");
  const expenses = data.expenses.filter((expense) => expense.occurred_on >= from && expense.occurred_on <= to);
  const salesTotal = sales.reduce((sum, sale) => sum + toBaseCurrency(Number(sale.total), sale.currency, data.organization), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + toBaseCurrency(Number(expense.amount), expense.currency, data.organization), 0);
  const daily = Array.from(new Set(sales.map((sale) => sale.sold_at.slice(0, 10)))).sort().reverse().map((date) => { const rows = sales.filter((sale) => sale.sold_at.slice(0, 10) === date); return { date, invoices: rows.length, total: rows.reduce((sum, sale) => sum + toBaseCurrency(Number(sale.total), sale.currency, data.organization), 0), paid: rows.reduce((sum, sale) => sum + toBaseCurrency(Number(sale.paid), sale.currency, data.organization), 0), due: rows.reduce((sum, sale) => sum + toBaseCurrency(Number(sale.due), sale.currency, data.organization), 0) }; });
  const maxDaily = Math.max(...daily.map((item) => item.total), 1);

  return <div className="section-stack">
    <section className="panel report-filter"><div><Field label="من"><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field><Field label="إلى"><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field></div><button className="secondary-button" onClick={() => window.print()}>طباعة التقرير</button></section>
    <section className="stats-grid"><StatCard label="إجمالي المبيعات" value={formatMoney(salesTotal, data.organization.default_currency)} detail={`${sales.length} فاتورة`} tone="pink" /><StatCard label="المصاريف" value={formatMoney(expenseTotal, data.organization.default_currency)} detail={`${expenses.length} حركة`} tone="red" /><StatCard label="صافي الحركة" value={formatMoney(salesTotal - expenseTotal, data.organization.default_currency)} detail="المبيعات ناقص المصاريف" tone="green" /><StatCard label="البيع الآجل" value={formatMoney(sales.reduce((sum, sale) => sum + Number(sale.due), 0), data.organization.default_currency)} detail="أرصدة غير مسددة" tone="gold" /></section>
    <div className="dashboard-columns reports-columns"><section className="panel"><SectionTitle title="المبيعات اليومية" subtitle="يتكوّن التقرير تلقائياً من الفواتير" /><div className="bar-chart">{daily.slice(0, 14).reverse().map((item) => <div key={item.date}><span style={{ height: `${Math.max(8, (item.total / maxDaily) * 100)}%` }} title={formatMoney(item.total)} /><small>{item.date.slice(5)}</small></div>)}{!daily.length && <Empty text="لا توجد بيانات في الفترة" />}</div></section><section className="panel"><SectionTitle title="ملخص المخزون" /><div className="compact-list"><div><span className="list-icon">◇</span><div><b>قيمة المخزون بالتكلفة</b><small>{data.products.length} منتج</small></div><strong>{formatMoney(data.products.reduce((sum, item) => sum + Number(item.stock) * Number(item.cost), 0))}</strong></div><div><span className="list-icon warning">!</span><div><b>تحت حد التنبيه</b><small>تحتاج طلب شراء</small></div><strong>{data.products.filter((item) => Number(item.stock) <= Number(item.min_stock)).length}</strong></div></div></section></div>
    <section className="panel table-panel"><SectionTitle title="التقرير اليومي التفصيلي" /><div className="responsive-table"><table><thead><tr><th>التاريخ</th><th>الفواتير</th><th>المبيعات</th><th>المقبوض</th><th>الآجل</th></tr></thead><tbody>{daily.map((item) => <tr key={item.date}><td>{shortDate(item.date)}</td><td>{item.invoices}</td><td><b>{formatMoney(item.total, data.organization.default_currency)}</b></td><td className="success-text">{formatMoney(item.paid, data.organization.default_currency)}</td><td className="danger-text">{formatMoney(item.due, data.organization.default_currency)}</td></tr>)}</tbody></table></div></section>
  </div>;
}

function Users({ store, notify }: { store: Store; notify: ToastFn }) {
  const { data } = store;
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ full_name: "", email: "", password: "", role: "cashier" });
  const canManage = ["owner", "admin"].includes(data.profile.role);

  async function createUser(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await store.manageUsers({ action: "create", ...draft }); setModal(false); setDraft({ full_name: "", email: "", password: "", role: "cashier" }); notify("تم إنشاء المستخدم وكلمة السر"); }
    catch (createError) { notify(createError instanceof Error ? createError.message : "تعذر إنشاء المستخدم", "error"); }
    finally { setBusy(false); }
  }
  async function toggle(userId: string, active: boolean) {
    try { await store.manageUsers({ action: "set_active", user_id: userId, is_active: active }); notify(active ? "تم تفعيل المستخدم" : "تم إلغاء المستخدم"); }
    catch (toggleError) { notify(toggleError instanceof Error ? toggleError.message : "تعذر تعديل المستخدم", "error"); }
  }

  return <div className="section-stack">
    <section className="panel page-toolbar"><div><h2>مستخدمي النظام</h2><p>أنشئ حساباً مستقلاً لكل موظف وحدد صلاحياته</p></div>{canManage && <button className="primary-button compact" onClick={() => setModal(true)}>+ مستخدم جديد</button>}</section>
    {!canManage && <div className="page-alert">إدارة المستخدمين متاحة للمالك والمدير فقط.</div>}
    <section className="user-grid">{data.profiles.map((profile) => <article className="system-user panel" key={profile.user_id}><div className="user-initial">{profile.full_name.slice(0, 1)}</div><div className="user-info"><h3>{profile.full_name}</h3><p>{profile.email}</p><span>{roleLabel(profile.role)}</span></div><div className={`user-status ${profile.is_active ? "active" : "inactive"}`}>{profile.is_active ? "فعال" : "ملغى"}</div>{canManage && profile.role !== "owner" && <button className="secondary-button compact" onClick={() => void toggle(profile.user_id, !profile.is_active)}>{profile.is_active ? "إلغاء المستخدم" : "إعادة التفعيل"}</button>}</article>)}</section>
    {modal && <Modal title="إنشاء مستخدم جديد" onClose={() => setModal(false)}><form className="form-grid suite-form" onSubmit={createUser}><Field label="الاسم الكامل" full><input required value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} /></Field><Field label="البريد الإلكتروني" full><input required type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></Field><Field label="كلمة السر" full><input required type="password" minLength={8} value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} /><small className="field-help">8 أحرف على الأقل</small></Field><Field label="الصلاحية" full><select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })}><option value="cashier">كاشير — البيع والمنتجات</option><option value="manager">مشرف — المخزون والموظفين</option><option value="accountant">محاسب — الحسابات والتقارير</option><option value="admin">مدير — كل الإعدادات</option></select></Field><button className="primary-button full" disabled={busy}>{busy ? "جاري الإنشاء..." : "إنشاء المستخدم"}</button></form></Modal>}
  </div>;
}

function Settings({ store, notify }: { store: Store; notify: ToastFn }) {
  const { data } = store;
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [resetText, setResetText] = useState("");
  const [scaleProductId, setScaleProductId] = useState<number | null>(data.products.find((item) => item.track_weight)?.id || null);
  const [scaleWeight, setScaleWeight] = useState("1");
  const [settings, setSettings] = useState({
    name: data.organization.name,
    phone: data.organization.phone || "",
    address: data.organization.address || "",
    tax_number: data.organization.tax_number || "",
    default_currency: data.organization.default_currency,
    exchange_rate: String(data.organization.exchange_rate),
    invoice_size: data.organization.invoice_size,
    invoice_header: data.organization.invoice_header || "",
    invoice_footer: data.organization.invoice_footer || "",
    theme_color: data.organization.theme_color,
    scale_prefix: data.organization.scale_prefix,
    scale_product_digits: String(data.organization.scale_product_digits),
    scale_weight_digits: String(data.organization.scale_weight_digits),
    scale_weight_decimals: String(data.organization.scale_weight_decimals),
  });
  const canManage = ["owner", "admin"].includes(data.profile.role);

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await store.saveOrganization({ name: settings.name, phone: settings.phone || null, address: settings.address || null, tax_number: settings.tax_number || null, default_currency: settings.default_currency, exchange_rate: Number(settings.exchange_rate) || 1, invoice_size: settings.invoice_size, invoice_header: settings.invoice_header || null, invoice_footer: settings.invoice_footer, theme_color: settings.theme_color, scale_prefix: settings.scale_prefix.replace(/\D/g, ""), scale_product_digits: Number(settings.scale_product_digits), scale_weight_digits: Number(settings.scale_weight_digits), scale_weight_decimals: Number(settings.scale_weight_decimals) }); notify("تم حفظ الإعدادات"); }
    catch (saveError) { notify(saveError instanceof Error ? saveError.message : "تعذر حفظ الإعدادات", "error"); }
    finally { setBusy(false); }
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ version: 1, exported_at: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `nerosa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    notify("تم تنزيل النسخة الاحتياطية");
  }
  async function importBackup(file: File) {
    try { const parsed = JSON.parse(await file.text()) as { data?: SuiteData }; if (!parsed.data) throw new Error("ملف النسخة غير صحيح"); store.restoreDemo(parsed.data); notify("تم استرجاع النسخة الاحتياطية"); }
    catch (importError) { notify(importError instanceof Error ? importError.message : "تعذر استرجاع النسخة", "error"); }
  }
  async function reset() {
    setBusy(true);
    try { await store.resetSystem(resetText); setResetText(""); notify("تم تصفير بيانات النظام"); }
    catch (resetError) { notify(resetError instanceof Error ? resetError.message : "تعذر التصفير", "error"); }
    finally { setBusy(false); }
  }
  function printScaleLabel() {
    const product = data.products.find((item) => item.id === scaleProductId);
    if (!product) return notify("اختر منتجاً موزوناً", "error");
    const barcode = makeScaleBarcode(product, Number(scaleWeight), data.organization);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, barcode, { format: "EAN13", displayValue: true, height: 60 });
    const popup = window.open("", "_blank", "width=420,height=500");
    if (!popup) return;
    popup.document.write(`<html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>body{text-align:center;font-family:Arial;padding:20px}svg{max-width:100%}</style></head><body><h2>${product.name}</h2><p>الوزن: ${scaleWeight} كغم</p>${svg.outerHTML}<p>${formatMoney(Number(product.retail_price) * Number(scaleWeight), product.currency)}</p><script>window.onload=()=>window.print()</script></body></html>`); popup.document.close();
  }

  return <div className="section-stack settings-stack">
    {!canManage && <div className="page-alert">تعديل الإعدادات متاح للمالك والمدير فقط.</div>}
    <form className="panel settings-panel" onSubmit={save}><SectionTitle title="بيانات الشركة والفاتورة" subtitle="تظهر هذه المعلومات على فواتير العملاء" /><div className="form-grid suite-form"><Field label="اسم الشركة" full><input required disabled={!canManage} value={settings.name} onChange={(event) => setSettings({ ...settings, name: event.target.value })} /></Field><Field label="الهاتف"><input disabled={!canManage} value={settings.phone} onChange={(event) => setSettings({ ...settings, phone: event.target.value })} /></Field><Field label="الرقم الضريبي"><input disabled={!canManage} value={settings.tax_number} onChange={(event) => setSettings({ ...settings, tax_number: event.target.value })} /></Field><Field label="العنوان" full><input disabled={!canManage} value={settings.address} onChange={(event) => setSettings({ ...settings, address: event.target.value })} /></Field><Field label="عنوان الفاتورة"><input disabled={!canManage} value={settings.invoice_header} onChange={(event) => setSettings({ ...settings, invoice_header: event.target.value })} /></Field><Field label="ذيل الفاتورة"><input disabled={!canManage} value={settings.invoice_footer} onChange={(event) => setSettings({ ...settings, invoice_footer: event.target.value })} /></Field><Field label="حجم الفاتورة"><select disabled={!canManage} value={settings.invoice_size} onChange={(event) => setSettings({ ...settings, invoice_size: event.target.value as "80mm" | "A4" })}><option value="80mm">حرارية 80mm</option><option value="A4">ورق A4</option></select></Field><Field label="لون البرنامج"><input disabled={!canManage} type="color" value={settings.theme_color} onChange={(event) => setSettings({ ...settings, theme_color: event.target.value })} /></Field></div></form>
    <form className="panel settings-panel" onSubmit={save}><SectionTitle title="العملة وسعر الصرف" /><div className="form-grid suite-form"><Field label="العملة الأساسية"><select disabled={!canManage} value={settings.default_currency} onChange={(event) => setSettings({ ...settings, default_currency: event.target.value as Currency })}><option value="IQD">الدينار العراقي</option><option value="USD">الدولار الأمريكي</option></select></Field><Field label="سعر الدولار بالدينار"><input disabled={!canManage} inputMode="decimal" value={settings.exchange_rate} onChange={(event) => setSettings({ ...settings, exchange_rate: event.target.value })} /></Field></div></form>
    <form className="panel settings-panel" onSubmit={save}><SectionTitle title="إعدادات الميزان" subtitle="تكوين وقراءة باركود المنتج حسب الوزن" /><div className="form-grid suite-form"><Field label="بادئة الميزان"><input disabled={!canManage} inputMode="numeric" value={settings.scale_prefix} onChange={(event) => setSettings({ ...settings, scale_prefix: event.target.value.replace(/\D/g, "") })} /></Field><Field label="خانات رمز المنتج"><input disabled={!canManage} type="number" min="3" max="7" value={settings.scale_product_digits} onChange={(event) => setSettings({ ...settings, scale_product_digits: event.target.value })} /></Field><Field label="خانات الوزن"><input disabled={!canManage} type="number" min="3" max="7" value={settings.scale_weight_digits} onChange={(event) => setSettings({ ...settings, scale_weight_digits: event.target.value })} /></Field><Field label="الكسور العشرية"><input disabled={!canManage} type="number" min="0" max="4" value={settings.scale_weight_decimals} onChange={(event) => setSettings({ ...settings, scale_weight_decimals: event.target.value })} /></Field></div><div className="scale-test"><select value={scaleProductId || ""} onChange={(event) => setScaleProductId(Number(event.target.value) || null)}><option value="">اختر منتجاً موزوناً</option>{data.products.filter((item) => item.track_weight).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input inputMode="decimal" value={scaleWeight} onChange={(event) => setScaleWeight(event.target.value)} placeholder="الوزن" /><button type="button" className="secondary-button" onClick={printScaleLabel}>تكوين وطباعة الباركود</button></div></form>
    {canManage && <button className="primary-button save-all" onClick={(event) => void save(event as unknown as FormEvent)}>حفظ جميع الإعدادات</button>}
    <section className="panel settings-panel"><SectionTitle title="النسخة الاحتياطية" subtitle="نزّل نسخة من بياناتك واحتفظ بها بمكان آمن" /><div className="backup-actions"><button className="secondary-button" onClick={exportBackup}>تنزيل نسخة احتياطية JSON</button><input ref={fileRef} hidden type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && void importBackup(event.target.files[0])} /><button className="secondary-button" disabled={!store.isDemo} onClick={() => fileRef.current?.click()}>استرجاع نسخة</button>{store.isDemo && <button className="secondary-button" onClick={store.resetDemoSample}>إرجاع بيانات التجربة</button>}</div>{!store.isDemo && <p className="settings-note">قاعدة Supabase توفر نسخاً احتياطية إضافية من لوحة المشروع. الاسترجاع اليدوي من الملف متاح في النسخة التجريبية فقط لحماية قاعدة الإنتاج.</p>}</section>
    {canManage && <section className="panel danger-zone"><SectionTitle title="تصفير النظام" subtitle="يمسح المبيعات والمخزون والعملاء والموظفين ولا يمكن التراجع عنه" /><div><input value={resetText} onChange={(event) => setResetText(event.target.value)} placeholder="اكتب كلمة: تصفير" /><button disabled={busy || resetText !== "تصفير"} onClick={() => void reset()}>تصفير جميع البيانات</button></div></section>}
  </div>;
}
