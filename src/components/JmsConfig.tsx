import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Save, TestTube, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JmsConfigData {
  brokerUrl: string;
  username: string;
  password: string;
  connectionFactory: string;
  queuePrefix: string;
  sessionTransacted: boolean;
  acknowledgeMode: string;
  connectionPoolSize: number;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  requestTimeout: number;
  receiveTimeout: number;
  clientId: string;
  durableSubscription: boolean;
  messageSelector: string;
  additionalProperties: string;
}

const defaultConfig: JmsConfigData = {
  brokerUrl: "tcp://localhost:61616",
  username: "",
  password: "",
  connectionFactory: "ConnectionFactory",
  queuePrefix: "aero.ops",
  sessionTransacted: false,
  acknowledgeMode: "AUTO_ACKNOWLEDGE",
  connectionPoolSize: 10,
  reconnectDelay: 1000,
  maxReconnectAttempts: 5,
  requestTimeout: 30000,
  receiveTimeout: 1000,
  clientId: "aero-ops-test-client",
  durableSubscription: false,
  messageSelector: "",
  additionalProperties: ""
};

export const JmsConfig = () => {
  const [config, setConfig] = useState<JmsConfigData>(defaultConfig);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const { toast } = useToast();

  const handleInputChange = (field: keyof JmsConfigData, value: string | number | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveConfig = () => {
    localStorage.setItem('jmsConfig', JSON.stringify(config));
    toast({
      title: "Configuration Saved",
      description: "JMS configuration has been saved successfully.",
    });
  };

  const handleTestConnection = async () => {
    setIsConnecting(true);
    
    // Simulate connection test
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success rate for demo
      setConnectionStatus(success ? 'connected' : 'error');
      setIsConnecting(false);
      
      toast({
        title: success ? "Connection Successful" : "Connection Failed",
        description: success 
          ? "Successfully connected to JMS broker" 
          : "Failed to connect. Please check your configuration.",
        variant: success ? "default" : "destructive"
      });
    }, 2000);
  };

  const handleLoadDefaults = () => {
    setConfig(defaultConfig);
    toast({
      title: "Defaults Loaded",
      description: "Configuration reset to default values.",
    });
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-success';
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'error': return 'Connection Failed';
      default: return 'Not Connected';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              JMS Configuration
            </div>
            <div className="flex items-center gap-2 text-sm">
              Status: <span className={getConnectionStatusColor()}>{getConnectionStatusText()}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brokerUrl">Broker URL</Label>
              <Input
                id="brokerUrl"
                value={config.brokerUrl}
                onChange={(e) => handleInputChange('brokerUrl', e.target.value)}
                placeholder="tcp://localhost:61616"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="connectionFactory">Connection Factory</Label>
              <Input
                id="connectionFactory"
                value={config.connectionFactory}
                onChange={(e) => handleInputChange('connectionFactory', e.target.value)}
                placeholder="ConnectionFactory"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={config.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={config.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="queuePrefix">Queue Prefix</Label>
              <Input
                id="queuePrefix"
                value={config.queuePrefix}
                onChange={(e) => handleInputChange('queuePrefix', e.target.value)}
                placeholder="aero.ops"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                value={config.clientId}
                onChange={(e) => handleInputChange('clientId', e.target.value)}
                placeholder="aero-ops-test-client"
              />
            </div>
          </div>

          <Separator />

          {/* Session Configuration */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Session Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="acknowledgeMode">Acknowledge Mode</Label>
                <Select 
                  value={config.acknowledgeMode} 
                  onValueChange={(value) => handleInputChange('acknowledgeMode', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO_ACKNOWLEDGE">Auto Acknowledge</SelectItem>
                    <SelectItem value="CLIENT_ACKNOWLEDGE">Client Acknowledge</SelectItem>
                    <SelectItem value="DUPS_OK_ACKNOWLEDGE">Dups OK Acknowledge</SelectItem>
                    <SelectItem value="SESSION_TRANSACTED">Session Transacted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="messageSelector">Message Selector</Label>
                <Input
                  id="messageSelector"
                  value={config.messageSelector}
                  onChange={(e) => handleInputChange('messageSelector', e.target.value)}
                  placeholder="Optional JMS message selector"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4 mt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="sessionTransacted"
                  checked={config.sessionTransacted}
                  onCheckedChange={(checked) => handleInputChange('sessionTransacted', checked)}
                />
                <Label htmlFor="sessionTransacted">Session Transacted</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="durableSubscription"
                  checked={config.durableSubscription}
                  onCheckedChange={(checked) => handleInputChange('durableSubscription', checked)}
                />
                <Label htmlFor="durableSubscription">Durable Subscription</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Connection Pool Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Connection Pool & Timeouts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="connectionPoolSize">Connection Pool Size</Label>
                <Input
                  id="connectionPoolSize"
                  type="number"
                  value={config.connectionPoolSize}
                  onChange={(e) => handleInputChange('connectionPoolSize', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reconnectDelay">Reconnect Delay (ms)</Label>
                <Input
                  id="reconnectDelay"
                  type="number"
                  value={config.reconnectDelay}
                  onChange={(e) => handleInputChange('reconnectDelay', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxReconnectAttempts">Max Reconnect Attempts</Label>
                <Input
                  id="maxReconnectAttempts"
                  type="number"
                  value={config.maxReconnectAttempts}
                  onChange={(e) => handleInputChange('maxReconnectAttempts', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestTimeout">Request Timeout (ms)</Label>
                <Input
                  id="requestTimeout"
                  type="number"
                  value={config.requestTimeout}
                  onChange={(e) => handleInputChange('requestTimeout', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiveTimeout">Receive Timeout (ms)</Label>
                <Input
                  id="receiveTimeout"
                  type="number"
                  value={config.receiveTimeout}
                  onChange={(e) => handleInputChange('receiveTimeout', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional Properties */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Additional Properties</h3>
            <div className="space-y-2">
              <Label htmlFor="additionalProperties">Additional Properties (JSON format)</Label>
              <Textarea
                id="additionalProperties"
                value={config.additionalProperties}
                onChange={(e) => handleInputChange('additionalProperties', e.target.value)}
                placeholder='{"key1": "value1", "key2": "value2"}'
                rows={4}
              />
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleSaveConfig} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Configuration
            </Button>
            <Button 
              onClick={handleTestConnection} 
              variant="outline" 
              disabled={isConnecting}
              className="flex items-center gap-2"
            >
              {isConnecting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              {isConnecting ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button onClick={handleLoadDefaults} variant="ghost">
              Load Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};