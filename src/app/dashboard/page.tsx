"use client"

import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutDashboard, CheckSquare, Clock, AlertCircle } from "lucide-react"

const stats = [
  { title: "总任务", value: "—", icon: CheckSquare, desc: "后续版本接入" },
  { title: "进行中", value: "—", icon: Clock, desc: "后续版本接入" },
  { title: "已完成", value: "—", icon: LayoutDashboard, desc: "后续版本接入" },
  { title: "待处理", value: "—", icon: AlertCircle, desc: "后续版本接入" },
]

export default function DashboardPage() {
  const { data: session } = useSession()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          欢迎回来，{session?.user?.name ?? "User"}
        </h2>
        <p className="text-muted-foreground mt-1">
          这里是你的个人工作中心。更多功能即将上线。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  )
}
