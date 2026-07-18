import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/useAuth"
import {
  User,
  Bell,
  Webhook,
  Key,
  Save,
} from "lucide-react"

export default function Settings() {
  const { user } = useAuth()

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and organization preferences.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Profile</CardTitle>
          </div>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={user?.role?.toLowerCase() ?? ""} readOnly />
            </div>
          </div>
          <Button size="sm" className="gap-2">
            <Save className="h-4 w-4" /> Save changes
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Notifications</CardTitle>
          </div>
          <CardDescription>Configure alert preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">New responses</p>
              <p className="text-xs text-muted-foreground">Get notified when new responses are collected</p>
            </div>
            <Button variant="outline" size="sm">Configure</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">High urgency alerts</p>
              <p className="text-xs text-muted-foreground">Immediate alerts for negative feedback</p>
            </div>
            <Button variant="outline" size="sm">Configure</Button>
          </div>
        </CardContent>
      </Card>

      {/* API */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">API & Integrations</CardTitle>
          </div>
          <CardDescription>Webhook endpoints and API keys</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Webhook URL</p>
              <p className="text-xs text-muted-foreground">Send response data to your endpoint</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Webhook className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">API Keys</p>
              <p className="text-xs text-muted-foreground">Manage API access tokens</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Key className="h-3.5 w-3.5" /> Manage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
