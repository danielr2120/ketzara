import { Loader2, Minus, Plus } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { publicApi } from "../api";
import { ApiError, errorMessage } from "../api/client";
import { PublicLayout } from "../components/PublicLayout";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Field, inputClass } from "../components/ui/Field";
import { Loading } from "../components/ui/Loading";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { formatMoney } from "../lib/format";
import { validatePhone, validateRequired, type FieldErrors } from "../lib/validation";
import type { PublicOrderInput, PublicProduct } from "../types";

const MAX_QUANTITY = 1000;

interface CustomerDraft {
  name: string;
  phone: string;
  address: string;
  city: string;
}

function QuantityStepper({ product, value, onChange }: { product: PublicProduct; value: number; onChange: (n: number) => void }) {
  const set = (n: number) => onChange(Math.min(Math.max(Math.trunc(n) || 0, 0), MAX_QUANTITY));
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="btn-secondary size-9 p-0" onClick={() => set(value - 1)} disabled={value === 0} aria-label={`Quitar una unidad de ${product.name}`}>
        <Minus className="size-4" />
      </button>
      <input
        type="number"
        min={0}
        max={MAX_QUANTITY}
        inputMode="numeric"
        aria-label={`Cantidad de ${product.name}`}
        className="input w-16 text-center"
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" className="btn-secondary size-9 p-0" onClick={() => set(value + 1)} aria-label={`Agregar una unidad de ${product.name}`}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/** Página para que el cliente arme y envíe su pedido sin intervención del negocio. */
export function PublicOrderPage() {
  const navigate = useNavigate();
  const { payment_methods } = useMeta();
  const { data: products, error: productsError, loading, reload } = useAsync(() => publicApi.products(), []);

  const [cart, setCart] = useState<Record<number, number>>({});
  const [customer, setCustomer] = useState<CustomerDraft>({ name: "", phone: "", address: "", city: "" });
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const selected = (products ?? []).filter((p) => (cart[p.id] ?? 0) > 0);
  const total = selected.reduce((sum, p) => sum + p.price * cart[p.id], 0);

  const setCustomerField = (key: keyof CustomerDraft, value: string) => setCustomer((c) => ({ ...c, [key]: value }));
  const setQuantity = (id: number, quantity: number) => setCart((c) => ({ ...c, [id]: quantity }));

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!selected.length) errs.items = "Agrega al menos un producto a tu pedido";
    validateRequired(errs, "customer.name", customer.name);
    validatePhone(errs, "customer.phone", customer.phone);
    validateRequired(errs, "customer.address", customer.address);
    if (!paymentMethod) errs.payment_method = "Selecciona un método de pago";
    return errs;
  }

  function buildPayload(): PublicOrderInput {
    return {
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        city: customer.city.trim() || null,
        notes: null,
      },
      items: selected.map((p) => ({ product_id: p.id, quantity: cart[p.id] })),
      payment_method: paymentMethod,
      notes: notes.trim() || null,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) {
      setFormError("Revisa los campos marcados en rojo.");
      requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setSubmitting(true);
    try {
      const order = await publicApi.createOrder(buildPayload());
      navigate(`/seguimiento/${order.tracking_code}`, { state: { created: true } });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors);
      setFormError(errorMessage(err));
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSubmitting(false);
    }
  }

  const err = (key: string) => errors[key];
  const invalid = (key: string) => (errors[key] ? true : undefined);

  return (
    <PublicLayout className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Haz tu pedido</h1>
        <p className="text-sm text-slate-500">Elige tus productos, déjanos tus datos y te contactaremos para confirmar el envío.</p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {formError && <ErrorAlert message={formError} />}

          <section className="card p-5" data-error={err("items") ? true : undefined}>
            <h2 className="mb-4 text-base font-semibold text-slate-900">Productos</h2>
            {err("items") && <p className="field-error mb-3">{err("items")}</p>}
            {loading && !products ? (
              <Loading />
            ) : productsError ? (
              <ErrorAlert message={productsError} onRetry={reload} />
            ) : !products?.length ? (
              <EmptyState title="No hay productos disponibles en este momento" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {products.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      {p.description && <p className="text-sm text-slate-500">{p.description}</p>}
                      <p className="text-sm font-semibold text-indigo-700">{formatMoney(p.price)}</p>
                    </div>
                    <QuantityStepper product={p} value={cart[p.id] ?? 0} onChange={(n) => setQuantity(p.id, n)} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Tus datos</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre completo" htmlFor="c-name" required error={err("customer.name")}>
                <input id="c-name" autoComplete="name" aria-invalid={invalid("customer.name")} className={inputClass(err("customer.name"))} value={customer.name} onChange={(e) => setCustomerField("name", e.target.value)} />
              </Field>
              <Field label="Celular" htmlFor="c-phone" required error={err("customer.phone")}>
                <input id="c-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="300 123 4567" aria-invalid={invalid("customer.phone")} className={inputClass(err("customer.phone"))} value={customer.phone} onChange={(e) => setCustomerField("phone", e.target.value)} />
              </Field>
              <Field label="Dirección de entrega" htmlFor="c-address" required error={err("customer.address")} className="sm:col-span-2">
                <input id="c-address" autoComplete="street-address" aria-invalid={invalid("customer.address")} className={inputClass(err("customer.address"))} value={customer.address} onChange={(e) => setCustomerField("address", e.target.value)} />
              </Field>
              <Field label="Ciudad" htmlFor="c-city" error={err("customer.city")}>
                <input id="c-city" autoComplete="address-level2" className={inputClass(err("customer.city"))} value={customer.city} onChange={(e) => setCustomerField("city", e.target.value)} />
              </Field>
              <Field label="Método de pago" htmlFor="o-payment" required error={err("payment_method")}>
                <select id="o-payment" aria-invalid={invalid("payment_method")} className={inputClass(err("payment_method"))} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="">Selecciona…</option>
                  {payment_methods.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Indicaciones para la entrega" htmlFor="o-notes" error={err("notes")} hint="Ej.: apartamento, punto de referencia, horario" className="sm:col-span-2">
                <textarea id="o-notes" rows={2} className={inputClass(err("notes"))} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="card p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Tu pedido</h2>
            {selected.length ? (
              <ul className="mb-4 space-y-2 text-sm">
                {selected.map((p) => (
                  <li key={p.id} className="flex justify-between gap-4">
                    <span>
                      {p.name} <span className="text-slate-500">× {cart[p.id]}</span>
                    </span>
                    <span className="font-medium whitespace-nowrap">{formatMoney(p.price * cart[p.id])}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-slate-500">Aún no has agregado productos.</p>
            )}
            <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-semibold text-slate-900">{formatMoney(total)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">El costo de envío, si aplica, se confirma contigo.</p>
            <button type="submit" className="btn-primary mt-5 w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Enviar pedido
            </button>
          </div>
        </aside>
      </form>
    </PublicLayout>
  );
}
