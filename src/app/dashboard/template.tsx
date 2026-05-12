"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

export default function DashboardTemplate({
  children,
}: {
  children: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  )
}
