"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, ShieldCheck, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getVaultPin, setVaultPin, verifyVaultPin, clearVaultPin } from "@/lib/vault-types"

interface Props {
  onUnlock: () => void
}

export function VaultLock({ onUnlock }: Props) {
  const [pin, setPin] = useState("")
  const [errorShake, setErrorShake] = useState(false)
  const [isSettingNew, setIsSettingNew] = useState(false)
  const [confirmPin, setConfirmPin] = useState<string | null>(null)

  // 旋转与拖拽状态
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [pointedDigit, setPointedDigit] = useState<number>(0)
  const [justSelectedDigit, setJustSelectedDigit] = useState<number | null>(null)

  const dialRef = useRef<HTMLDivElement>(null)
  const prevAngleRef = useRef(0)
  const accumulatedRotationRef = useRef(0)

  // 检测是否初次使用
  useEffect(() => {
    const existing = getVaultPin()
    if (!existing) {
      setIsSettingNew(true)
    }
  }, [])

  // 物理键盘监听支持
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Backspace") {
        setPin((prev) => prev.slice(0, -1))
        return
      }
      if (/^[0-9]$/.test(e.key)) {
        const digit = Number(e.key)
        handleDigitInput(digit, true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [pin, isSettingNew, confirmPin])

  // 处理输入核心逻辑
  function handleDigitInput(digit: number, autoRotate = true) {
    if (pin.length >= 6) return

    const nextPin = pin + digit
    setPin(nextPin)
    setPointedDigit(digit)

    // 强烈的选定视觉反馈
    setJustSelectedDigit(digit)
    setTimeout(() => {
      setJustSelectedDigit((prev) => (prev === digit ? null : prev))
    }, 600)

    if (autoRotate) {
      // 自动平滑旋转到对应刻度
      const baseTurns = Math.floor(accumulatedRotationRef.current / 360)
      let targetSnap = baseTurns * 360 + digit * 36
      // 寻找最短旋转路径
      if (targetSnap - accumulatedRotationRef.current > 180) targetSnap -= 360
      else if (targetSnap - accumulatedRotationRef.current < -180) targetSnap += 360

      accumulatedRotationRef.current = targetSnap
      setRotation(targetSnap)
    }

    // 满 6 位触发后续流程
    if (nextPin.length === 6) {
      setTimeout(() => {
        processCompletedPin(nextPin)
      }, 400)
    }
  }

  function processCompletedPin(completedPin: string) {
    if (isSettingNew) {
      if (confirmPin === null) {
        // 进入确认环节
        setConfirmPin(completedPin)
        setPin("")
        accumulatedRotationRef.current = 0
        setRotation(0)
        setPointedDigit(0)
      } else {
        if (completedPin === confirmPin) {
          setVaultPin(completedPin)
          onUnlock()
        } else {
          triggerError()
          setConfirmPin(null)
        }
      }
    } else {
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
    accumulatedRotationRef.current = 0
    setRotation(0)
    setPointedDigit(0)
  }

  // 点击数字直接输入
  function handleSectorClick(digit: number) {
    handleDigitInput(digit, true)
  }

  // 鼠标/手指按下开始拖拽旋钮
  function handlePointerDown(e: React.PointerEvent) {
    if (pin.length >= 6) return
    setIsDragging(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}

    if (!dialRef.current) return
    const rect = dialRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = e.clientX - centerX
    const dy = e.clientY - centerY
    let rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90
    if (rawAngle < 0) rawAngle += 360

    prevAngleRef.current = rawAngle

    // 对齐累加角度到当前点击位置的最短同余角
    const currentTurns = Math.floor(accumulatedRotationRef.current / 360)
    let targetAcc = currentTurns * 360 + rawAngle
    if (targetAcc - accumulatedRotationRef.current > 180) targetAcc -= 360
    else if (targetAcc - accumulatedRotationRef.current < -180) targetAcc += 360

    accumulatedRotationRef.current = targetAcc
    setRotation(targetAcc)

    const normalizedAngle = ((targetAcc % 360) + 360) % 360
    const closestDigit = Math.round(normalizedAngle / 36) % 10
    setPointedDigit(closestDigit)
  }

  // 拖动过程
  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || !dialRef.current) return

    const rect = dialRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = e.clientX - centerX
    const dy = e.clientY - centerY
    let rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90
    if (rawAngle < 0) rawAngle += 360

    // 计算与上一帧的最短差值，实现无缝连续多圈转动
    let delta = rawAngle - prevAngleRef.current
    if (delta > 180) delta -= 360
    else if (delta < -180) delta += 360

    accumulatedRotationRef.current += delta
    prevAngleRef.current = rawAngle

    const normalizedAngle = ((accumulatedRotationRef.current % 360) + 360) % 360
    const closestDigit = Math.round(normalizedAngle / 36) % 10

    setRotation(accumulatedRotationRef.current)
    setPointedDigit(closestDigit)
  }

  // 结束拖拽，自动吸附并输入当前选中的数字
  function handlePointerUp(e: React.PointerEvent) {
    if (!isDragging) return
    setIsDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}

    const normalizedAngle = ((accumulatedRotationRef.current % 360) + 360) % 360
    const closestDigit = Math.round(normalizedAngle / 36) % 10

    // 寻找目标数字对应的吸附角度
    const baseTurns = Math.floor(accumulatedRotationRef.current / 360)
    let targetSnap = baseTurns * 360 + closestDigit * 36
    if (targetSnap - accumulatedRotationRef.current > 180) targetSnap -= 360
    else if (targetSnap - accumulatedRotationRef.current < -180) targetSnap += 360

    accumulatedRotationRef.current = targetSnap
    setRotation(targetSnap)
    setPointedDigit(closestDigit)

    // 触发选定并输入
    handleDigitInput(closestDigit, false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-4 select-none">
      <motion.div
        animate={errorShake ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md flex flex-col items-center bg-slate-900 dark:bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* 顶部指示灯与锁头标题 */}
        <div className="flex items-center gap-3 mb-6 w-full">
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm">
            {isSettingNew ? <ShieldCheck className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-sky-400 tracking-wider uppercase">
              {isSettingNew ? "Vault Initialization" : "Secure Doorway"}
            </span>
            <span className="text-sm font-semibold text-white mt-0.5">
              {isSettingNew
                ? confirmPin !== null
                  ? "请再次输入以确认专属 PIN"
                  : "初次开启，请设定专属 6 位 PIN 码"
                : "输入专属密码以解锁私密保险箱"}
            </span>
          </div>
        </div>

        {/* 电子数码管回显屏 (Digital Display Slots - 6 digits) */}
        <div className="w-full bg-slate-950 border border-slate-800/80 rounded-xl py-3 px-4 flex items-center justify-center gap-2.5 mb-6 shadow-inner">
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const hasChar = index < pin.length
            const isNewlyTyped = index === pin.length - 1
            return (
              <div
                key={index}
                className={`w-10 h-12 rounded-xl flex items-center justify-center text-xl font-bold relative transition-all ${
                  hasChar
                    ? "bg-slate-900 border border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                    : "bg-slate-950 border border-slate-800/60"
                }`}
              >
                {hasChar ? (
                  <motion.span
                    initial={{ scale: 0.2, opacity: 0 }}
                    animate={isNewlyTyped ? { scale: [1.4, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-white flex items-center justify-center"
                  >
                    •
                  </motion.span>
                ) : (
                  <span className="text-slate-700 text-xs font-normal">_</span>
                )}

                {/* 当前待输入位的底部提示呼吸灯 */}
                {index === pin.length && (
                  <motion.div
                    animate={{ opacity: [0.2, 0.8, 0.2] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="absolute bottom-1.5 w-3.5 h-0.5 bg-sky-400 rounded-full"
                  />
                )}

                {/* 刚键入时的强烈边框闪烁光效 */}
                {isNewlyTyped && (
                  <motion.div
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.2 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 rounded-xl border-2 border-sky-400 pointer-events-none"
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* 转盘与外圈固定数字总成 */}
        <div className="relative w-72 h-72 my-2 flex items-center justify-center" ref={dialRef}>
          {/* 外底盘底座 */}
          <div className="absolute inset-0 rounded-full bg-slate-950 border-4 border-slate-800/80 shadow-2xl flex items-center justify-center" />

          {/* 外层固定数字环 (绝对静止，不跟随内盘转动) */}
          <div className="absolute inset-0 pointer-events-none">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
              const angle = digit * 36
              const isPointed = pointedDigit === digit
              const isSelected = justSelectedDigit === digit

              return (
                <div
                  key={digit}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  {/* 通过旋转到对应角度并沿半径推开，再反向旋转保持数字正立 */}
                  <div
                    style={{
                      transform: `rotate(${angle}deg) translateY(-112px) rotate(-${angle}deg)`,
                    }}
                    className="pointer-events-auto relative"
                  >
                    <button
                      onClick={() => handleSectorClick(digit)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                        isSelected
                          ? "bg-sky-400 text-slate-950 scale-125 ring-4 ring-sky-400/40 shadow-[0_0_20px_rgba(56,189,248,0.8)] z-20"
                          : isPointed
                          ? "bg-slate-800 text-sky-400 border border-sky-400/50 scale-110 shadow-lg z-10"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      {digit}
                    </button>

                    {/* 选中该数字时触发强烈的波纹扩散光效 */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 1, opacity: 0.8 }}
                          animate={{ scale: 1.8, opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="absolute inset-0 rounded-full border-2 border-sky-400 pointer-events-none"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 内部可旋转物理拨盘总成 (支持鼠标/触摸顺滑拖动) */}
          <div className="absolute w-44 h-44 rounded-full flex items-center justify-center shadow-lg">
            {/* 仅旋转外壳底座与指针 */}
            <motion.div
              animate={{ rotate: rotation }}
              transition={{
                type: "spring",
                stiffness: isDragging ? 800 : 350,
                damping: isDragging ? 50 : 25,
                mass: 0.8,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={`w-full h-full rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 flex items-center justify-center relative cursor-grab active:cursor-grabbing shadow-inner transition-shadow ${
                isDragging ? "shadow-[0_0_25px_rgba(56,189,248,0.2)] border-sky-400/40" : ""
              }`}
            >
              {/* 拨盘边缘正上方物理指示指针 (对应盘内朝向 0 度位置) */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="w-1.5 h-4 bg-sky-400 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1 opacity-80" />
              </div>

              {/* 拨盘精密拉丝内圆底座 (纯视觉装饰，不包含文字) */}
              <div className="w-20 h-20 rounded-full bg-slate-950 border border-slate-800 shadow-inner" />
            </motion.div>

            {/* 绝对静止的中央回显文字层 (放置在旋转层上方，完全脱离旋转) */}
            <div className="absolute w-20 h-20 rounded-full flex flex-col items-center justify-center pointer-events-none z-10">
              <span className="text-[10px] text-slate-400 font-medium tracking-tight mb-0.5">目标位</span>
              <span className={`text-xl font-black transition-colors ${isDragging ? "text-sky-400 scale-110" : "text-white"}`}>
                {pointedDigit}
              </span>
            </div>
          </div>
        </div>

        {/* 贴心交互指引 */}
        <div className="text-center mt-4 h-10 flex flex-col justify-center">
          <p className="text-xs font-medium text-sky-400 transition-all">
            {isDragging ? `正在对准数字 ${pointedDigit}，松手确认` : "按住中央旋钮转动对准数字，松手确认"}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            也可直接点击外圈数字快捷输入 · 支持实体键盘
          </p>
        </div>

        {/* 底部重置按钮 */}
        <div className="flex items-center justify-end w-full mt-4 pt-3 border-t border-slate-800/80">
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-7 text-xs text-slate-500 hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => {
              if (window.confirm("确定要强制重置专属密码吗？系统将清空记忆库并重新载入初始化引导页面。")) {
                clearVaultPin()
                window.location.reload()
              }
            }}
          >
            忘记密码？强制重置
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => {
              setPin("")
              accumulatedRotationRef.current = 0
              setRotation(0)
              setPointedDigit(0)
              setConfirmPin(null)
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
