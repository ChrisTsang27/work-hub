"use client"

import type { InvoiceData } from "@/lib/invoice-types"

const TABLE_BORDER = "1px solid #333"
const TABLE_BORDER_LIGHT = "1px solid #ccc"
const COL_WIDTH = 130

const SENDER = {
  name: "Zhi Zeng",
  abn: "84 620 226 161",
  email: "zz19920527@gmail.com",
  phone: "0452 503 527",
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
        padding: "32px 28px",
        color: "#333",
        fontSize: 13,
        lineHeight: 1.6,
        background: "#fff",
      }}
    >
      {/* --- TITLE --- */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 16px 0",
          letterSpacing: "0.5px",
        }}
      >
        TAX INVOICE
      </h1>

      {/* --- FROM --- */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>
          From: {SENDER.name}
        </div>
        <div style={{ color: "#555" }}>ABN: {SENDER.abn}</div>
        <div style={{ color: "#555" }}>Email: {SENDER.email}</div>
        <div style={{ color: "#555" }}>Phone: {SENDER.phone}</div>
      </div>

      {/* --- TO + DETAILS (single block, matching template) --- */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          To: {data.client_name || "—"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div>
            <strong>Date:</strong> {data.invoice_date || "—"}
          </div>
          <div>
            <strong>Invoice No:</strong> {data.invoice_no || "—"}
          </div>
          <div>
            <strong>Reference:</strong> {data.job_reference || "—"}
          </div>
          <div>
            <strong>Rate:</strong> ${data.rate || 0}/hour
          </div>
        </div>
      </div>

      {/* --- TABLE --- */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: TABLE_BORDER,
        }}
      >
        <thead>
          <tr style={{ borderBottom: TABLE_BORDER }}>
            <th
              style={{
                textAlign: "left",
                padding: "8px 10px",
                fontWeight: 700,
                fontSize: 13,
                borderRight: TABLE_BORDER,
              }}
            >
              Description
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "8px 10px",
                fontWeight: 700,
                fontSize: 13,
                width: COL_WIDTH,
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
                  padding: "16px 8px",
                  textAlign: "center",
                  color: "#999",
                  borderBottom: "none",
                }}
              >
                暂无项目
              </td>
            </tr>
          )}

          {data.items.map((item, i) => {
            const isLast =
              i === data.items.length - 1 && data.reimbursements.length === 0
            return (
              <tr
                key={item.id}
                style={{
                  borderBottom: isLast ? TABLE_BORDER : TABLE_BORDER_LIGHT,
                }}
              >
                <td
                  style={{
                    padding: "7px 10px",
                    borderRight: TABLE_BORDER,
                  }}
                >
                  {item.description || "—"}
                </td>
                <td style={{ padding: "7px 10px", textAlign: "right" }}>
                  {item.amount > 0 ? `$${item.amount.toFixed(2)}` : "—"}
                </td>
              </tr>
            )
          })}

          {data.reimbursements.map((r, i) => {
            const isLast = i === data.reimbursements.length - 1
            return (
              <tr
                key={r.id}
                style={{
                  borderBottom: isLast ? TABLE_BORDER : TABLE_BORDER_LIGHT,
                }}
              >
                <td
                  style={{
                    padding: "7px 10px",
                    borderRight: TABLE_BORDER,
                  }}
                >
                  Reimbursement: {r.description || "—"}
                </td>
                <td style={{ padding: "7px 10px", textAlign: "right" }}>
                  {r.amount > 0 ? `$${r.amount.toFixed(2)}` : "—"}
                </td>
              </tr>
            )
          })}

          {/* --- Subtotal (inside table) --- */}
          <tr style={{ borderBottom: TABLE_BORDER_LIGHT }}>
            <td
              style={{
                padding: "7px 10px",
                fontWeight: 700,
                borderRight: TABLE_BORDER,
              }}
            >
              Subtotal
            </td>
            <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700 }}>
              ${subtotal.toFixed(2)}
            </td>
          </tr>

          {/* --- GST (inside table) --- */}
          <tr style={{ borderBottom: TABLE_BORDER }}>
            <td
              style={{
                padding: "7px 10px",
                borderRight: TABLE_BORDER,
              }}
            >
              GST (0%)
            </td>
            <td style={{ padding: "7px 10px", textAlign: "right" }}>
              $0.00
            </td>
          </tr>

          {/* --- TOTAL (inside table) --- */}
          <tr>
            <td
              style={{
                padding: "10px 10px",
                fontWeight: 700,
                fontSize: 15,
                borderRight: TABLE_BORDER,
              }}
            >
              TOTAL
            </td>
            <td
              style={{
                padding: "10px 10px",
                textAlign: "right",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              ${total.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* --- BANK --- */}
      <div style={{ marginTop: 18, fontSize: 13, lineHeight: 1.4 }}>
        <div><strong>Bank:</strong> ANZ</div>
        <div><strong>BSB:</strong> 014002</div>
        <div><strong>Account:</strong> 404036579</div>
        <div><strong>Account name:</strong> Zhi Zeng</div>
        <div><strong>Reference:</strong> {data.bank_reference || ""}</div>
      </div>
    </div>
  )
}
