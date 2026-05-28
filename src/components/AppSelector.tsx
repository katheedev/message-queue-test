import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppService } from "@/services/appService";
import { App } from "@/types/environment";
import { useUser } from "@/contexts/UserContext";
import { UserService } from "@/services/userService";
import { Layout } from "lucide-react";

export const AppSelector = ({ onAppChange }: { onAppChange: (app: App | null) => void }) => {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const { currentUser, isAdmin } = useUser();

  useEffect(() => {
    const fetchApps = async () => {
      if (!currentUser) return;

      let accessibleApps: App[] = [];
      if (isAdmin) {
        accessibleApps = await AppService.getApps();
      } else {
        const assignedAppIds = await UserService.getAssignmentsForUser(currentUser.id);
        const allApps = await AppService.getApps();
        accessibleApps = allApps.filter(app => assignedAppIds.includes(app.id));
      }
      
      setApps(accessibleApps);
      if (accessibleApps.length > 0 && !selectedAppId) {
        setSelectedAppId(accessibleApps[0].id);
        onAppChange(accessibleApps[0]);
      }
    };

    fetchApps();
  }, [currentUser, isAdmin]);

  const handleSelect = (appId: string) => {
    setSelectedAppId(appId);
    const app = apps.find(a => a.id === appId) || null;
    onAppChange(app);
  };

  if (!currentUser) return null;

  return (
    <div className="flex items-center gap-2">
      <Layout className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedAppId} onValueChange={handleSelect}>
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue placeholder="Select Application" />
        </SelectTrigger>
        <SelectContent>
          {apps.map((app) => (
            <SelectItem key={app.id} value={app.id}>
              {app.name}
            </SelectItem>
          ))}
          {apps.length === 0 && (
            <div className="p-2 text-xs text-muted-foreground">No apps assigned</div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
