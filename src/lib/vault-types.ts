export type VaultItemType = "text" | "url" | "image" | "pdf" | "document"

export interface VaultItem {
  id: string
  title: string
  category: string
  type: VaultItemType
  content: string // 本地纯文本内容、外部 URL 链接或 Base64 资产数据
  created_at: string
  is_pinned?: boolean
}

const VAULT_STORAGE_KEY = "work_hub_vault_items"
const VAULT_PIN_KEY = "work_hub_vault_pin"

const INITIAL_VAULT_ITEMS: VaultItem[] = [
  {
    id: "v-seed-1",
    title: "生产服务器 Root 访问配置与密钥指南",
    category: "核心凭证",
    type: "text",
    content: `Host production-workhub
  HostName 203.0.113.195
  User super_admin
  Port 22022
  IdentityFile ~/.ssh/workhub_production_ed25519

# 部署守则：
1. 严禁直接通过密码认证登录
2. 任何生产环境变量修改需双人核验
3. 数据库全量备份周期为每日凌晨 03:00 (UTC+10)`,
    created_at: "2026-05-10",
    is_pinned: true,
  },
  {
    id: "v-seed-2",
    title: "Dribbble 全球顶尖拟物与流线光影 UI 设计集",
    category: "灵感宝库",
    type: "url",
    content: "https://dribbble.com/shots/popular/web-design",
    created_at: "2026-05-12",
    is_pinned: false,
  },
]

export function getVaultItemsClient(): VaultItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(INITIAL_VAULT_ITEMS))
      return INITIAL_VAULT_ITEMS
    }
    return JSON.parse(raw) as VaultItem[]
  } catch (e) {
    console.error("解析保险箱本地存储记录失败，使用初始样本数据", e)
    return INITIAL_VAULT_ITEMS
  }
}

export function saveVaultItemsClient(items: VaultItem[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(items))
  } catch (e) {
    console.error("保存保险箱数据至本地存储失败", e)
  }
}

export function generateVaultId(): string {
  return "v-" + Math.random().toString(36).substring(2, 9)
}

export function getVaultPin(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(VAULT_PIN_KEY)
}

export function setVaultPin(pin: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(VAULT_PIN_KEY, pin)
}

export function verifyVaultPin(pin: string): boolean {
  const saved = getVaultPin()
  // 默认初始体验密码为 0527 (基于发送者邮箱中提及的代表数字)，或匹配用户已设定的专属 PIN
  if (!saved) return pin === "0527"
  return pin === saved
}
