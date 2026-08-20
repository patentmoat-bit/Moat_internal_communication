"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore } from "@/stores/authStore"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: string[]
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore()

  useEffect(() => {
    let mounted = true
    checkAuth().then((authed) => {
      if (mounted && !authed) router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
    })
    return () => { mounted = false }
  }, [checkAuth, router, pathname])

  // isLoading starts false — never block. checkAuth resolves in background via useEffect.

  if (!isAuthenticated) {
    return null
  }

  if (roles && user && !roles.includes(user.role)) {
    router.replace("/403")
    return null
  }

  return <>{children}</>
}