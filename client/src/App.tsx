import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/components/ThemeProvider"
import Login from "@/pages/Login"
import DashboardLayout from "@/layouts/DashboardLayout"
import { Toaster } from "@/components/ui/toast"
import Overview from "@/pages/Dashboard/Overview"
import Surveys from "@/pages/Dashboard/Surveys"
import Analytics from "@/pages/Dashboard/Analytics"
import Settings from "@/pages/Dashboard/Settings"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("truetone-token")
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="truetone-theme">
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="surveys" element={<Surveys />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
