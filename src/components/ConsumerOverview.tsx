import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Settings, Activity, Database } from "lucide-react";
import { AppService } from "@/services/appService";
import { Consumer } from "@/types/environment";




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
  appId?: string;
}

export const ConsumerOverview = ({ onTestConsumer, onConfigureConsumer, appId }: ConsumerOverviewProps) => {
  const [filter, setFilter] = useState<'all' | 'protobuf' | 'json'>('all');
  const [sortField, setSortField] = useState<'name' | 'status' | 'lastTested'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [loading, setLoading] = useState(false);

  // Load filter and sort preferences from localStorage
  useEffect(() => {
    const savedFilter = localStorage.getItem('kafkaConsumerFilter');
    const savedSortField = localStorage.getItem('kafkaConsumerSortField');
    const savedSortOrder = localStorage.getItem('kafkaConsumerSortOrder');
    if (savedFilter) setFilter(savedFilter as 'all' | 'protobuf' | 'json');
    if (savedSortField) setSortField(savedSortField as 'name' | 'status' | 'lastTested');
    if (savedSortOrder) setSortOrder(savedSortOrder as 'asc' | 'desc');
  }, []);

  // Fetch consumers from Firestore when appId changes
  useEffect(() => {
    const fetchConsumers = async () => {
      if (!appId) {
        setConsumers([]);
        return;
      }
      setLoading(true);
      try {
        const app = await AppService.getApp(appId);
        if (app) {
          setConsumers(app.consumers || []);
        }
      } catch (error) {
        console.error('Error fetching consumers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsumers();
  }, [appId]);

  // Save filter and sort preferences to localStorage
  useEffect(() => {
    localStorage.setItem('kafkaConsumerFilter', filter);
    localStorage.setItem('kafkaConsumerSortField', sortField);
    localStorage.setItem('kafkaConsumerSortOrder', sortOrder);
  }, [filter, sortField, sortOrder]);

  const kafkaConsumers = consumers.filter(c => c.type === 'kafka');
  const jmsConsumers = consumers.filter(c => c.type === 'jms');

  // Filter and sort Kafka consumers
  const filteredAndSortedConsumers = kafkaConsumers
    .filter(consumer => filter === 'all' || consumer.messageFormat === filter)
    .sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'name') {
        return order * a.name.localeCompare(b.name);
      } else if (sortField === 'status') {
        const statusOrder = { active: 1, inactive: 2, error: 3 };
        return order * (statusOrder[a.status] - statusOrder[b.status]);
      } else if (sortField === 'lastTested') {
        const dateA = a.lastTested ? new Date(a.lastTested).getTime() : 0;
        const dateB = b.lastTested ? new Date(b.lastTested).getTime() : 0;
        return order * (dateA - dateB);
      }
      return 0;
    });

  const activeCount = consumers.filter(c => c.status === 'active').length;
  const errorCount = consumers.filter(c => c.status === 'error').length;

  if (!appId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Database className="h-8 w-8 mx-auto mb-4 opacity-50" />
          <p>Please select an application to view consumers.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">{consumers.length}</div>
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

      <div className="flex items-center gap-4 mb-4">
        <div className="space-y-2">
          <label htmlFor="filter" className="text-sm font-medium">Message Format</label>
          <Select value={filter} onValueChange={(value) => setFilter(value as "all" | "protobuf" | "json")}>
            <SelectTrigger id="filter" className="w-40">
              <SelectValue placeholder="Select filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="protobuf">Protobuf</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="sortField" className="text-sm font-medium">Sort by</label>
          <Select value={sortField} onValueChange={(value) => setSortField(value as "name" | "status" | "lastTested")}>
            <SelectTrigger id="sortField" className="w-40">
              <SelectValue placeholder="Select sort field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="lastTested">Last Tested</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="sortOrder" className="text-sm font-medium">Sort Order</label>
          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "asc" | "desc")}>
            <SelectTrigger id="sortOrder" className="w-40">
              <SelectValue placeholder="Select sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-warning" />
              Kafka Consumers ({filteredAndSortedConsumers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground animate-pulse">Loading consumers...</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredAndSortedConsumers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                    No Kafka consumers defined for this application.
                  </div>
                ) : filteredAndSortedConsumers.map((consumer) => (
                  <div key={consumer.name} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(consumer.status)}
                      <div>
                        <div className="font-medium text-sm">{consumer.name}</div>
                        <div className="text-xs text-muted-foreground italic mb-1">
                          {consumer.description || "No description provided"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Format: {consumer.messageFormat?.toUpperCase() || 'N/A'}
                        </div>
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
            )}
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
            {loading ? (
              <div className="py-12 text-center text-muted-foreground animate-pulse">Loading consumers...</div>
            ) : (
              <div className="space-y-2">
                {jmsConsumers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                    No JMS consumers defined for this application.
                  </div>
                ) : jmsConsumers.map((consumer) => (
                  <div key={consumer.name} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(consumer.status)}
                      <div>
                        <div className="font-medium text-sm">{consumer.name}</div>
                        <div className="text-xs text-muted-foreground italic mb-1">
                          {consumer.description || "No description provided"}
                        </div>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};