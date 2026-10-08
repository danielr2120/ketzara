import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { productsApi } from "../api";
import { ApiError, errorMessage } from "../api/client";
import { parseNumber, validateMoney, validateRequired, type FieldErrors } from "../lib/validation";
import type { Product } from "../types";
import { ErrorAlert } from "./ui/ErrorAlert";
import { Field, inputClass } from "./ui/Field";
import { Modal } from "./ui/Modal";

interface Props {
  product: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

export function ProductFormModal({ product, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    stock: product?.stock != null ? String(product.stock) : "",
    active: product?.active ?? true,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    validateRequired(errs, "name", form.name);
    validateMoney(errs, "price", form.price);
    if (form.stock.trim()) {
      const stock = parseNumber(form.stock);
      if (stock === null || !Number.isInteger(stock) || stock < 0) errs.stock = "Debe ser un número entero mayor o igual a 0";
    }
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;

    const data = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseNumber(form.price)!,
      stock: form.stock.trim() ? parseNumber(form.stock) : null,
      active: form.active,
    };
    setSaving(true);
    try {
      const saved = product ? await productsApi.update(product.id, data) : await productsApi.create(data);
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors);
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={product ? "Editar producto" : "Nuevo producto"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" form="product-form" className="btn-primary" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Guardar
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && <ErrorAlert message={formError} />}
        <Field label="Nombre" htmlFor="p-name" required error={errors.name}>
          <input id="p-name" className={inputClass(errors.name)} value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        </Field>
        <Field label="Descripción" htmlFor="p-desc" error={errors.description}>
          <textarea id="p-desc" rows={2} className={inputClass(errors.description)} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Precio" htmlFor="p-price" required error={errors.price}>
            <input id="p-price" type="number" min={0} step="any" inputMode="decimal" className={inputClass(errors.price)} value={form.price} onChange={(e) => set("price", e.target.value)} />
          </Field>
          <Field label="Stock" htmlFor="p-stock" error={errors.stock} hint="Opcional">
            <input id="p-stock" type="number" min={0} step={1} inputMode="numeric" className={inputClass(errors.stock)} value={form.stock} onChange={(e) => set("stock", e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="size-4 rounded border-slate-300 accent-indigo-600" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
          Producto activo (disponible para nuevos pedidos)
        </label>
      </form>
    </Modal>
  );
}
