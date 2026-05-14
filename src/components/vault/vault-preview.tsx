"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  FileText,
  Copy,
  Check,
  ExternalLink,
  Download,
  Eye,
  FileCode,
  Image as ImageIcon,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { VaultItem } from "@/lib/vault-types"

interface Props {
  item: VaultItem | null
  onClose?: () => void
}

export function VaultPreview({ item, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground border border-dashed rounded-2xl bg-slate-50/30 dark:bg-slate-950/30">
        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-900 mb-3">
          <Eye className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          安全预览视窗处于待命状态
        </p>
        <p className="text-xs mt-1 text-slate-400">点击左侧任意档案卡片即可在此开启防窥渲染</p>
      </div>
    )
  }

  function handleCopy() {
    if (!item) return
    navigator.clipboard.writeText(item.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 辅助提取原始文件名用于直接下载
  function getDownloadFilename() {
    if (!item) return "download"
    const ext = item.type === "pdf" ? ".pdf" : item.type === "image" ? ".png" : ".bin"
    return `${item.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")}${ext}`
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border rounded-2xl shadow-sm overflow-hidden">
      {/* 顶部通用元数据与操作条 */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 border-b shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px] shrink-0">
            {item.category || "未归档"}
          </span>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
            {item.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {item.type === "text" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-7 gap-1 px-2.5 text-xs rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "已复制" : "复制密文"}</span>
            </Button>
          )}

          {item.type === "url" && (
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-7 gap-1 px-2.5 text-xs rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
              )}
            >
              <ExternalLink className="h-3 w-3" />
              <span>安全访问</span>
            </a>
          )}

          {(item.type === "image" || item.type === "pdf" || item.type === "document") &&
            item.content.startsWith("data:") && (
              <a
                href={item.content}
                download={getDownloadFilename()}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-7 gap-1 px-2.5 text-xs rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
                )}
              >
                <Download className="h-3 w-3" />
                <span>本地取回</span>
              </a>
            )}
        </div>
      </div>

      {/* 下方特定类型独立渲染器 */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-slate-50/30 to-slate-100/10 dark:from-slate-950/30 dark:to-slate-900/10 flex flex-col items-center justify-start">
        {/* 1. 文本渲染模式：拟真纸质/终端阅读框 */}
        {item.type === "text" && (
          <div className="w-full max-w-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs font-mono text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-text">
            {item.content}
          </div>
        )}

        {/* 2. 网页书签模式：精美访问跳转引导卡 */}
        {item.type === "url" && (
          <div className="w-full max-w-md my-auto flex flex-col items-center bg-white dark:bg-slate-950 border p-8 rounded-2xl shadow-xs text-center">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full mb-4">
              <ExternalLink className="h-8 w-8" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              External Hyperlink Asset
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 break-all">
              {item.content}
            </p>
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "default" }), "rounded-xl w-full gap-2 shadow-sm")}
            >
              <span>在独立沙箱标签页中打开</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* 3. 图片渲染模式：高清灯箱级展示 */}
        {item.type === "image" && (
          <div className="relative w-full h-full min-h-[300px] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.content}
              alt={item.title}
              className="max-w-full max-h-[calc(100vh-280px)] object-contain rounded-lg shadow-md border"
            />
          </div>
        )}

        {/* 4. PDF 渲染模式：利用原生视窗进行矢量渲染 */}
        {item.type === "pdf" && (
          <div className="w-full h-[calc(100vh-260px)] min-h-[400px] rounded-xl overflow-hidden border shadow-sm">
            <object data={item.content} type="application/pdf" className="w-full h-full">
              <iframe src={item.content} className="w-full h-full border-none">
                <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50 dark:bg-slate-950 text-slate-500">
                  <p>当前浏览器环境已禁用内嵌 PDF 预览</p>
                  <a
                    href={item.content}
                    download={getDownloadFilename()}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 rounded-lg")}
                  >
                    直接下载 PDF 文件阅读
                  </a>
                </div>
              </iframe>
            </object>
          </div>
        )}

        {/* 5. 通用文档模式 */}
        {item.type === "document" && (
          <div className="w-full max-w-md my-auto flex flex-col items-center bg-white dark:bg-slate-950 border p-8 rounded-2xl shadow-xs text-center">
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-full mb-4">
              <FileCode className="h-8 w-8" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Secure Binary Document
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              {item.title}
            </p>
            <a
              href={item.content}
              download={getDownloadFilename()}
              className={cn(buttonVariants({ variant: "default" }), "rounded-xl w-full gap-2 shadow-sm")}
            >
              <Download className="h-3.5 w-3.5" />
              <span>安全解密下载至本地盘</span>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
