import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppService } from "@/services/appService";
import { UserService } from "@/services/userService";
import { App, User } from "@/types/environment";
import { Plus, Users, Layout, ShieldCheck, Trash2, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const AdminDashboard = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [qas, setQAs] = useState<User[]>([]);
  const [newAppName, setNewAppName] = useState("");
  const [newAppDesc, setNewAppDesc] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [selectedQAId, setSelectedQAId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const fetchedApps = await AppService.getApps();
      const fetchedQAs = await UserService.getQAs();
      setApps(fetchedApps);
      setQAs(fetchedQAs);
    } catch (error) {
      console.error("Firebase Fetch Data Error:", error);
    }
  };

  const handleCreateApp = async () => {
    if (!newAppName) return;
    try {
      await AppService.createApp({
        name: newAppName,
        description: newAppDesc,
        consumers: []
      });
      setNewAppName("");
      setNewAppDesc("");
      fetchData();
      toast({ title: "App Created", description: `Successfully created ${newAppName}` });
    } catch (error) {
      console.error("Firebase Create App Error:", error);
      toast({ title: "Error", description: "Failed to create app", variant: "destructive" });
    }
  };

  const handleAssignQA = async () => {
    if (!selectedAppId || !selectedQAId) return;
    try {
      await UserService.assignUserToApp(selectedQAId, selectedAppId);
      toast({ title: "QA Assigned", description: "Successfully assigned QA to application" });
    } catch (error) {
      console.error("Firebase Assign QA Error:", error);
      toast({ title: "Error", description: "Failed to assign QA", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* App Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Application
            </CardTitle>
            <CardDescription>Define a new business domain for testing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appName">Application Name</Label>
              <Input 
                id="appName" 
                value={newAppName} 
                onChange={(e) => setNewAppName(e.target.value)} 
                placeholder="e.g. Crew Management" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appDesc">Description</Label>
              <Input 
                id="appDesc" 
                value={newAppDesc} 
                onChange={(e) => setNewAppDesc(e.target.value)} 
                placeholder="Briefly explain what this app does" 
              />
            </div>
            <Button onClick={handleCreateApp} className="w-full">Create App</Button>
          </CardContent>
        </Card>

        {/* User Assignment */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Register New QA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qaName">Full Name</Label>
                <Input id="qaName" placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qaEmail">Email Address</Label>
                <Input id="qaEmail" type="email" placeholder="john@example.com" />
              </div>
              <Button 
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const name = (document.getElementById('qaName') as HTMLInputElement).value;
                  const email = (document.getElementById('qaEmail') as HTMLInputElement).value;
                  if (!name || !email) return;
                  try {
                    const id = email.replace(/[^a-zA-Z0-9]/g, '_');
                    await UserService.createUser({ id, name, email, role: 'qa' });
                    toast({ title: "QA Registered", description: "Successfully added new QA tester" });
                    fetchData();
                    (document.getElementById('qaName') as HTMLInputElement).value = '';
                    (document.getElementById('qaEmail') as HTMLInputElement).value = '';
                  } catch (e) {
                    toast({ title: "Error", description: "Failed to register QA", variant: "destructive" });
                  }
                }}
              >
                Register QA
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Assign QA to App
              </CardTitle>
              <CardDescription>Grant testers access to specific domains</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Application</Label>
                <Select value={selectedAppId} onValueChange={setSelectedAppId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select App" />
                  </SelectTrigger>
                  <SelectContent>
                    {apps.filter(app => app.id).map(app => (
                      <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select QA Tester</Label>
                <Select value={selectedQAId} onValueChange={setSelectedQAId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select QA" />
                  </SelectTrigger>
                  <SelectContent>
                    {qas.filter(qa => qa.id).map(qa => (
                      <SelectItem key={qa.id} value={qa.id}>{qa.name} ({qa.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignQA} className="w-full" variant="secondary">Assign Access</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Apps List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              Manage Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {apps.map(app => (
                  <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="font-medium">{app.name}</div>
                      <div className="text-xs text-muted-foreground">{app.description}</div>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {app.consumers.length} Consumers
                      </Badge>
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* QAs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registered QAs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {qas.map(qa => (
                  <div key={qa.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{qa.name}</div>
                        <div className="text-xs text-muted-foreground">{qa.email}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-primary/5 text-primary">QA</Badge>
                  </div>
                ))}
                {qas.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No QAs registered in the system yet.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
