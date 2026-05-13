"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  type LineItem,
  type Reimbursement,
  type InvoiceData,
  generateId,
  calcSubtotal,
} from "@/lib/invoice-types"

interface Props {
  data: InvoiceData
  onChange: (data: InvoiceData) => void
}

const SENDER = {
  name: "Zhi Zeng",
  abn: "84 620 226 161",
  email: "zz19920527@gmail.com",
  phone: "0452 503 527",
} as const

export function InvoiceForm({ data, onChange }: Props) {
  function update<K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) {
    const next = { ...data, [key]: value }
    if (key === "items" || key === "reimbursements") {
      next.subtotal = calcSubtotal(next.items, next.reimbursements)
      next.total = next.subtotal // GST=0
    }
    onChange(next)
  }

  // --- Items ---
  function addItem() {
    update("items", [
      ...data.items,
      { id: generateId(), description: "", amount: 0 },
    ])
  }
  function updateItem(id: string, field: keyof LineItem, val: string | number) {
    update(
      "items",
      data.items.map((i) => (i.id === id ? { ...i, [field]: val } : i))
    )
  }
  function removeItem(id: string) {
    update("items", data.items.filter((i) => i.id !== id))
  }

  // --- Reimbursements ---
  function addReimbursement() {
    update("reimbursements", [
      ...data.reimbursements,
      { id: generateId(), description: "", amount: 0 },
    ])
  }
  function updateReimb(id: string, field: keyof Reimbursement, val: string | number) {
    update(
      "reimbursements",
      data.reimbursements.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    )
  }
  function removeReimb(id: string) {
    update("reimbursements", data.reimbursements.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Sender info — read only */}
      {/* Sender info — read only */}
      <div className="rounded-xl border-l-4 border-l-primary border bg-slate-50/60 dark:bg-slate-950/60 p-4 space-y-1 text-sm shadow-xs transition-all">
        <p className="font-semibold text-slate-900 dark:text-slate-100">From: {SENDER.name}</p>
        <p className="text-muted-foreground text-xs">ABN: {SENDER.abn}</p>
        <p className="text-muted-foreground text-xs">Email: {SENDER.email}</p>
        <p className="text-muted-foreground text-xs">Phone: {SENDER.phone}</p>
      </div>

      <Separator />

      {/* Client + details */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client_name">To (客户名)</Label>
          <Input
            id="client_name"
            value={data.client_name}
            onChange={(e) => update("client_name", e.target.value)}
            placeholder="JY Global Limited"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="invoice_date">Date（日期）</Label>
            <Input
              id="invoice_date"
              value={data.invoice_date}
              onChange={(e) => update("invoice_date", e.target.value)}
              placeholder="Apr 29th 2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice_no">Invoice No（编号）</Label>
            <Input
              id="invoice_no"
              value={data.invoice_no}
              onChange={(e) => update("invoice_no", e.target.value)}
              placeholder="012"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="job_reference">Reference（工作描述）</Label>
            <Input
              id="job_reference"
              value={data.job_reference}
              onChange={(e) => update("job_reference", e.target.value)}
              placeholder="website content update"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Rate（时薪）</Label>
            <Input
              id="rate"
              type="number"
              value={data.rate}
              onChange={(e) => update("rate", Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bank_reference">Bank Reference（银行备注）</Label>
          <Input
            id="bank_reference"
            value={data.bank_reference ?? ""}
            onChange={(e) => update("bank_reference", e.target.value)}
            placeholder="website building service fees"
          />
        </div>
      </div>

      <Separator />

      {/* Line items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Line Items（服务项目）</Label>
          <Button variant="outline" size="sm" className="h-8 rounded-lg gap-1 shadow-xs" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" />
            <span>添加</span>
          </Button>
        </div>

        {data.items.length === 0 && (
          <p className="text-sm text-muted-foreground">暂无服务项目</p>
        )}

        <AnimatePresence initial={false}>
          {data.items.map((item) => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2 items-center pt-1"
            >
              <Input
                className="flex-1 rounded-lg"
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(item.id, "description", e.target.value)}
              />
              <Input
                className="w-28 rounded-lg"
                type="number"
                placeholder="Amount"
                value={item.amount || ""}
                onChange={(e) =>
                  updateItem(item.id, "amount", Number(e.target.value))
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Separator />

      {/* Reimbursements */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Reimbursements（报销）</Label>
          <Button variant="outline" size="sm" className="h-8 rounded-lg gap-1 shadow-xs" onClick={addReimbursement}>
            <Plus className="h-3.5 w-3.5" />
            <span>添加</span>
          </Button>
        </div>

        {data.reimbursements.length === 0 && (
          <p className="text-sm text-muted-foreground">暂无报销项目</p>
        )}

        <AnimatePresence initial={false}>
          {data.reimbursements.map((r) => (
            <motion.div 
              key={r.id} 
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2 items-center pt-1"
            >
              <Input
                className="flex-1 rounded-lg"
                placeholder="Description"
                value={r.description}
                onChange={(e) =>
                  updateReimb(r.id, "description", e.target.value)
                }
              />
              <Input
                className="w-28 rounded-lg"
                type="number"
                placeholder="Amount"
                value={r.amount || ""}
                onChange={(e) =>
                  updateReimb(r.id, "amount", Number(e.target.value))
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg"
                onClick={() => removeReimb(r.id)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
