"use client"

import type { InvoiceData } from "@/lib/invoice-types"

const RED = "#c0392b"
const RED_BORDER = `2px solid ${RED}`

const SENDER = {
  name: "Zhi Zeng",
  abn: "84 620 226 161",
  email: "zz19920527@gmail.com",
  phone: "0452 503 527",
} as const

const BANK = {
  bank: "ANZ",
  bsb: "014002",
  account: "404036579",
  name: "Zhi Zeng",
  reference: "website building service fees",
} as const

interface Props {
  data: InvoiceData
}

export function InvoicePreview({ data }: Props) {
  const itemsTotal = data.items.reduce((s, i) => s + i.amount, 0)
  const reimbTotal = data.reimbursements.reduce((s, r) => s + r.amount, 0)
  const subtotal = itemsTotal + reimbTotal
  const total = subtotal // GST = 0

  return (
    <div
      id="invoice-preview"
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        maxWidth: 700,
        margin: "0 auto",
        padding: "24px 20px",
        color: "#333",
        fontSize: 13,
        lineHeight: 1.6,
        background: "#fff",
      }}
    >
      {/* --- TITLE --- */}
      <h1
        style={{
          color: RED,
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 16px 0",
          letterSpacing: "0.5px",
        }}
      >
        TAX INVOICE
      </h1>

      {/* --- FROM BOX --- */}
      <div
        style={{
          border: RED_BORDER,
          padding: "10px 14px",
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 2 }}>
          From: {SENDER.name}
        </div>
        <div>ABN: {SENDER.abn}</div>
        <div>Email: {SENDER.email}</div>
        <div>Phone: {SENDER.phone}</div>
      </div>

      {/* --- TO BOX --- */}
      <div
        style={{
          border: RED_BORDER,
          padding: "10px 14px",
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 700 }}>
          To: {data.client_name || "—"}
        </div>
      </div>

      {/* --- DETAILS LINE --- */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 24px",
          marginBottom: 16,
        }}
      >
        <span>
          <strong>Date:</strong> {data.invoice_date || "—"}
        </span>
        <span>
          <strong>Invoice No:</strong> {data.invoice_no || "—"}
        </span>
        <span>
          <strong>Reference:</strong> {data.job_reference || "—"}
        </span>
        <span>
          <strong>Rate:</strong> ${data.rate || 0}/hour
        </span>
      </div>

      {/* --- TABLE --- */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: 0,
        }}
      >
        <thead>
          <tr style={{ border: RED_BORDER }}>
            <th
              style={{
                textAlign: "left",
                padding: "8px 10px",
                fontWeight: 700,
              }}
            >
              Description
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "8px 10px",
                fontWeight: 700,
                width: 130,
              }}
            >
              Amount (AUD)
            </th>
          </tr>
        </thead>
        <tbody>
          {data.items.length === 0 && data.reimbursements.length === 0 && (
            <tr>
              <td
                colSpan={2}
                style={{
                  padding: "16px 10px",
                  textAlign: "center",
                  color: "#999",
                  borderBottom: "1px solid #e0e0e0",
                }}
              >
                暂无项目
              </td>
            </tr>
          )}

          {data.items.map((item, i) => (
            <tr key={item.id}>
              <td
                style={{
                  padding: "6px 10px",
                  borderBottom:
                    i === data.items.length - 1 &&
                    data.reimbursements.length === 0
                      ? "none"
                      : "1px solid #e0e0e0",
                }}
              >
                {item.description || "—"}
              </td>
              <td
                style={{
                  padding: "6px 10px",
                  textAlign: "right",
                  borderBottom:
                    i === data.items.length - 1 &&
                    data.reimbursements.length === 0
                      ? "none"
                      : "1px solid #e0e0e0",
                }}
              >
                {item.amount > 0 ? `$${item.amount.toFixed(2)}` : "—"}
              </td>
            </tr>
          ))}

          {data.reimbursements.map((r, i) => (
            <tr key={r.id}>
              <td
                style={{
                  padding: "6px 10px",
                  borderBottom:
                    i === data.reimbursements.length - 1
                      ? "none"
                      : "1px solid #e0e0e0",
                }}
              >
                Reimbursement: {r.description || "—"}
              </td>
              <td
                style={{
                  padding: "6px 10px",
                  textAlign: "right",
                  borderBottom:
                    i === data.reimbursements.length - 1
                      ? "none"
                      : "1px solid #e0e0e0",
                }}
              >
                {r.amount > 0 ? `$${r.amount.toFixed(2)}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- SUBTOTAL / GST BOX --- */}
      <div
        style={{
          border: RED_BORDER,
          borderTop: "none",
          padding: "8px 10px",
          textAlign: "right",
        }}
      >
        <div style={{ marginBottom: 2 }}>
          <strong>Subtotal</strong>{" "}
          <span style={{ display: "inline-block", width: 90, textAlign: "right" }}>
            ${subtotal.toFixed(2)}
          </span>
        </div>
        <div>
          <strong>GST (0%)</strong>{" "}
          <span style={{ display: "inline-block", width: 90, textAlign: "right" }}>
            $0.00
          </span>
        </div>
      </div>

      {/* --- TOTAL (outside box) --- */}
      <div
        style={{
          textAlign: "right",
          fontSize: 16,
          fontWeight: 700,
          padding: "10px 10px 4px 10px",
        }}
      >
        TOTAL{" "}
        <span style={{ display: "inline-block", width: 90, textAlign: "right" }}>
          ${total.toFixed(2)}
        </span>
      </div>

      {/* --- BANK BOX --- */}
      <div
        style={{
          border: RED_BORDER,
          padding: "10px 14px",
          marginTop: 16,
        }}
      >
        <div>Bank: {BANK.bank}</div>
        <div>BSB: {BANK.bsb}</div>
        <div>Account: {BANK.account}</div>
        <div>Account name: {BANK.name}</div>
        <div>Reference: {BANK.reference}</div>
      </div>
    </div>
  )
}
