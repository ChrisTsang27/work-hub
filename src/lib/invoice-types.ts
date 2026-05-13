export interface LineItem {
  id: string
  description: string
  amount: number
}

export interface Reimbursement {
  id: string
  description: string
  amount: number
}

export interface InvoiceData {
  id?: string
  invoice_no: string
  client_name: string
  invoice_date: string
  job_reference: string
  rate: number
  bank_reference?: string
  items: LineItem[]
  reimbursements: Reimbursement[]
  subtotal: number
  total: number
  created_at?: string
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function calcSubtotal(
  items: LineItem[],
  reimbursements: Reimbursement[]
): number {
  const itemsTotal = items.reduce((sum, i) => sum + i.amount, 0)
  const reimbTotal = reimbursements.reduce((sum, r) => sum + r.amount, 0)
  return itemsTotal + reimbTotal
}
