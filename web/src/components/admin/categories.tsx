"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, ShapesIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { EmptyState } from "@/components/admin/empty-state";
import { FormError } from "@/components/admin/form-error";
import { NameForm } from "@/components/admin/name-form";
import { PageHeader } from "@/components/admin/page-header";
import { Switch } from "@/components/admin/switch";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { adminSend, errorBody } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

export type Category = { id: number; name: string; is_visible: boolean };

/** The Categories page: add, rename, reorder and hide Categories. Each change saves straight away. */
export function Categories({ categories: initialCategories }: { categories: Category[] }) {
  const toast = useToast();
  const [categories, setCategories] = useState(initialCategories);
  const [adding, setAdding] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /** Sends one change; returns the response, or null after showing the error. */
  async function send(method: "POST" | "PUT" | "PATCH", path: string, body: unknown) {
    setPending(true);
    setError(null);
    const response = await adminSend(method, path, body);
    setPending(false);
    if (!response.ok) {
      const { detail, errors } = await errorBody(response);
      setError(errors.name ?? detail);
      return null;
    }
    return response;
  }

  function startAdding() {
    setAdding(true);
    setRenamingId(null);
    setError(null);
  }

  async function add(name: string) {
    const response = await send("POST", "/categories", { name });
    if (!response) return;
    const category: Category = await response.json();
    setCategories((current) => [...current, category]);
    setAdding(false);
    toast("Category added");
  }

  async function change(id: number, change: Partial<Omit<Category, "id">>, message: string) {
    const response = await send("PATCH", `/categories/${id}`, change);
    if (!response) return;
    const category: Category = await response.json();
    setCategories((current) => current.map((each) => (each.id === id ? category : each)));
    setRenamingId(null);
    toast(message);
  }

  async function move(index: number, by: -1 | 1) {
    const reordered = [...categories];
    [reordered[index], reordered[index + by]] = [reordered[index + by], reordered[index]];
    if (!(await send("PUT", "/categories/order", { ids: reordered.map((category) => category.id) }))) return;
    setCategories(reordered);
    toast("Category order saved");
  }

  const addButton = (
    <Button onClick={startAdding}>
      <PlusIcon aria-hidden className="size-4" />
      Add category
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Categories"
        description="Use the arrows to change the order on the customer home page."
        action={addButton}
      />
      {categories.length === 0 && !adding ? (
        <EmptyState icon={ShapesIcon} text="No categories yet." action={addButton} />
      ) : (
        <section
          aria-label="Categories"
          className="flex flex-col gap-2 rounded-lg border-hairline border-border bg-card px-4 py-2 shadow-sm md:px-6"
        >
          <FormError message={error} />
          <ul className="flex flex-col">
            {categories.map((category, index) => (
              <li
                key={category.id}
                className="flex min-h-tap items-center gap-1 border-border py-2 not-first:border-t-hairline"
              >
                {renamingId === category.id ? (
                  <NameForm
                    label={`New name for ${category.name}`}
                    initial={category.name}
                    submitLabel="Save"
                    pending={pending}
                    onSubmit={(name) => change(category.id, { name }, "Category renamed")}
                    onCancel={() => setRenamingId(null)}
                  />
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${category.name} up`}
                      disabled={pending || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUpIcon aria-hidden className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${category.name} down`}
                      disabled={pending || index === categories.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDownIcon aria-hidden className="size-4" />
                    </Button>
                    <span
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2 font-semibold",
                        !category.is_visible && "text-muted-foreground",
                      )}
                    >
                      <span className="truncate">{category.name}</span>
                      {!category.is_visible && (
                        <span className="shrink-0 rounded-sm border-hairline border-border bg-muted px-2 text-xs font-normal">
                          Hidden
                        </span>
                      )}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Rename ${category.name}`}
                      onClick={() => {
                        setRenamingId(category.id);
                        setAdding(false);
                        setError(null);
                      }}
                    >
                      Rename
                    </Button>
                    <span
                      aria-hidden
                      className={cn("ml-2 hidden text-sm md:inline", !category.is_visible && "text-muted-foreground")}
                    >
                      Shown on home page
                    </span>
                    <Switch
                      label={`Show ${category.name} on the home page`}
                      checked={category.is_visible}
                      disabled={pending}
                      onChange={(isVisible) =>
                        change(category.id, { is_visible: isVisible }, isVisible ? "Category shown" : "Category hidden")
                      }
                    />
                  </>
                )}
              </li>
            ))}
            {adding && (
              <li className="flex flex-wrap items-center gap-2 border-border py-2 not-first:border-t-hairline">
                <NameForm
                  label="New category name"
                  initial=""
                  submitLabel="Add"
                  pending={pending}
                  onSubmit={add}
                  onCancel={() => setAdding(false)}
                />
              </li>
            )}
          </ul>
        </section>
      )}
    </>
  );
}
