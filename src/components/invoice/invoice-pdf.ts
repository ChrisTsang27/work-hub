import type { InvoiceData } from "@/lib/invoice-types"

export function downloadInvoicePDF(data: InvoiceData) {
  const itemsTotal = data.items.reduce((s, i) => s + i.amount, 0)
  const reimbTotal = data.reimbursements.reduce((s, r) => s + r.amount, 0)
  const subtotal = itemsTotal + reimbTotal
  const total = subtotal

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${escapeHtml(data.invoice_no)}</title>
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
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 16px; }
  .from { margin-bottom: 10px; }
  .from-title { font-weight: 700; margin-bottom: 2px; }
  .from-detail { color: #555; }
  .to-details { margin-bottom: 20px; }
  .to-title { font-weight: 700; margin-bottom: 6px; }
  .details-col { display: flex; flex-direction: column; gap: 2px; }
  table { width: 100%; border-collapse: collapse; border: 1px solid #333; }
  th { text-align: left; padding: 6px 8px; font-weight: 700; font-size: 13px; border-bottom: 1px solid #333; }
  th:first-child { border-right: 1px solid #333; }
  th:last-child { text-align: right; width: 130px; }
  td { padding: 5px 8px; }
  td:first-child { border-right: 1px solid #333; }
  td:last-child { text-align: right; }
  td.amount-col { text-align: right; }
  .row { border-bottom: 1px solid #ccc; }
  .row-last { border-bottom: 1px solid #333; }
  .bank { margin-top: 22px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<h1>TAX INVOICE</h1>

<div class="from">
  <div class="from-title">From: Zhi Zeng</div>
  <div class="from-detail">ABN: 84 620 226 161</div>
  <div class="from-detail">Email: zz19920527@gmail.com</div>
  <div class="from-detail">Phone: 0452 503 527</div>
</div>

<div class="to-details">
  <div class="to-title">To: ${escapeHtml(data.client_name)}</div>
  <div class="details-col">
    <div><strong>Date:</strong> ${escapeHtml(data.invoice_date)}</div>
    <div><strong>Invoice No:</strong> ${escapeHtml(data.invoice_no)}</div>
    <div><strong>Reference:</strong> ${escapeHtml(data.job_reference)}</div>
    <div><strong>Rate:</strong> $${data.rate}/hour</div>
  </div>
</div>

<table>
  <thead><tr><th>Description</th><th>Amount (AUD)</th></tr></thead>
  <tbody>
    ${data.items
      .map(
        (item, i) => {
          const cls = (i === data.items.length - 1 && data.reimbursements.length === 0)
            ? "row-last" : "row"
          return `<tr class="${cls}"><td>${escapeHtml(item.description || "\u2014")}</td><td class="amount-col">$${item.amount.toFixed(2)}</td></tr>`
        }
      )
      .join("")}
    ${data.reimbursements
      .map(
        (r, i) => {
          const cls = i === data.reimbursements.length - 1 ? "row-last" : "row"
          return `<tr class="${cls}"><td>Reimbursement: ${escapeHtml(r.description || "\u2014")}</td><td class="amount-col">$${r.amount.toFixed(2)}</td></tr>`
        }
      )
      .join("")}
    <tr class="row">
      <td style="font-weight:700">Subtotal</td>
      <td class="amount-col" style="font-weight:700">$${subtotal.toFixed(2)}</td>
    </tr>
    <tr class="row-last">
      <td>GST (0%)</td>
      <td class="amount-col">$0.00</td>
    </tr>
    <tr>
      <td style="font-weight:700;font-size:15px;padding:8px 8px">TOTAL</td>
      <td class="amount-col" style="font-weight:700;font-size:15px;padding:8px 8px">$${total.toFixed(2)}</td>
    </tr>
  </tbody>
</table>

<div class="bank">
  <div><strong>Bank:</strong> ANZ</div>
  <div><strong>BSB:</strong> 014002</div>
  <div><strong>Account:</strong> 404036579</div>
  <div><strong>Account name:</strong> Zhi Zeng</div>
  <div><strong>Reference:</strong> website building service fees</div>
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
