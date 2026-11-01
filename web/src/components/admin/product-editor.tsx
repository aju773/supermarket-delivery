"use client";

import { ArrowDownIcon, ArrowLeftIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import type { Category } from "@/components/admin/categories";
import { FormError } from "@/components/admin/form-error";
import { inputClass } from "@/components/admin/password-input";
import { SettingsCard } from "@/components/admin/settings-card";
import { Switch } from "@/components/admin/switch";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { adminSend, errorBody, type FieldErrors } from "@/lib/admin-api";
import { paiseToRupees, rupeesToPaise } from "@/lib/format";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

/** One Pack Option row while editing; `key` keeps React rows stable as rows move, `price` is the typed rupees. */
type OptionRow = { key: number; id: number | null; code: string; label: string; price: string; in_stock: boolean };

let nextKey = 0;

function blankRow(): OptionRow {
  return { key: nextKey++, id: null, code: "", label: "", price: "", in_stock: true };
}

/** Add or edit a Product with its Pack Options. Removing a Pack Option hides it on save; nothing is deleted. */
export function ProductEditor({ product, categories }: { product: Product | null; categories: Category[] }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product ? String(product.category.id) : "");
  const [featured, setFeatured] = useState(product?.is_featured ?? false);
  const [visible, setVisible] = useState(product?.is_visible ?? true);
  const [rows, setRows] = useState<OptionRow[]>(() =>
    product
      ? product.pack_options.map((option) => ({
          key: nextKey++,
          id: option.id,
          code: option.code,
          label: option.label,
          price: paiseToRupees(option.price_paise),
          in_stock: option.in_stock,
        }))
      : [blankRow()],
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  function changeRow(key: number, change: Partial<OptionRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));
  }

  function move(index: number, by: -1 | 1) {
    setRows((current) => {
      const reordered = [...current];
      [reordered[index], reordered[index + by]] = [reordered[index + by], reordered[index]];
      return reordered;
    });
    setFieldErrors({});
  }

  function remove(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
    setFieldErrors({});
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const localErrors: FieldErrors = {};
    const prices = rows.map((row) => rupeesToPaise(row.price));
    prices.forEach((price, index) => {
      if (Number.isNaN(price)) localErrors[`pack_options.${index}.price_paise`] = "Enter a price in rupees, like 20 or 38.50.";
    });
    if (!categoryId) localErrors.category_id = "Choose a category.";
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      setError("Please fix the errors below.");
      return;
    }

    setPending(true);
    setError(null);
    setFieldErrors({});
    const response = await adminSend(product ? "PUT" : "POST", product ? `/products/${product.id}` : "/products", {
      name,
      category_id: Number(categoryId),
      is_featured: featured,
      is_visible: visible,
      pack_options: rows.map((row, index) => ({
        id: row.id,
        code: row.code,
        label: row.label,
        price_paise: prices[index],
        in_stock: row.in_stock,
      })),
    });
    setPending(false);
    if (!response.ok) {
      const body = await errorBody(response);
      setError(body.detail);
      setFieldErrors(body.errors);
      return;
    }
    toast(product ? "Product saved" : "Product added");
    router.push("/admin/products");
    router.refresh();
  }

  const title = product ? product.name : "Add product";

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-settings flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/products" aria-label="Back to products">
              <ArrowLeftIcon aria-hidden className="size-5" />
            </Link>
          </Button>
          <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/products">Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            Save
          </Button>
        </div>
      </div>
      <FormError message={error} />

      <SettingsCard title="Product details">
        <Field id="name" label="Product name" error={fieldErrors.name}>
          <input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            className={inputClass}
          />
        </Field>
        <Field id="category_id" label="Category" error={fieldErrors.category_id}>
          <select
            id="category_id"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            aria-invalid={fieldErrors.category_id ? true : undefined}
            aria-describedby={fieldErrors.category_id ? "category_id-error" : undefined}
            className={inputClass}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.is_visible ? "" : " (hidden)"}
              </option>
            ))}
          </select>
        </Field>
      </SettingsCard>

      <SettingsCard title="Pack options">
        {fieldErrors.pack_options && <p className="text-error-foreground">{fieldErrors.pack_options}</p>}
        <ol className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const errorOf = (field: string) => fieldErrors[`pack_options.${index}.${field}`];
            const rowErrors = ["label", "code", "price_paise"].map(errorOf).filter(Boolean);
            const errorId = `pack-option-${row.key}-error`;
            const number = index + 1;
            return (
              <li
                key={row.key}
                aria-label={`Pack option ${number}`}
                className={cn(
                  "flex flex-col gap-2 rounded-md border-hairline p-3",
                  rowErrors.length ? "border-error-border bg-error" : "border-border",
                )}
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <SmallField label="Pack label">
                    <input
                      value={row.label}
                      placeholder="e.g. 500 g"
                      onChange={(event) => changeRow(row.key, { label: event.target.value })}
                      aria-label={`Pack label ${number}`}
                      aria-invalid={errorOf("label") ? true : undefined}
                      aria-describedby={errorOf("label") ? errorId : undefined}
                      className={inputClass}
                    />
                  </SmallField>
                  <SmallField label="Code">
                    <input
                      value={row.code}
                      onChange={(event) => changeRow(row.key, { code: event.target.value })}
                      aria-label={`Code ${number}`}
                      aria-invalid={errorOf("code") ? true : undefined}
                      aria-describedby={errorOf("code") ? errorId : undefined}
                      className={cn(inputClass, "font-mono text-sm")}
                    />
                  </SmallField>
                  <SmallField label="Price (₹)">
                    <div className="relative">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
                      >
                        ₹
                      </span>
                      <input
                        value={row.price}
                        inputMode="decimal"
                        onChange={(event) => changeRow(row.key, { price: event.target.value })}
                        aria-label={`Price ${number} (₹)`}
                        aria-invalid={errorOf("price_paise") ? true : undefined}
                        aria-describedby={errorOf("price_paise") ? errorId : undefined}
                        className={cn(inputClass, "pl-8")}
                      />
                    </div>
                  </SmallField>
                  <SmallField label="In stock">
                    <span className="flex items-center">
                      <Switch
                        label={`Pack option ${number} in stock`}
                        checked={row.in_stock}
                        disabled={pending}
                        onChange={(inStock) => changeRow(row.key, { in_stock: inStock })}
                      />
                    </span>
                  </SmallField>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {rowErrors.length > 0 ? (
                    <p id={errorId} className="text-sm text-error-foreground">
                      {rowErrors.join(" ")}
                    </p>
                  ) : (
                    <span />
                  )}
                  <div className="flex shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move pack option ${number} up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUpIcon aria-hidden className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move pack option ${number} down`}
                      disabled={index === rows.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDownIcon aria-hidden className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove pack option ${number}`}
                      disabled={rows.length === 1}
                      onClick={() => remove(row.key)}
                    >
                      <TrashIcon aria-hidden className="size-4" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-muted-foreground">Removed pack options are hidden from customers, not deleted.</p>
        <div>
          <Button type="button" variant="ghost" onClick={() => setRows((current) => [...current, blankRow()])}>
            <PlusIcon aria-hidden className="size-4" />
            Add pack option
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title="Visibility">
        <Toggle
          title="Featured on home page"
          hint="Shows in the Popular row on the home page."
          checked={featured}
          disabled={pending}
          onChange={setFeatured}
        />
        <Toggle
          title="Hidden from customers"
          hint="Hidden products don't appear on the customer site. Nothing is deleted."
          checked={!visible}
          disabled={pending}
          onChange={(hidden) => setVisible(!hidden)}
        />
      </SettingsCard>
    </form>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-error-foreground">
          {error}
        </p>
      )}
    </div>
  );
}

/** A column heading above a pack option input; the input carries its own numbered aria-label. */
function SmallField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span aria-hidden className="text-xs text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function Toggle({
  title,
  hint,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <Switch label={title} checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}
