import type { Currency, Organization, Product } from "./suite-types";

export function formatMoney(value: number, currency: Currency = "IQD") {
  const amount = Number(value) || 0;
  return `${new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: currency === "IQD" ? 0 : 2 }).format(amount)} ${currency === "IQD" ? "د.ع" : "$"}`;
}

export function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-IQ", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function roleLabel(role: string) {
  return ({ owner: "المالك", admin: "مدير", manager: "مشرف", cashier: "كاشير", accountant: "محاسب" } as Record<string, string>)[role] || role;
}

export function saleTypeLabel(type: string) {
  return ({ retail: "مفرد", wholesale: "جملة", credit: "آجل", installment: "قسط" } as Record<string, string>)[type] || type;
}

export function toBaseCurrency(amount: number, currency: Currency, organization: Organization) {
  return currency === organization.default_currency
    ? amount
    : currency === "USD"
      ? amount * Number(organization.exchange_rate)
      : amount / Number(organization.exchange_rate);
}

function ean13CheckDigit(firstTwelve: string) {
  const total = firstTwelve.split("").reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (total % 10)) % 10);
}

export function makeScaleBarcode(product: Product, weight: number, organization: Organization) {
  const prefix = organization.scale_prefix.replace(/\D/g, "");
  const productCode = String(product.scale_product_code || product.id).replace(/\D/g, "").padStart(organization.scale_product_digits, "0").slice(-organization.scale_product_digits);
  const weightInteger = Math.round(weight * 10 ** organization.scale_weight_decimals);
  const weightCode = String(weightInteger).padStart(organization.scale_weight_digits, "0").slice(-organization.scale_weight_digits);
  const body = `${prefix}${productCode}${weightCode}`.slice(0, 12).padEnd(12, "0");
  return body + ean13CheckDigit(body);
}

export function parseScaleBarcode(value: string, products: Product[], organization: Organization) {
  const prefix = organization.scale_prefix;
  if (!value.startsWith(prefix) || value.length < prefix.length + organization.scale_product_digits + organization.scale_weight_digits) return null;
  const productStart = prefix.length;
  const weightStart = productStart + organization.scale_product_digits;
  const productCode = value.slice(productStart, weightStart);
  const weightCode = value.slice(weightStart, weightStart + organization.scale_weight_digits);
  const product = products.find((item) => item.track_weight && String(item.scale_product_code || item.id).padStart(organization.scale_product_digits, "0").slice(-organization.scale_product_digits) === productCode);
  if (!product) return null;
  return { product, weight: Number(weightCode) / 10 ** organization.scale_weight_decimals };
}

