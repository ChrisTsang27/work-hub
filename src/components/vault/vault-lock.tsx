"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, ShieldCheck, RotateCcw, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getVaultPin, setVaultPin, verifyVaultPin } from "@/lib/vault-types"

interface Props {
  onUnlock: () => void
}

export function VaultLock({ onUnlock }: Props) {
  const [pin, setPin] = useState("")
  const [errorShake, setErrorShake] = useState(false)
  const [isSettingNew, setIsSettingNew] = useState(false)
  const [confirmPin, setConfirmPin] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [activeDigit, setActiveDigit] = useState<number | null>(0)
  const dialRef = useRef<HTMLDivElement>(null)

  // 检测是否初次使用
  useEffect(() => {
    const existing = getVaultPin()
    if (!existing) {
      setIsSettingNew(true)
    }
  }, [])

  // 键盘盲打监听：双轨联动的精髓
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // 如果按下了回退键
      if (e.key === "Backspace") {
        setPin((prev) => prev.slice(0, -1))
        return
      }

      // 如果按下了数字键
      if (/^[0-9]$/.test(e.key)) {
        const digit = Number(e.key)
        handleDigitInput(digit)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [pin, isSettingNew, confirmPin])

  // 处理单个数字输入与机械表盘超高速飞转响应
  function handleDigitInput(digit: number) {
    if (pin.length >= 4) return

    const nextPin = pin + digit
    setPin(nextPin)
    setActiveDigit(digit)

    // 计算目标对准角度：每个数字占 36 度，逆时针转动使数字对准正上方指针
    const targetAngle = -digit * 36
    // 为了呈现飞速旋转的多圈视觉残影快感，增加额外的 360 度基础旋量
    setRotation(targetAngle - 360)

    // 如果满 4 位，触发校验或保存设定
    if (nextPin.length === 4) {
      setTimeout(() => {
        processCompletedPin(nextPin)
      }, 400)
    }
  }

  function processCompletedPin(completedPin: string) {
    if (isSettingNew) {
      if (confirmPin === null) {
        // 进入确认密码环节
        setConfirmPin(completedPin)
        setPin("")
        setRotation(0)
      } else {
        // 两次比对
        if (completedPin === confirmPin) {
          setVaultPin(completedPin)
          onUnlock()
        } else {
          // 不匹配，重振提示
          triggerError()
          setConfirmPin(null)
        }
      }
    } else {
      // 常规解锁比对
      if (verifyVaultPin(completedPin)) {
        onUnlock()
      } else {
        triggerError()
      }
    }
  }

  function triggerError() {
    setErrorShake(true)
    setTimeout(() => setErrorShake(false), 500)
    setPin("")
  }

  // 支持点击转盘周围刻度数字直接拨号
  function handleSectorClick(digit: number) {
    handleDigitInput(digit)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-4 select-none">
      <motion.div
        animate={errorShake ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md flex flex-col items-center bg-slate-900 dark:bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* 顶部指示灯与锁头徽标 */}
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
            {isSettingNew ? <ShieldCheck className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
              {isSettingNew ? "Vault Initialization" : "Secure Doorway"}
            </span>
            <span className="text-sm font-semibold text-white">
              {isSettingNew
                ? confirmPin !== null
                  ? "请再次输入以确认专属 PIN"
                  : "初次开启，请设定专属 4 位 PIN 码"
                : "输入专属密码以解锁私密保险箱"}
            </span>
          </div>
        </div>

        {/* 电子数码管回显屏 (Digital Nixie Display) */}
        <div className="w-full bg-slate-950 border border-slate-800/80 rounded-xl py-4 px-6 flex items-center justify-center gap-3 mb-8 shadow-inner">
          {[0, 1, 2, 3].map((index) => {
            const hasChar = index < pin.length
            return (
              <div
                key={index}
                className="w-12 h-14 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xl font-bold text-primary relative overflow-hidden"
              >
                {hasChar ? (
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-white"
                  >
                    •
                  </motion.span>
                ) : (
                  <span className="text-slate-700 text-xs font-normal">_</span>
                )}
                {/* 当前输入位底部呼吸光 */}
                {index === pin.length && (
                  <motion.div
                    animate={{ opacity: [0.2, 0.8, 0.2] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="absolute bottom-1 w-4 h-0.5 bg-primary"
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* 正上方机械指针指示器 */}
        <div className="flex flex-col items-center mb-1 relative z-10">
          <div className="w-1 h-3 bg-primary rounded-full shadow-md shadow-primary" />
          <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-6 border-t-primary mt-0.5" />
        </div>

        {/* 殿堂级同心圆机械拨盘 (Mechanical Rotary Dial) */}
        <div className="relative w-64 h-64 my-2 flex items-center justify-center" ref={dialRef}>
          {/* 外圈静止深空灰金属质感底座 */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-800 to-slate-950 border-4 border-slate-700 shadow-xl flex items-center justify-center">
            <div className="w-48 h-48 rounded-full bg-slate-950 border border-slate-800 shadow-inner" />
          </div>

          {/* 动态旋转表盘层 */}
          <motion.div
            animate={{ rotate: rotation }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 14,
              mass: 0.8,
            }}
            className="absolute inset-2 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            {/* 绘制 10 个数字扇区刻度 */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
              const angle = digit * 36
              return (
                <div
                  key={digit}
                  style={{ transform: `rotate(${angle}deg)` }}
                  className="absolute inset-0 flex flex-col items-center justify-start pt-2 pointer-events-none"
                >
                  {/* 精密刻度线 */}
                  <div className="w-0.5 h-2 bg-slate-500 rounded-full mb-1" />
                  {/* 刻度数字 */}
                  <button
                    style={{ transform: `rotate(-${angle}deg)` }} // 保持数字永远正向可读
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all pointer-events-auto"
                    onClick={() => handleSectorClick(digit)}
                  >
                    {digit}
                  </button>
                </div>
              )
            })}

            {/* 表盘内侧精密的拉丝同心圆与中心轴 */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
              <div className="w-6 h-6 rounded-full bg-slate-950 border border-slate-600 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* 底部贴心操作提示与快捷清除 */}
        <div className="flex items-center justify-between w-full mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            支持直接物理键盘键入密码
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => {
              setPin("")
              setRotation(0)
            }}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            重置拨盘
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
