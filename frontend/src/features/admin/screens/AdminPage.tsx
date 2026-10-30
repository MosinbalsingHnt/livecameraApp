import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/authStore'
import { AuditTab, IcccTab, PassesTab } from '../components/LogTabs'
import { OfficersTab } from '../components/OfficersTab'
import { SettingsTab } from '../components/SettingsTab'
import { UsersTab } from '../components/UsersTab'
import { VehiclesTab } from '../components/VehiclesTab'
import { WardsTab } from '../components/WardsTab'

export default function AdminPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin')
  return (
    <Tabs defaultValue="officers">
      <TabsList>
        <TabsTrigger value="officers">Officers</TabsTrigger>
        <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
        <TabsTrigger value="wards">Wards</TabsTrigger>
        {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
        <TabsTrigger value="settings">Rules and SLAs</TabsTrigger>
        <TabsTrigger value="audit">Audit log</TabsTrigger>
        <TabsTrigger value="iccc">ICCC feed</TabsTrigger>
        <TabsTrigger value="passes">Vehicle passes</TabsTrigger>
      </TabsList>
      <TabsContent value="officers"><OfficersTab isAdmin={isAdmin} /></TabsContent>
      <TabsContent value="vehicles"><VehiclesTab isAdmin={isAdmin} /></TabsContent>
      <TabsContent value="wards"><WardsTab isAdmin={isAdmin} /></TabsContent>
      {isAdmin && <TabsContent value="users"><UsersTab /></TabsContent>}
      <TabsContent value="settings"><SettingsTab isAdmin={isAdmin} /></TabsContent>
      <TabsContent value="audit"><AuditTab /></TabsContent>
      <TabsContent value="iccc"><IcccTab /></TabsContent>
      <TabsContent value="passes"><PassesTab /></TabsContent>
    </Tabs>
  )
}
