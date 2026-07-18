import { useState, useCallback } from "react"
import { api } from "@/lib/api"

interface User {
  id: string
  email: string
  role: string
  orgId: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem("truetone-token")
    const userStr = localStorage.getItem("truetone-user")
    if (token && userStr) {
      try {
        return { token, user: JSON.parse(userStr), loading: false }
      } catch {
        return { token: null, user: null, loading: false }
      }
    }
    return { token: null, user: null, loading: false }
  })

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    localStorage.setItem("truetone-token", res.token)
    localStorage.setItem("truetone-user", JSON.stringify(res.user))
    setState({ token: res.token, user: res.user, loading: false })
    return res
  }, [])

  const register = useCallback(async (email: string, password: string, orgName: string) => {
    const res = await api.register(email, password, orgName)
    localStorage.setItem("truetone-token", res.token)
    localStorage.setItem("truetone-user", JSON.stringify(res.user))
    setState({ token: res.token, user: res.user, loading: false })
    return res
  }, [])

  const logout = useCallback(() => {
    api.logout().catch(() => {})
    localStorage.removeItem("truetone-token")
    localStorage.removeItem("truetone-user")
    setState({ token: null, user: null, loading: false })
  }, [])

  return { ...state, login, register, logout }
}
