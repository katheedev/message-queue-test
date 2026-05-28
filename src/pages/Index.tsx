import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ConsumerOverview } from "@/components/ConsumerOverview";
import { KafkaConfig } from "@/components/KafkaConfig";
import { JmsConfig } from "@/components/JmsConfig";
import { MessageTester } from "@/components/MessageTester";
import { AdminDashboard } from "@/components/AdminDashboard";
import { EnvironmentSelector } from "@/components/EnvironmentSelector";
import { AppSelector } from "@/components/AppSelector";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { useUser } from "@/contexts/UserContext";
import { Plane, Settings, TestTube, Database, MessageSquare, ShieldAlert, Users, UserCog } from "lucide-react";
import { App, User } from "@/types/environment";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Index = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedConsumer, setSelectedConsumer] = useState<any>(null);
  const [currentApp, setCurrentApp] = useState<App | null>(null);
  const { currentEnvironment } = useEnvironment();
  const { currentUser, setCurrentUser, isAdmin } = useUser();

  const isProd = currentEnvironment === 'prod';

  const handleTestConsumer = (consumer: any) => {
    setSelectedConsumer(consumer);
    setActiveTab("tester");
  };

  const handleConfigureConsumer = (consumer: any) => {
    setSelectedConsumer(consumer);
    if (consumer.type === 'kafka') {
      setActiveTab("kafka-config");
    } else {
      setActiveTab("jms-config");
    }
  };

  const handleUserSwitch = (userId: string) => {
    if (userId === "admin") {
      setCurrentUser({ id: "admin", name: "Admin User", email: "admin@aero.com", role: "admin" });
    } else {
      setCurrentUser({ id: "qa1", name: "QA Tester 1", email: "qa1@aero.com", role: "qa" });
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isProd ? "bg-red-50/10" : "bg-background"}`}>
      {/* Header */}
      <header className={`border-b transition-colors duration-500 sticky top-0 z-50 ${
        isProd ? "bg-red-600 text-white" : "bg-card/50 backdrop-blur-sm"
      }`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                isProd ? "bg-white text-red-600" : "bg-primary text-primary-foreground"
              }`}>
                <Plane className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Aero Ops Testing Suite</h1>
                <div className="flex items-center gap-2">
                  <p className={`text-xs ${isProd ? "text-red-100" : "text-muted-foreground"}`}>
                    SpringBoot Kafka & JMS Testing Platform
                  </p>
                  {isProd && (
                    <Badge variant="secondary" className="bg-white text-red-600 animate-pulse border-none text-[10px] h-4">
                      PROD PROTECTED
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <AppSelector onAppChange={setCurrentApp} />
              <div className="h-8 w-[1px] bg-border/20 mx-1" />
              <EnvironmentSelector compact />
              <div className="h-8 w-[1px] bg-border/20 mx-1" />
              
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <UserCog className={`h-4 w-4 ${isProd ? "text-red-100" : "text-muted-foreground"}`} />
                ) : (
                  <Users className={`h-4 w-4 ${isProd ? "text-red-100" : "text-muted-foreground"}`} />
                )}
                <Select value={currentUser?.id || ""} onValueChange={handleUserSwitch}>
                  <SelectTrigger className={`w-[120px] h-8 text-xs ${isProd ? "bg-red-700 border-red-500 text-white" : ""}`}>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="qa1">QA Tester</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {isProd && (
          <Alert variant="destructive" className="mb-6 border-red-500 bg-red-50 text-red-900 border-2">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="font-bold">Production Environment Active</AlertTitle>
            <AlertDescription>
              All actions taken below will interact with <strong>LIVE</strong> production brokers. Please confirm Kafka authentication credentials before sending messages.
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6 flex items-center justify-between">
          <EnvironmentSelector showActions />
          {currentApp && (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg px-4 py-1">
                {currentApp.name}
              </Badge>
            </div>
          )}
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="kafka-config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Kafka Config
            </TabsTrigger>
            <TabsTrigger value="jms-config" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              JMS Config
            </TabsTrigger>
            <TabsTrigger value="tester" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Message Tester
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Admin Panel
              </TabsTrigger>
            )}
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Live Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ConsumerOverview 
              onTestConsumer={handleTestConsumer}
              onConfigureConsumer={handleConfigureConsumer}
              appId={currentApp?.id}
            />
          </TabsContent>

          <TabsContent value="kafka-config">
            <KafkaConfig />
          </TabsContent>

          <TabsContent value="jms-config">
            <JmsConfig />
          </TabsContent>

          <TabsContent value="tester">
            <MessageTester selectedConsumer={selectedConsumer} appId={currentApp?.id} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin">
              <AdminDashboard />
            </TabsContent>
          )}

          <TabsContent value="logs">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Live Logs Coming Soon</h3>
              <p className="text-muted-foreground">
                Real-time log streaming from Firebase will be available here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/30 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>© 2024 Aero Ops Testing Suite</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span>System Operational</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span>v1.5.0-managed</span>
              <span>Built with React & Firebase</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;