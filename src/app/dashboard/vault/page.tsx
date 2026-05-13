"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { VaultLock } from "@/components/vault/vault-lock"
import { VaultDashboard } from "@/components/vault/vault-dashboard"
import { VaultPreview } from "@/components/vault/vault-preview"
import {
  type VaultItem,
  getVaultItemsClient,
  saveVaultItemsClient,
} from "@/lib/vault-types"

export default function VaultPage() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [items, setItems] = useState<VaultItem[]>([])
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null)

  // 挂载后从客户端防窥持久层装载资产
  useEffect(() => {
    const loaded = getVaultItemsClient()
    setItems(loaded)
    // 默认选中第一项以提供初始优质预览对照体验
    if (loaded.length > 0) {
      setSelectedItem(loaded[0])
    }
  }, [])

  // 5分钟无操作自动重置锁屏机制 (Auto-lock Timeout Security Layer)
  useEffect(() => {
    if (!isUnlocked) return

    const LOCK_TIMEOUT_MS = 5 * 60 * 1000 // 5 分钟
    let timer = setTimeout(() => {
      setIsUnlocked(false)
    }, LOCK_TIMEOUT_MS)

    function handleUserActivity() {
      clearTimeout(timer)
      timer = setTimeout(() => {
        setIsUnlocked(false)
      }, LOCK_TIMEOUT_MS)
    }

    // 监听核心交互事件以维持存活态
    window.addEventListener("mousemove", handleUserActivity)
    window.addEventListener("keydown", handleUserActivity)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("mousemove", handleUserActivity)
      window.removeEventListener("keydown", handleUserActivity)
    }
  }, [isUnlocked])

  function handleSaveItem(newItem: VaultItem) {
    const nextItems = [newItem, ...items]
    setItems(nextItems)
    saveVaultItemsClient(nextItems)
    setSelectedItem(newItem) // 存入后立即自动挂载至视窗
  }

  function handleDeleteItem(id: string) {
    const nextItems = items.filter((i) => i.id !== id)
    setItems(nextItems)
    saveVaultItemsClient(nextItems)
    if (selectedItem?.id === id) {
      setSelectedItem(nextItems.length > 0 ? nextItems[0] : null)
    }
  }

  function handleTogglePin(id: string) {
    const nextItems = items.map((i) =>
      i.id === id ? { ...i, is_pinned: !i.is_pinned } : i
    )
    setItems(nextItems)
    saveVaultItemsClient(nextItems)
    if (selectedItem?.id === id) {
      setSelectedItem({ ...selectedItem, is_pinned: !selectedItem.is_pinned })
    }
  }

  return (
    <div className="h-full relative">
      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          <motion.div
            key="lock-screen"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-10 bg-background"
          >
            <VaultLock onUnlock={() => setIsUnlocked(true)} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start"
          >
            {/* 左半控制与网格看板区 */}
            <div className="lg:col-span-7 xl:col-span-8 h-full">
              <VaultDashboard
                items={items}
                onSaveItem={handleSaveItem}
                onDeleteItem={handleDeleteItem}
                onTogglePin={handleTogglePin}
                onSelectItem={setSelectedItem}
                selectedItem={selectedItem}
                onLockNow={() => setIsUnlocked(false)}
              />
            </div>

            {/* 右半常驻全能预览视窗区 */}
            <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-0 h-[calc(100vh-100px)]">
              <VaultPreview
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
