import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, TestTube, RefreshCw, ShieldAlert, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEnvironment } from "@/contexts/EnvironmentContext";

interface KafkaConfigData {
  bootstrapServers: string;
  groupId: string;
  autoOffsetReset: string;
  enableAutoCommit: boolean;
  sessionTimeoutMs: number;
  heartbeatIntervalMs: number;
  maxPollRecords: number;
  securityProtocol: string;
  saslMechanism: string;
  saslUsername: string;
  saslPassword: string;
  sslTruststoreLocation: string;
  sslTruststorePassword: string;
  additionalProperties: string;
}

const defaultConfig: KafkaConfigData = {
  bootstrapServers: "localhost:9092",
  groupId: "aero-ops-test-group",
  autoOffsetReset: "earliest",
  enableAutoCommit: true,
  sessionTimeoutMs: 30000,
  heartbeatIntervalMs: 3000,
  maxPollRecords: 500,
  securityProtocol: "PLAINTEXT",
  saslMechanism: "",
  saslUsername: "",
  saslPassword: "",
  sslTruststoreLocation: "",
  sslTruststorePassword: "",
  additionalProperties: ""
};

export const KafkaConfig = () => {
  const [config, setConfig] = useState<KafkaConfigData>(defaultConfig);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const { toast } = useToast();
  const { currentEnvironment } = useEnvironment();
  const isProd = currentEnvironment === 'prod';

  const handleInputChange = (field: keyof KafkaConfigData, value: string | number | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    // Reset connection status when config changes
    setConnectionStatus('disconnected');
  };

  const handleSaveConfig = () => {
    localStorage.setItem('kafkaConfig', JSON.stringify(config));
    toast({
      title: "Configuration Saved",
      description: "Kafka configuration has been saved successfully.",
    });
  };

const handleTestConnection = async () => {
  setIsConnecting(true);
  setConnectionStatus('disconnected');


  try {
    const response = await fetch('http://localhost:3001/api/kafka/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    const result = await response.json();
    setConnectionStatus(result.status);
    toast({
      title: result.status === 'connected' ? "Connection Successful" : "Connection Failed",
      description: result.message,
      variant: result.status === 'connected' ? "default" : "destructive"
    });
  } catch (error: any) {
    setConnectionStatus('error');
    toast({
      title: "Connection Failed",
      description: `Failed to connect: ${error.message || 'Network error'}`,
      variant: "destructive"
    });
  } finally {
    setIsConnecting(false);
  }
};

  const handleLoadDefaults = () => {
    setConfig(defaultConfig);
    setConnectionStatus('disconnected');
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
              <div className="h-2 w-2 rounded-full bg-warning" />
              Kafka Configuration
            </div>
            <div className="flex items-center gap-2 text-sm">
              Status: <span className={getConnectionStatusColor()}>{getConnectionStatusText()}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bootstrapServers">Bootstrap Servers</Label>
              <Input
                id="bootstrapServers"
                value={config.bootstrapServers}
                onChange={(e) => handleInputChange('bootstrapServers', e.target.value)}
                placeholder="localhost:9092"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupId">Group ID</Label>
              <Input
                id="groupId"
                value={config.groupId}
                onChange={(e) => handleInputChange('groupId', e.target.value)}
                placeholder="aero-ops-test-group"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="autoOffsetReset">Auto Offset Reset</Label>
              <Input
                id="autoOffsetReset"
                value={config.autoOffsetReset}
                onChange={(e) => handleInputChange('autoOffsetReset', e.target.value)}
                placeholder="earliest"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="securityProtocol">Security Protocol</Label>
              <Input
                id="securityProtocol"
                value={config.securityProtocol}
                onChange={(e) => handleInputChange('securityProtocol', e.target.value)}
                placeholder="PLAINTEXT"
              />
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-4">Performance Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeoutMs">Session Timeout (ms)</Label>
                <Input
                  id="sessionTimeoutMs"
                  type="number"
                  value={config.sessionTimeoutMs}
                  onChange={(e) => handleInputChange('sessionTimeoutMs', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heartbeatIntervalMs">Heartbeat Interval (ms)</Label>
                <Input
                  id="heartbeatIntervalMs"
                  type="number"
                  value={config.heartbeatIntervalMs}
                  onChange={(e) => handleInputChange('heartbeatIntervalMs', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPollRecords">Max Poll Records</Label>
                <Input
                  id="maxPollRecords"
                  type="number"
                  value={config.maxPollRecords}
                  onChange={(e) => handleInputChange('maxPollRecords', parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <Switch
                id="enableAutoCommit"
                checked={config.enableAutoCommit}
                onCheckedChange={(checked) => handleInputChange('enableAutoCommit', checked)}
              />
              <Label htmlFor="enableAutoCommit">Enable Auto Commit</Label>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Security Settings
                {isProd ? (
                  <Badge variant="destructive" className="animate-pulse">PROD AUTH REQUIRED</Badge>
                ) : (
                  <Badge variant="outline">STAGING (NO AUTH)</Badge>
                )}
              </h3>
            </div>
            
            {isProd && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-red-500">Production environment requires SASL/SSL.</p>
                  <p className="text-muted-foreground">Credentials will be securely handled by the backend server.</p>
                </div>
              </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!isProd ? 'opacity-50 grayscale' : ''}`}>
              <div className="space-y-2">
                <Label htmlFor="saslMechanism">SASL Mechanism</Label>
                <Input
                  id="saslMechanism"
                  value={config.saslMechanism}
                  onChange={(e) => handleInputChange('saslMechanism', e.target.value)}
                  placeholder="PLAIN, SCRAM-SHA-256, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saslUsername">SASL Username</Label>
                <Input
                  id="saslUsername"
                  value={config.saslUsername}
                  onChange={(e) => handleInputChange('saslUsername', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saslPassword">SASL Password</Label>
                <Input
                  id="saslPassword"
                  type="password"
                  value={config.saslPassword}
                  onChange={(e) => handleInputChange('saslPassword', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sslTruststoreLocation">SSL Truststore Location</Label>
                <Input
                  id="sslTruststoreLocation"
                  value={config.sslTruststoreLocation}
                  onChange={(e) => handleInputChange('sslTruststoreLocation', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

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