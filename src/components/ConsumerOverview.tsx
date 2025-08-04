import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Settings, Activity } from "lucide-react";

interface Consumer {
  name: string;
  type: 'kafka' | 'jms';
  status: 'active' | 'inactive' | 'error';
  lastTested?: string;
}

const kafkaConsumers: Consumer[] = [
  { name: "AircraftMaintenanceKafkaConnectConsumer", type: "kafka", status: "active", lastTested: "2024-01-15 14:30" },
  { name: "DcsFlightUpdateInternalConsumer", type: "kafka", status: "inactive" },
  { name: "DelayMappingKafkaConnectConsumer", type: "kafka", status: "active", lastTested: "2024-01-15 13:45" },
  { name: "DelayPredictionConsumer", type: "kafka", status: "error" },
  { name: "FlightACARSMessageConsumer", type: "kafka", status: "active", lastTested: "2024-01-15 14:25" },
  { name: "FlightFuelKafkaConnectConsumer", type: "kafka", status: "active" },
  { name: "FlightInBoundOutBoundKafkaConnectConsumer", type: "kafka", status: "inactive" },
  { name: "FlightKafkaConnectConsumer", type: "kafka", status: "active", lastTested: "2024-01-15 14:20" },
  { name: "FlightKafkaEETConsumer", type: "kafka", status: "active" },
  { name: "FlightKeyUpdateInternalConsumer", type: "kafka", status: "inactive" },
  { name: "FlightPassengerKafkaConnectConsumer", type: "kafka", status: "active", lastTested: "2024-01-15 14:10" },
  { name: "FlightUpdateEventConsumer", type: "kafka", status: "active" },
  { name: "FuelPriceKafkaConnectConsumer", type: "kafka", status: "inactive" },
  { name: "FuelSupplierKafkaConnectConsumer", type: "kafka", status: "active" },
  { name: "GroundOpsConsumer", type: "kafka", status: "active", lastTested: "2024-01-15 14:05" },
  { name: "OpsLdmConsumer", type: "kafka", status: "active" },
  { name: "OpsMvtConsumer", type: "kafka", status: "active", lastTested: "2024-01-15 13:55" },
  { name: "OtherSystemsFlightUpdateInternalConsumer", type: "kafka", status: "error" },
];

const jmsConsumers: Consumer[] = [
  { name: "AcarsMessageQueueConsumer", type: "jms", status: "active", lastTested: "2024-01-15 14:28" },
  { name: "FzfwMessageQueueConsumer", type: "jms", status: "active", lastTested: "2024-01-15 14:22" },
];

const getStatusColor = (status: Consumer['status']) => {
  switch (status) {
    case 'active': return 'bg-success text-success-foreground';
    case 'inactive': return 'bg-muted text-muted-foreground';
    case 'error': return 'bg-destructive text-destructive-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getStatusIcon = (status: Consumer['status']) => {
  switch (status) {
    case 'active': return <Activity className="h-3 w-3" />;
    case 'inactive': return <div className="h-3 w-3 rounded-full bg-muted-foreground" />;
    case 'error': return <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />;
    default: return <div className="h-3 w-3 rounded-full bg-muted-foreground" />;
  }
};

interface ConsumerOverviewProps {
  onTestConsumer: (consumer: Consumer) => void;
  onConfigureConsumer: (consumer: Consumer) => void;
}

export const ConsumerOverview = ({ onTestConsumer, onConfigureConsumer }: ConsumerOverviewProps) => {
  const allConsumers = [...kafkaConsumers, ...jmsConsumers];
  const activeCount = allConsumers.filter(c => c.status === 'active').length;
  const errorCount = allConsumers.filter(c => c.status === 'error').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">{allConsumers.length}</div>
            <p className="text-xs text-muted-foreground">Total Consumers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{kafkaConsumers.length}</div>
            <p className="text-xs text-muted-foreground">Kafka Consumers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{errorCount}</div>
            <p className="text-xs text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-warning" />
              Kafka Consumers ({kafkaConsumers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {kafkaConsumers.map((consumer) => (
                <div key={consumer.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(consumer.status)}
                    <div>
                      <div className="font-medium text-sm">{consumer.name}</div>
                      {consumer.lastTested && (
                        <div className="text-xs text-muted-foreground">Last tested: {consumer.lastTested}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(consumer.status)}>{consumer.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => onConfigureConsumer(consumer)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => onTestConsumer(consumer)}>
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              JMS Consumers ({jmsConsumers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jmsConsumers.map((consumer) => (
                <div key={consumer.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(consumer.status)}
                    <div>
                      <div className="font-medium text-sm">{consumer.name}</div>
                      {consumer.lastTested && (
                        <div className="text-xs text-muted-foreground">Last tested: {consumer.lastTested}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(consumer.status)}>{consumer.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => onConfigureConsumer(consumer)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => onTestConsumer(consumer)}>
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};