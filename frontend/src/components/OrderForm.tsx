import { Loader2, Plus, Trash2, UserCheck } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { customersApi, productsApi } from "../api";
import { ApiError, errorMessage } from "../api/client";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { formatMoney, normalizePhone } from "../lib/format";
import {
  parseNumber,
  validateMoney,
  validatePhone,
  validatePositiveInt,
  validateRequired,
  type FieldErrors,
} from "../lib/validation";
import type { Customer, Order, OrderInput, Product } from "../types";
import { ErrorAlert } from "./ui/ErrorAlert";
import { Field, inputClass } from "./ui/Field";

const CUSTOM_PRODUCT = "custom";

interface ItemDraft {
  key: number;
  productId: string; // "" | "custom" | id del producto
  name: string;
  quantity: string;
  unitPrice: string;
}

interface CustomerDraft {
  name: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
}

interface Props {
  initial?: Order;
  submitLabel: string;
  onSubmit: (data: OrderInput) => Promise<void>;
}

let nextKey = 1;
const emptyItem = (): ItemDraft => ({ key: nextKey++, productId: "", name: "", quantity: "1", unitPrice: "" });

function initialItems(order?: Order): ItemDraft[] {
  if (!order) return [emptyItem()];
  return order.items.map((i) => ({
    key: nextKey++,
    productId: i.product_id ? String(i.product_id) : CUSTOM_PRODUCT,
    name: i.product_name,
    quantity: String(i.quantity),
    unitPrice: String(i.unit_price),
  }));
}

function lineSubtotal(item: ItemDraft): number {
  const qty = parseNumber(item.quantity);
  const price = parseNumber(item.unitPrice);
  return qty && price && qty > 0 && price >= 0 ? qty * price : 0;
}

export function OrderForm({ initial, submitLabel, onSubmit }: Props) {
  const { payment_methods } = useMeta();
  const { data: allProducts, error: productsError } = useAsync(() => productsApi.list(), []);

  const [customer, setCustomer] = useState<CustomerDraft>({
    name: initial?.customer.name ?? "",
    phone: initial?.customer.phone ?? "",
    address: initial?.shipping_address ?? "",
    city: initial?.shipping_city ?? "",
    notes: initial?.customer.notes ?? "",
  });
  const [items, setItems] = useState<ItemDraft[]>(() => initialItems(initial));
  const [paymentMethod, setPaymentMethod] = useState(initial?.payment_method ?? "");
  const [shippingCost, setShippingCost] = useState(initial ? String(initial.shipping_cost) : "0");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Productos activos + los inactivos que ya estaban en el pedido (al editar).
  const productOptions = useMemo(() => {
    const usedIds = new Set(initial?.items.map((i) => i.product_id));
    return (allProducts ?? []).filter((p) => p.active || usedIds.has(p.id));
  }, [allProducts, initial]);
  const productsById = useMemo(
    () => new Map<number, Product>((allProducts ?? []).map((p) => [p.id, p])),
    [allProducts],
  );

  const subtotal = items.reduce((sum, i) => sum + lineSubtotal(i), 0);
  const shipping = Math.max(parseNumber(shippingCost) ?? 0, 0);
  const total = subtotal + shipping;

  const setCustomerField = (key: keyof CustomerDraft, value: string) =>
    setCustomer((c) => ({ ...c, [key]: value }));

  function updateItem(key: number, patch: Partial<ItemDraft>) {
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function selectProduct(key: number, productId: string) {
    const product = productsById.get(Number(productId));
    if (product) updateItem(key, { productId, name: product.name, unitPrice: String(product.price) });
    else updateItem(key, { productId, name: "", unitPrice: "" });
  }

  async function lookupCustomer() {
    const phone = normalizePhone(customer.phone);
    if (phone.replace("+", "").length < 7 || phone === initial?.customer.phone) {
      setExistingCustomer(null);
      return;
    }
    const found = await customersApi.search(phone).catch(() => [] as Customer[]);
    const match = found.find((c) => c.phone === phone) ?? null;
    const alreadyFilled = match && match.name === customer.name.trim() && match.address === customer.address.trim();
    setExistingCustomer(alreadyFilled ? null : match);
  }

  function applyExistingCustomer(c: Customer) {
    setCustomer({ name: c.name, phone: c.phone, address: c.address, city: c.city ?? "", notes: c.notes ?? "" });
    setExistingCustomer(null);
  }

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    validateRequired(errs, "customer.name", customer.name);
    validatePhone(errs, "customer.phone", customer.phone);
    validateRequired(errs, "customer.address", customer.address);
    items.forEach((item, i) => {
      if (!item.productId) errs[`items.${i}`] = "Selecciona un producto";
      else if (item.productId === CUSTOM_PRODUCT && !item.name.trim()) errs[`items.${i}`] = "Escribe el nombre del producto";
      validatePositiveInt(errs, `items.${i}.quantity`, item.quantity);
      validateMoney(errs, `items.${i}.unit_price`, item.unitPrice);
    });
    if (!paymentMethod) errs.payment_method = "Selecciona un método de pago";
    validateMoney(errs, "shipping_cost", shippingCost);
    return errs;
  }

  function buildPayload(): OrderInput {
    return {
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        city: customer.city.trim() || null,
        notes: customer.notes.trim() || null,
      },
      items: items.map((item) => ({
        product_id: item.productId === CUSTOM_PRODUCT ? null : Number(item.productId),
        product_name: item.name.trim() || null,
        quantity: parseNumber(item.quantity)!,
        unit_price: parseNumber(item.unitPrice)!,
      })),
      payment_method: paymentMethod,
      shipping_cost: parseNumber(shippingCost) ?? 0,
      notes: notes.trim() || null,
    };
  }

  function focusFirstError() {
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) {
      setFormError("Revisa los campos marcados en rojo.");
      focusFirstError();
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(buildPayload());
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors);
      setFormError(errorMessage(err));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  const err = (key: string) => errors[key];
  const invalid = (key: string) => (errors[key] ? true : undefined);

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {formError && <ErrorAlert message={formError} />}

        <section className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Cliente</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Celular" htmlFor="c-phone" required error={err("customer.phone")}>
              <input id="c-phone" type="tel" inputMode="tel" autoComplete="off" placeholder="300 123 4567" aria-invalid={invalid("customer.phone")} className={inputClass(err("customer.phone"))} value={customer.phone} onChange={(e) => setCustomerField("phone", e.target.value)} onBlur={lookupCustomer} />
            </Field>
            <Field label="Nombre completo" htmlFor="c-name" required error={err("customer.name")}>
              <input id="c-name" autoComplete="off" aria-invalid={invalid("customer.name")} className={inputClass(err("customer.name"))} value={customer.name} onChange={(e) => setCustomerField("name", e.target.value)} />
            </Field>
            {existingCustomer && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800 sm:col-span-2">
                <UserCheck className="size-4 shrink-0" />
                <p className="flex-1">
                  Cliente registrado: <strong>{existingCustomer.name}</strong> · {existingCustomer.address}
                </p>
                <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => applyExistingCustomer(existingCustomer)}>
                  Usar sus datos
                </button>
              </div>
            )}
            <Field label="Dirección" htmlFor="c-address" required error={err("customer.address")} className="sm:col-span-2">
              <input id="c-address" autoComplete="off" aria-invalid={invalid("customer.address")} className={inputClass(err("customer.address"))} value={customer.address} onChange={(e) => setCustomerField("address", e.target.value)} />
            </Field>
            <Field label="Ciudad" htmlFor="c-city" error={err("customer.city")}>
              <input id="c-city" autoComplete="off" className={inputClass(err("customer.city"))} value={customer.city} onChange={(e) => setCustomerField("city", e.target.value)} />
            </Field>
            <Field label="Observaciones del cliente" htmlFor="c-notes" error={err("customer.notes")} hint="Ej.: llamar antes de entregar">
              <input id="c-notes" autoComplete="off" className={inputClass(err("customer.notes"))} value={customer.notes} onChange={(e) => setCustomerField("notes", e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Productos</h2>
          {productsError && <div className="mb-4"><ErrorAlert message={productsError} /></div>}
          <div className="space-y-4">
            {items.map((item, i) => {
              const product = productsById.get(Number(item.productId));
              const priceChanged = product && parseNumber(item.unitPrice) !== product.price;
              const productError = err(`items.${i}`) ?? err(`items.${i}.product_name`) ?? err(`items.${i}.product_id`);
              return (
                <div key={item.key} className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_90px_140px_auto]">
                  <div className="col-span-2 space-y-2 sm:col-span-1">
                    <Field label="Producto" htmlFor={`i-product-${item.key}`} required error={productError}>
                      <select id={`i-product-${item.key}`} aria-invalid={productError ? true : undefined} className={inputClass(productError)} value={item.productId} onChange={(e) => selectProduct(item.key, e.target.value)}>
                        <option value="">{allProducts ? "Selecciona un producto…" : "Cargando productos…"}</option>
                        {productOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {formatMoney(p.price)}{p.active ? "" : " (inactivo)"}
                          </option>
                        ))}
                        <option value={CUSTOM_PRODUCT}>Otro producto (escribir nombre)</option>
                      </select>
                    </Field>
                    {item.productId === CUSTOM_PRODUCT && (
                      <input aria-label="Nombre del producto" placeholder="Nombre del producto" className={inputClass(productError)} value={item.name} onChange={(e) => updateItem(item.key, { name: e.target.value })} />
                    )}
                  </div>
                  <Field label="Cantidad" htmlFor={`i-qty-${item.key}`} required error={err(`items.${i}.quantity`)}>
                    <input id={`i-qty-${item.key}`} type="number" min={1} step={1} inputMode="numeric" aria-invalid={invalid(`items.${i}.quantity`)} className={inputClass(err(`items.${i}.quantity`))} value={item.quantity} onChange={(e) => updateItem(item.key, { quantity: e.target.value })} />
                  </Field>
                  <Field
                    label="Precio unitario"
                    htmlFor={`i-price-${item.key}`}
                    required
                    error={err(`items.${i}.unit_price`)}
                    hint={priceChanged ? `Catálogo: ${formatMoney(product.price)}` : undefined}
                  >
                    <input id={`i-price-${item.key}`} type="number" min={0} step="any" inputMode="decimal" aria-invalid={invalid(`items.${i}.unit_price`)} className={inputClass(err(`items.${i}.unit_price`))} value={item.unitPrice} onChange={(e) => updateItem(item.key, { unitPrice: e.target.value })} />
                  </Field>
                  <div className="col-span-2 flex items-end justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end sm:justify-between">
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1.5 text-slate-400 hover:text-red-600"
                      onClick={() => setItems((list) => list.filter((x) => x.key !== item.key))}
                      disabled={items.length === 1}
                      title="Quitar producto"
                    >
                      <Trash2 className="size-4" /><span className="sr-only">Quitar producto</span>
                    </button>
                    <p className="pb-2 text-sm font-medium whitespace-nowrap text-slate-700">{formatMoney(lineSubtotal(item))}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="btn-secondary mt-4" onClick={() => setItems((list) => [...list, emptyItem()])}>
            <Plus className="size-4" /> Agregar otro producto
          </button>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Pago y envío</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Método de pago" htmlFor="o-payment" required error={err("payment_method")}>
              <select id="o-payment" aria-invalid={invalid("payment_method")} className={inputClass(err("payment_method"))} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="">Selecciona…</option>
                {payment_methods.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Costo de envío" htmlFor="o-shipping" error={err("shipping_cost")}>
              <input id="o-shipping" type="number" min={0} step="any" inputMode="decimal" aria-invalid={invalid("shipping_cost")} className={inputClass(err("shipping_cost"))} value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
            </Field>
            <Field label="Observaciones del pedido" htmlFor="o-notes" error={err("notes")} className="sm:col-span-2">
              <textarea id="o-notes" rows={2} className={inputClass(err("notes"))} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Resumen</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium">{formatMoney(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Envío</dt><dd className="font-medium">{formatMoney(shipping)}</dd></div>
            <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-semibold text-slate-900">{formatMoney(total)}</dd>
            </div>
          </dl>
          <button type="submit" className="btn-primary mt-5 w-full" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </aside>
    </form>
  );
}
