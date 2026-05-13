"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Save, Loader2, Download, FileText } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { InvoiceForm } from "@/components/invoice/invoice-form"
import { InvoicePreview } from "@/components/invoice/invoice-preview"
import { downloadInvoicePDF } from "@/components/invoice/invoice-pdf"
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
              <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 sm:p-6 shadow-sm">
                <InvoiceForm data={data} onChange={setData} />
              </div>
              <Button 
                className="w-full h-11 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 dark:from-slate-100 dark:to-slate-200 text-white dark:text-slate-950 shadow-md hover:shadow-lg transition-all font-medium rounded-xl" 
                onClick={handleSave} 
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                <span>保存发票</span>
              </Button>
            </div>

            {/* Right: Preview Container */}
            <div className="lg:sticky lg:top-6 self-start w-full">
              <div className="flex flex-col border rounded-xl shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                {/* Premium Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50 dark:bg-slate-950/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold leading-none mb-1">实时预览</div>
                      <div className="text-xs text-muted-foreground">标准打印排版自动同步</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-col items-end text-right">
                      <span className="text-[10px] uppercase font-medium text-muted-foreground leading-none mb-1">实时总计</span>
                      <span className="text-xs font-bold text-primary leading-none">${data.total.toFixed(2)} AUD</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 rounded-lg border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all"
                      onClick={() => downloadInvoicePDF(data)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">下载 PDF</span>
                    </Button>
                  </div>
                </div>

                {/* Elevated Document Canvas Area */}
                <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center items-start bg-gradient-to-b from-slate-50/80 to-slate-100/40 dark:from-slate-950/80 dark:to-slate-900/40">
                  <div className="w-full max-w-[700px]">
                    <div className="bg-white text-slate-900 shadow-xl shadow-slate-200/80 dark:shadow-none ring-1 ring-black/5 rounded-sm overflow-hidden transition-all duration-200">
                      <InvoicePreview data={data} />
                    </div>
                  </div>
                </div>
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
