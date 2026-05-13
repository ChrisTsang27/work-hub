"use server"

import { supabase } from "@/lib/supabase"
import type { InvoiceData } from "@/lib/invoice-types"

export async function saveInvoice(
  data: InvoiceData
): Promise<InvoiceData | null> {
  const itemsTotal = data.items.reduce((s, i) => s + i.amount, 0)
  const reimbTotal = data.reimbursements.reduce((s, r) => s + r.amount, 0)
  const subtotal = itemsTotal + reimbTotal

  const payload = {
    invoice_no: data.invoice_no,
    client_name: data.client_name,
    invoice_date: data.invoice_date,
    job_reference: data.job_reference,
    rate: data.rate,
    bank_reference: data.bank_reference ?? "",
    items: data.items,
    reimbursements: data.reimbursements,
    subtotal,
    total: subtotal,
  }

  if (data.id) {
    const { data: updated, error } = await supabase
      .from("invoices")
      .update(payload)
      .eq("id", data.id)
      .select()
      .single()

    if (error) throw error
    return formatInvoice(updated)
  } else {
    const { data: created, error } = await supabase
      .from("invoices")
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return formatInvoice(created)
  }
}

export async function getInvoices(): Promise<InvoiceData[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []).map(formatInvoice)
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from("invoices").delete().eq("id", id)
  if (error) throw error
}

function formatInvoice(row: Record<string, unknown>): InvoiceData {
  return {
    id: row.id as string,
    invoice_no: row.invoice_no as string,
    client_name: row.client_name as string,
    invoice_date: row.invoice_date as string,
    job_reference: (row.job_reference as string) ?? "",
    rate: Number(row.rate ?? 50),
    bank_reference: (row.bank_reference as string) ?? "",
    items: (row.items as InvoiceData["items"]) ?? [],
    reimbursements: (row.reimbursements as InvoiceData["reimbursements"]) ?? [],
    subtotal: Number(row.subtotal ?? 0),
    total: Number(row.total ?? 0),
    created_at: row.created_at as string,
  }
}
