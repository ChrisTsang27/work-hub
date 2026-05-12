import { LoginForm } from "@/components/login-form"
import { AnimatedBackground } from "@/components/animated-background"

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <AnimatedBackground />
      <div className="relative z-10">
        <LoginForm />
      </div>
    </div>
  )
}
