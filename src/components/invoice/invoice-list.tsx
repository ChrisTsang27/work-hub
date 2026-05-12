"use client"

import { useState } from "react"
import { Eye, Download, Trash2 } from "lucide-react"
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
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg">暂无发票记录</p>
        <p className="text-sm mt-1">在「新建发票」中创建你的第一张发票</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {invoices.map((inv) => (
          <Card key={inv.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    #{inv.invoice_no}
                  </span>
                  <span className="text-sm text-muted-foreground truncate">
                    {inv.client_name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{inv.invoice_date}</span>
                  <span>${inv.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreview(inv)}
                  title="查看预览"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => downloadInvoicePDF(inv)}
                  title="下载 PDF"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={deleting === inv.id}
                  onClick={async () => {
                    if (!inv.id) return
                    setDeleting(inv.id)
                    onDelete(inv.id)
                    setDeleting(null)
                  }}
                  title="删除"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              发票预览 — #{preview?.invoice_no}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="border rounded-lg bg-white">
              <InvoicePreview data={preview} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
