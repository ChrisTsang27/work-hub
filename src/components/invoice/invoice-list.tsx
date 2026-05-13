"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, Download, Trash2, FileText, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InvoicePreview } from "@/components/invoice/invoice-preview"
import { downloadInvoicePDF } from "@/components/invoice/invoice-pdf"
import type { InvoiceData } from "@/lib/invoice-types"

interface Props {
  invoices: InvoiceData[]
  onDelete: (id: string) => void
}

export function InvoiceList({ invoices, onDelete }: Props) {
  const [preview, setPreview] = useState<InvoiceData | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  if (invoices.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 border border-dashed rounded-xl bg-slate-50/40 dark:bg-slate-950/40 text-muted-foreground"
      >
        <div className="p-3 bg-muted rounded-full mb-3">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">暂无发票记录</p>
        <p className="text-xs mt-1">在「新建发票」中保存的单据将在此处展示</p>
      </motion.div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {invoices.map((inv) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-primary/20 transition-all duration-200 group">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-xs shrink-0">
                        #{inv.invoice_no || "—"}
                      </span>
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                        {inv.client_name || "未命名客户"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {inv.invoice_date || "—"}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        ${inv.total.toFixed(2)} AUD
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={() => setPreview(inv)}
                      title="查看预览"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={() => downloadInvoicePDF(inv)}
                      title="下载 PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                      disabled={deleting === inv.id}
                      onClick={async () => {
                        if (!inv.id) return
                        setDeleting(inv.id)
                        onDelete(inv.id)
                        setDeleting(null)
                      }}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl border-none p-0 overflow-hidden bg-transparent shadow-none">
          <div className="flex flex-col bg-white dark:bg-slate-900 rounded-xl overflow-hidden border shadow-2xl max-h-[85vh]">
            <DialogHeader className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-950 shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs">#{preview?.invoice_no}</span>
                  <span>发票详情预览</span>
                </DialogTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 rounded-lg border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all ml-auto mr-6"
                  onClick={() => preview && downloadInvoicePDF(preview)}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">下载 PDF</span>
                </Button>
              </div>
            </DialogHeader>

            <div className="overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center items-start bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-950 dark:to-slate-900/60">
              {preview && (
                <div className="w-full max-w-[700px]">
                  <div className="bg-white text-slate-900 shadow-xl shadow-slate-200/80 dark:shadow-none ring-1 ring-black/5 rounded-sm overflow-hidden">
                    <InvoicePreview data={preview} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
