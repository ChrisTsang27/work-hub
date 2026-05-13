"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Save, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { InvoiceForm } from "@/components/invoice/invoice-form"
import { InvoicePreview } from "@/components/invoice/invoice-preview"
import { InvoiceList } from "@/components/invoice/invoice-list"
import {
  saveInvoice,
  getInvoices,
  deleteInvoice,
} from "@/lib/invoice-actions"
import type { InvoiceData } from "@/lib/invoice-types"

const DEFAULT: InvoiceData = {
  invoice_no: "",
  client_name: "JY Global Limited",
  invoice_date: new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }),
  job_reference: "",
  rate: 50,
  bank_reference: "",
  items: [{ id: "1", description: "", amount: 0 }],
  reimbursements: [],
  subtotal: 0,
  total: 0,
}

export default function InvoicesPage() {
  const [data, setData] = useState<InvoiceData>({ ...DEFAULT })
  const [saving, setSaving] = useState(false)
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("new")

  const loadInvoices = useCallback(async () => {
    try {
      const list = await getInvoices()
      setInvoices(list)
    } catch (e) {
      console.error("Failed to load invoices:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  async function handleSave() {
    setSaving(true)
    try {
      const saved = await saveInvoice(data)
      if (saved) {
        setData({ ...DEFAULT, client_name: "JY Global Limited" })
        await loadInvoices()
      }
    } catch (e) {
      console.error("Save failed:", e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteInvoice(id)
    await loadInvoices()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="new">新建发票</TabsTrigger>
          <TabsTrigger value="history">历史记录</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="space-y-4">
              <InvoiceForm data={data} onChange={setData} />
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                保存发票
              </Button>
            </div>

            {/* Right: Preview */}
            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b text-sm font-medium text-muted-foreground">
                实时预览
              </div>
              <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
                <InvoicePreview data={data} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <InvoiceList invoices={invoices} onDelete={handleDelete} />
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
