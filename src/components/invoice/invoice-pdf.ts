import type { InvoiceData } from "@/lib/invoice-types"

const RED = "#c0392b"
const RED_BORDER = `2px solid ${RED}`

export function downloadInvoicePDF(data: InvoiceData) {
  const itemsTotal = data.items.reduce((s, i) => s + i.amount, 0)
  const reimbTotal = data.reimbursements.reduce((s, r) => s + r.amount, 0)
  const subtotal = itemsTotal + reimbTotal
  const total = subtotal

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${data.invoice_no}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #333;
    font-size: 13px;
    line-height: 1.6;
    padding: 24px 20px;
    max-width: 700px;
    margin: 0 auto;
  }
  h1 { color: ${RED}; font-size: 22px; font-weight: 700; margin-bottom: 16px; }
  .box { border: ${RED_BORDER}; padding: 10px 14px; margin-bottom: 12px; }
  .to-box { border: ${RED_BORDER}; padding: 10px 14px; margin-bottom: 16px; }
  .details { display: flex; flex-wrap: wrap; gap: 8px 24px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
  thead tr { border: ${RED_BORDER}; }
  th { text-align: left; padding: 8px 10px; font-weight: 700; }
  th:last-child { text-align: right; width: 130px; }
  td { padding: 6px 10px; border-bottom: 1px solid #e0e0e0; }
  td:last-child { text-align: right; }
  .total-box { border: ${RED_BORDER}; border-top: none; padding: 8px 10px; text-align: right; }
  .total-line { text-align: right; font-size: 16px; font-weight: 700; padding: 10px 10px 4px; }
  .bank-box { border: ${RED_BORDER}; padding: 10px 14px; margin-top: 16px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<h1>TAX INVOICE</h1>

<div class="box">
  <div style="font-weight:700;margin-bottom:2px">From: Zhi Zeng</div>
  <div>ABN: 84 620 226 161</div>
  <div>Email: zz19920527@gmail.com</div>
  <div>Phone: 0452 503 527</div>
</div>

<div class="to-box">
  <div style="font-weight:700">To: ${escapeHtml(data.client_name)}</div>
</div>

<div class="details">
  <span><strong>Date:</strong> ${escapeHtml(data.invoice_date)}</span>
  <span><strong>Invoice No:</strong> ${escapeHtml(data.invoice_no)}</span>
  <span><strong>Reference:</strong> ${escapeHtml(data.job_reference)}</span>
  <span><strong>Rate:</strong> $${data.rate}/hour</span>
</div>

<table>
  <thead><tr><th>Description</th><th>Amount (AUD)</th></tr></thead>
  <tbody>
    ${data.items
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.description)}</td><td>$${item.amount.toFixed(2)}</td></tr>`
      )
      .join("")}
    ${data.reimbursements
      .map(
        (r) =>
          `<tr><td>Reimbursement: ${escapeHtml(r.description)}</td><td>$${r.amount.toFixed(2)}</td></tr>`
      )
      .join("")}
  </tbody>
</table>

<div class="total-box">
  <div style="margin-bottom:2px"><strong>Subtotal</strong> <span style="display:inline-block;width:90px;text-align:right">$${subtotal.toFixed(2)}</span></div>
  <div><strong>GST (0%)</strong> <span style="display:inline-block;width:90px;text-align:right">$0.00</span></div>
</div>

<div class="total-line">TOTAL <span style="display:inline-block;width:90px;text-align:right">$${total.toFixed(2)}</span></div>

<div class="bank-box">
  <div>Bank: ANZ</div>
  <div>BSB: 014002</div>
  <div>Account: 404036579</div>
  <div>Account name: Zhi Zeng</div>
  <div>Reference: website building service fees</div>
</div>

<script>window.onload = () => window.print();</script>
</body>
</html>`

  const blob = new Blob([html], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, "_blank")
  if (win) {
    win.onload = () => URL.revokeObjectURL(url)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
