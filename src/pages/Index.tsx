import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ConsumerOverview } from "@/components/ConsumerOverview";
import { KafkaConfig } from "@/components/KafkaConfig";
import { JmsConfig } from "@/components/JmsConfig";
import { MessageTester } from "@/components/MessageTester";
import { EnvironmentSelector } from "@/components/EnvironmentSelector";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { Plane, Settings, TestTube, Database, MessageSquare } from "lucide-react";

interface Consumer {
  name: string;
  type: 'kafka' | 'jms';
  status: 'active' | 'inactive' | 'error';
  lastTested?: string;
}

const Index = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedConsumer, setSelectedConsumer] = useState<Consumer | null>(null);
  const { currentEnvironment } = useEnvironment();

  const handleTestConsumer = (consumer: Consumer) => {
    setSelectedConsumer(consumer);
    setActiveTab("tester");
  };

  const handleConfigureConsumer = (consumer: Consumer) => {
    setSelectedConsumer(consumer);
    if (consumer.type === 'kafka') {
      setActiveTab("kafka-config");
    } else {
      setActiveTab("jms-config");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <Plane className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Aero Ops Testing Suite</h1>
                <p className="text-sm text-muted-foreground">
                  SpringBoot Kafka & JMS Message Testing Platform
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <EnvironmentSelector compact />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <EnvironmentSelector showActions />
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
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
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Live Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ConsumerOverview 
              onTestConsumer={handleTestConsumer}
              onConfigureConsumer={handleConfigureConsumer}
            />
          </TabsContent>

          <TabsContent value="kafka-config">
            <KafkaConfig />
          </TabsContent>

          <TabsContent value="jms-config">
            <JmsConfig />
          </TabsContent>

          <TabsContent value="tester">
            <MessageTester selectedConsumer={selectedConsumer} />
          </TabsContent>

          <TabsContent value="logs">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Live Logs Coming Soon</h3>
              <p className="text-muted-foreground">
                Real-time log streaming and monitoring will be available in the next release.
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
              <span>v1.0.0</span>
              <span>Built with React & SpringBoot</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;