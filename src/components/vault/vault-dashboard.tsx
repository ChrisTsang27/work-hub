"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Search,
  Trash2,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  FileCode,
  Pin,
  FolderPlus,
  Folder,
  Eye,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type VaultItem,
  type VaultItemType,
  generateVaultId,
} from "@/lib/vault-types"

interface Props {
  items: VaultItem[]
  onSaveItem: (item: VaultItem) => void
  onDeleteItem: (id: string) => void
  onTogglePin: (id: string) => void
  onSelectItem: (item: VaultItem) => void
  selectedItem: VaultItem | null
  onLockNow: () => void
}

export function VaultDashboard({
  items,
  onSaveItem,
  onDeleteItem,
  onTogglePin,
  onSelectItem,
  selectedItem,
  onLockNow,
}: Props) {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<VaultItemType | "all">("all")

  // 新建档案弹窗状态
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [newType, setNewType] = useState<VaultItemType>("text")
  const [newContent, setNewContent] = useState("")
  const [customCategories, setCustomCategories] = useState<string[]>([
    "核心凭证",
    "灵感宝库",
    "私密合同",
    "财务报表",
  ])

  // 动态计算存在的所有独立分类
  const categories = useMemo(() => {
    const set = new Set<string>(customCategories)
    items.forEach((i) => i.category && set.add(i.category))
    return Array.from(set)
  }, [items, customCategories])

  // 过滤结果
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.content.toLowerCase().includes(search.toLowerCase())
      const matchCategory =
        !selectedCategory || item.category === selectedCategory
      const matchType = selectedType === "all" || item.type === selectedType
      return matchSearch && matchCategory && matchType
    })
  }, [items, search, selectedCategory, selectedType])

  // 置顶与非置顶分离
  const pinnedItems = useMemo(() => filteredItems.filter((i) => i.is_pinned), [filteredItems])
  const normalItems = useMemo(() => filteredItems.filter((i) => !i.is_pinned), [filteredItems])

  // 处理文件资产本地转 Base64 读取
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // 自动回填标题
    if (!newTitle) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ""))
    }

    // 智能推断类型
    if (file.type.startsWith("image/")) {
      setNewType("image")
    } else if (file.type === "application/pdf") {
      setNewType("pdf")
    } else {
      setNewType("document")
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setNewContent(base64)
    }
    reader.readAsDataURL(file)
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) return

    const itemCategory = newCategory.trim() || "未归档"
    onSaveItem({
      id: generateVaultId(),
      title: newTitle.trim(),
      category: itemCategory,
      type: newType,
      content: newContent.trim(),
      created_at: new Date().toISOString().split("T")[0],
      is_pinned: false,
    })

    // 如果是全新分类，追加进记忆库
    if (itemCategory && !customCategories.includes(itemCategory)) {
      setCustomCategories((prev) => [...prev, itemCategory])
    }

    // 重置并关闭
    setNewTitle("")
    setNewCategory("")
    setNewContent("")
    setIsAddOpen(false)
  }

  function getTypeIcon(type: VaultItemType) {
    switch (type) {
      case "text":
        return <FileText className="h-4 w-4 text-sky-500" />
      case "url":
        return <LinkIcon className="h-4 w-4 text-emerald-500" />
      case "image":
        return <ImageIcon className="h-4 w-4 text-amber-500" />
      case "pdf":
        return <FileCode className="h-4 w-4 text-rose-500" />
      default:
        return <FileText className="h-4 w-4 text-indigo-500" />
    }
  }

  function getTypeLabel(type: VaultItemType) {
    switch (type) {
      case "text":
        return "纯文本/笔记"
      case "url":
        return "网页书签"
      case "image":
        return "图片资产"
      case "pdf":
        return "PDF 文档"
      default:
        return "通用归档"
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* 顶部操作控制条 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-6 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="全局检索标题或密文内容..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl h-10 bg-slate-50 dark:bg-slate-900 border-none shadow-xs"
            />
          </div>

          <Select
            value={selectedType}
            onValueChange={(val) => setSelectedType(val as VaultItemType | "all")}
          >
            <SelectTrigger className="w-36 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-none shadow-xs">
              <SelectValue placeholder="所有格式" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">所有格式</SelectItem>
              <SelectItem value="text">纯文本/笔记</SelectItem>
              <SelectItem value="url">网页书签</SelectItem>
              <SelectItem value="image">图片资产</SelectItem>
              <SelectItem value="pdf">PDF 文档</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddOpen(true)}
            className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-md px-4"
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium">新建安全档案</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onLockNow}
            title="立即上锁保护"
            className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Lock className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 主体左右分栏体系 */}
      <div className="flex flex-1 overflow-hidden pt-6 gap-6">
        {/* 左侧：动态目录分类树 */}
        <div className="w-48 sm:w-56 flex flex-col gap-1 border-r pr-4 shrink-0 overflow-y-auto">
          <div className="text-xs font-bold text-muted-foreground px-3 py-1 tracking-wider uppercase">
            档案归类夹 (Folders)
          </div>

          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all w-full text-left ${
              selectedCategory === null
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Folder className="h-4 w-4" />
            <span className="flex-1 truncate">全部档案记录</span>
            <span className="text-xs bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-muted-foreground">
              {items.length}
            </span>
          </button>

          {categories.map((cat) => {
            const count = items.filter((i) => i.category === cat).length
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all w-full text-left group ${
                  isSelected
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <Folder className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                <span className="flex-1 truncate">{cat}</span>
                {count > 0 && (
                  <span className="text-xs bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-muted-foreground">
                    {count}
                  </span>
                )}
              </button>
            )
          })}

          {/* 自定义增加分类快捷入口 */}
          <button
            onClick={() => {
              const name = window.prompt("请输入新的自定义档案归类名称：")
              if (name && name.trim()) {
                const trimmed = name.trim()
                if (!customCategories.includes(trimmed)) {
                  setCustomCategories((p) => [...p, trimmed])
                  setSelectedCategory(trimmed)
                }
              }
            }}
            className="flex items-center gap-2 px-3 py-2 mt-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-primary transition-all border border-dashed border-slate-200 dark:border-slate-800"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>开辟新档案分类...</span>
          </button>
        </div>

        {/* 右侧：档案卡片网格列表展示区 */}
        <div className="flex-1 overflow-y-auto pr-2">
          {filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground border border-dashed rounded-2xl bg-slate-50/40 dark:bg-slate-950/40"
            >
              <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                当前筛选维度下未找到安全档案
              </p>
              <p className="text-xs mt-1">尝试切换左侧分类或点击右上角新建档案存入资产</p>
            </motion.div>
          ) : (
            <div className="space-y-6 pb-12">
              {/* 置顶区域 */}
              {pinnedItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary px-1 uppercase tracking-wider">
                    <Pin className="h-3 w-3 fill-primary rotate-45" />
                    <span>置顶保护档案</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pinnedItems.map((item) => renderCard(item))}
                  </div>
                </div>
              )}

              {/* 普通区域 */}
              {normalItems.length > 0 && (
                <div className="space-y-3">
                  {pinnedItems.length > 0 && (
                    <div className="text-xs font-bold text-muted-foreground px-1 uppercase tracking-wider pt-2 border-t">
                      常规归档记录
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {normalItems.map((item) => renderCard(item))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 新建安全档案弹窗 (Create Asset Form Dialog) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                开辟并存入新安全档案
              </DialogTitle>
            </DialogHeader>

            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  档案标题 (Title) *
                </Label>
                <Input
                  id="title"
                  placeholder="例如：公司云服务集群超级管理证书..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-11 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    资产格式 (Type)
                  </Label>
                  <Select
                    value={newType}
                    onValueChange={(val) => {
                      setNewType(val as VaultItemType)
                      setNewContent("") // 切换类型重置缓存
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="选择格式" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="text">纯文本/密文笔记</SelectItem>
                      <SelectItem value="url">网页链接/书签</SelectItem>
                      <SelectItem value="image">上传静态图片</SelectItem>
                      <SelectItem value="pdf">上传 PDF 单据</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    归类档案标签 (Folder)
                  </Label>
                  <Input
                    id="category"
                    placeholder="输入或沿用当前分类..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="h-11 rounded-xl"
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 动态内容输入表单区 */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  加密承载密文或文件源数据 (Payload Content) *
                </Label>

                {newType === "text" && (
                  <textarea
                    placeholder="在此输入您的机密文本、代码秘钥或任意备忘记录..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full h-36 rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    required
                  />
                )}

                {newType === "url" && (
                  <Input
                    type="url"
                    placeholder="https://example.com/secure-portal..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="h-11 rounded-xl"
                    required
                  />
                )}

                {(newType === "image" || newType === "pdf") && (
                  <div className="flex flex-col gap-3">
                    <Input
                      type="file"
                      accept={newType === "image" ? "image/*" : "application/pdf"}
                      onChange={handleFileUpload}
                      className="h-11 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                      required={!newContent}
                    />
                    {newContent && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/50 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        文件已成功转化为客户端本地安全 Base64 数据源缓存
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddOpen(false)}
                className="h-10 rounded-xl"
              >
                取消
              </Button>
              <Button type="submit" className="h-10 rounded-xl bg-primary px-6 shadow-md">
                安全加密存入档案库
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )

  // 渲染单张安全档案卡片
  function renderCard(item: VaultItem) {
    const isSelected = selectedItem?.id === item.id
    return (
      <motion.div
        key={item.id}
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          onClick={() => onSelectItem(item)}
          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer group relative overflow-hidden flex flex-col justify-between h-36 ${
            isSelected
              ? "border-primary bg-primary/5 shadow-md"
              : "bg-white dark:bg-slate-900 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
          }`}
        >
          {/* 左侧类型高亮指示带 */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${
              isSelected ? "bg-primary" : "bg-transparent group-hover:bg-slate-200 dark:group-hover:bg-slate-800"
            }`}
          />

          <div className="space-y-2 min-w-0 pl-1">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium text-[10px] shrink-0">
                {item.category || "未归档"}
              </span>

              <div className="flex items-center gap-1 shrink-0">
                {/* 快速置顶 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onTogglePin(item.id)
                  }}
                  className={`p-1 rounded-md transition-colors ${
                    item.is_pinned
                      ? "text-primary bg-primary/10"
                      : "text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100"
                  }`}
                  title={item.is_pinned ? "取消置顶保护" : "设为置顶保护"}
                >
                  <Pin className={`h-3 w-3 ${item.is_pinned ? "fill-primary rotate-45" : ""}`} />
                </button>

                {/* 快速删除 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm(`确定要彻底删除该绝密安全档案「${item.title}」吗？`)) {
                      onDeleteItem(item.id)
                    }
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                  title="彻底销毁档案"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
              {item.title}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 pl-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              {getTypeIcon(item.type)}
              <span className="text-[11px] font-medium">{getTypeLabel(item.type)}</span>
            </div>
            <span className="text-[10px] text-slate-400 scale-90 origin-right">{item.created_at}</span>
          </div>
        </Card>
      </motion.div>
    )
  }
}
