import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Settings, Activity } from "lucide-react";

// Import proto files as raw text
import OtherSystemsFlightUpdateInternalProto from '../proto/OtherSystemsFlightUpdateInternal.proto?raw';
import DcsFlightUpdateInternal from '../proto/DcsFlightUpdateInternal.proto?raw';
import AcarsMessage from '../proto/AcarsMessage.proto?raw';
import LdmMessage from '../proto/LdmMessage.proto?raw';
import MvtMessage from '../proto/MvtMessage.proto?raw';
import StationFlightSummary from '../proto/StationFlightSummary.proto?raw';

import MvtMessageSample from '../proto/MvtMessage-sample.json'

interface Consumer {
  name: string;
  type: 'kafka' | 'jms';
  status: 'active' | 'inactive' | 'error';
  lastTested?: string;
  topic?: string;
  protoSchema?: string;
  messageType?: string;
  samplePayload?: string;
  sampleKey?: string;
  messageFormat?: 'protobuf' | 'json' | 'string';
}


const kafkaConsumers: Consumer[] = [
  {
    name: "AircraftMaintenanceKafkaConnectConsumer",
    type: "kafka",
    status: "active",
    lastTested: "2024-01-15 14:30",
    topic: "aeroops_aircraft_maintenance_topic",
    messageFormat: "json",
    samplePayload: JSON.stringify({ maintenanceId: "AM123", aircraftId: "A789", status: "scheduled" }, null, 2),
    sampleKey: "maintenance-key-123"
  },
  {
    name: "DcsFlightUpdateInternalConsumer",
    type: "kafka",
    status: "active",
    topic: "aeroops_dcs_flight_update_internal_topic",
    protoSchema: DcsFlightUpdateInternal,
    messageType: "DcsFlightUpdateInternal",
    messageFormat: "protobuf",
    samplePayload: JSON.stringify({
      flightReferences: ["okcEPEt", "IQe"],
      userName: "7oFfs8WGv"
    }, null, 2),
    sampleKey: "dcs-key-456"
  },
  {
    name: "DelayMappingKafkaConnectConsumer",
    type: "kafka",
    status: "active",
    lastTested: "2024-01-15 13:45",
    topic: "aeroops_delay_mapping_topic",
    messageFormat: "json",
    samplePayload: JSON.stringify({ flightId: "DM789", delayMinutes: 30 }, null, 2),
    sampleKey: "delay-key-789"
  },
  {
    name: "DelayPredictionConsumer",
    type: "kafka",
    status: "error",
    topic: "aeroops_delay_prediction_topic",
    messageFormat: "json",
    samplePayload: JSON.stringify({ flightId: "DP123", predictedDelay: 45 }, null, 2),
    sampleKey: "prediction-key-123"
  },
  {
    name: "FlightACARSMessageConsumer",
    type: "kafka",
    status: "active",
    lastTested: "2024-01-15 14:25",
    topic: "aeroline_acars_data_topic",
    protoSchema: AcarsMessage,
    messageType: "AcarsMessage",
    messageFormat: "protobuf",
    samplePayload: JSON.stringify({ messageId: "ACARS456", content: "flight update" }, null, 2),
    sampleKey: "acars-key-456"
  },
  {
    name: "FlightFuelKafkaConnectConsumer",
    type: "kafka",
    status: "active",
    topic: "aeroops_flight_fuel_topic",
    messageFormat: "json",
    samplePayload: JSON.stringify({ flightId: "FF789", fuelAmount: 5000 }, null, 2),
    sampleKey: "fuel-key-789"
  },
  {
    name: "FlightInBoundOutBoundKafkaConnectConsumer",
    type: "kafka",
    status: "inactive",
    topic: "aeroops_inbound_outbound_topic",
    messageFormat: "json",
    samplePayload: JSON.stringify({ flightId: "IO123", direction: "inbound" }, null, 2),
    sampleKey: "inout-key-123"
  },
  {
    name: "FlightKafkaConnectConsumer",
    type: "kafka",
    status: "active",
    lastTested: "2024-01-15 14:20",
    topic: "aeroops_flight_connect_topic",
    messageFormat: "json",
    samplePayload: JSON.stringify({ flightId: "FC456", status: "connected" }, null, 2),
    sampleKey: "connect-key-456"
  },
  {
    name: "FlightKafkaEETConsumer",
    type: "kafka",
    status: "active",
    topic: "aeroops_flight_eet_topic",
    messageFormat: "json",
    samplePayload: JSON.stringify({ flightId: "EET789", estimatedTime: "2024-01-15T15:00:00Z" }, null, 2),
    sampleKey: "eet-key-789"
  },
  {
    name: "FlightKeyUpdateInternalConsumer",
    type: "kafka",
    status: "inactive",
    topic: "aeroops_flight_key_update_topic",
    messageFormat: "json",
    samplePayload: JSON.stringify({ flightId: "FKU123", key: "new-key" }, null, 2),
    sampleKey: "key-update-123"
  },
  {
    name: "FlightPassengerKafkaConnectConsumer",
    type: "kafka",
    status: "active",
    lastTested: "2024-01-15 14:10",
    topic: "aeroops_flight_passenger_topic",
    messageFormat: "json",
    samplePayload: JSON.stringify({ flightId: "FP456", passengerCount: 150 }, null, 2),
    sampleKey: "passenger-key-456"
  },
  {
    name: "FlightUpdateEventConsumer",
    type: "kafka",
    status: "active",
    topic: "aeroops_flight_updates",
    messageFormat: "json",
    samplePayload: JSON.stringify({
      flightNumber: "AA123",
      departure: "JFK",
      arrival: "LAX",
      timestamp: "2024-01-15T14:30:00Z"
    }, null, 2),
    sampleKey: "flight-update-key-456"
  },
  {
    name: "FuelPriceKafkaConnectConsumer",
    type: "kafka",
    status: "inactive",
    topic: "aeroops_fuel_price_topic",
    messageFormat: "json",
    samplePayload: JSON.stringify({ fuelType: "Jet-A", price: 5.50 }, null, 2),
    sampleKey: "fuel-price-key-123"
  },
  {
    name: "FuelSupplierKafkaConnectConsumer",
    type: "kafka",
    status: "active",
    topic: "aeroops_fuel_supplier_topic",
    messageFormat: "json",
    samplePayload: JSON.stringify({ supplierId: "FS789", name: "FuelCo" }, null, 2),
    sampleKey: "supplier-key-789"
  },
  {
    name: "GroundOpsConsumer",
    type: "kafka",
    status: "active",
    lastTested: "2024-01-15 14:05",
    topic: "aeroline_station_flight_changes",
    protoSchema: StationFlightSummary,
    messageType: "StationFlightSummary",
    messageFormat: "protobuf",
    samplePayload: JSON.stringify(
      {
  "flightSegmentReferenceId": "SEG12345",
  "flightLegId": "LEG98765",
  "flightNumber": "G9536",
  "estDepartureDate": "12/08/2025 04:35",
  "estArrivalDate": "12/08/2025 08:40",
  "delay": [
    {
      "delayCode": "93",
      "delayValue": 15
    },
    {
      "delayCode": "81",
      "delayValue": 10
    }
  ],
  "opsReference": "OPS-456789",
  "doorClosed": "04:30",
  "holdsClosed": "04:32"
}
, null, 2),
    sampleKey: "ground-ops-key-123"
  },
  {
    name: "OpsLdmConsumer",
    type: "kafka",
    status: "active",
    topic: "aeroline_ldm_data_topic",
    protoSchema: LdmMessage,
    messageType: "LdmMessage",
    messageFormat: "protobuf",
    samplePayload: JSON.stringify({
      flightIdentifier: "470699",
      airlineDesignator: "9P",
      flightNumber: "9P858",
      flightOperationDateTimeZulu: "13/06/2025 00:00:00",
      aircraftRegistration: "AP-BOQ",
      destinationDetails: [
        {
          destinationAirport: "UET",
          paxCountDetails: {
            numberOfAdult: 142,
            numberOfMale: 112,
            numberOfFemale: 30,
            numberOfChildren: 10,
            numberOfInfants: 3
          },
          totalDeadLoad: "1222"
        }
      ]
    }, null, 2),
    sampleKey: "ldm-key-456"
  },
  {
    name: "OpsMvtConsumer",
    type: "kafka",
    status: "active",
    lastTested: "2024-01-15 13:55",
    topic: "aeroline_mvt_data_topic",
    protoSchema: MvtMessage,
    messageType: "MvtMessage",
    messageFormat: "protobuf",
    samplePayload:JSON.stringify(MvtMessageSample,null,2),

    sampleKey: "mvt-key-789"
  },
  
  {
    name: "OtherSystemsFlightUpdateInternalConsumer",
    type: "kafka",
    status: "error",
    topic: "aeroops_flight_update_internal_topic",
    protoSchema: OtherSystemsFlightUpdateInternalProto,
    messageType: "OtherSystemsFlightUpdateInternal",
    messageFormat: "protobuf",
    samplePayload: JSON.stringify({
      flightReferences: ["okcEPEt", "IQe"],
      originFlightReference: "7oFfs8WGv",
      isAdhoc: true,
      isFlightTimeUpdate: false,
      isRegistrationUpdate: true
    }, null, 2),
    sampleKey: "flight-update-key-123"
  }
];

const jmsConsumers: Consumer[] = [
  { name: "AcarsMessageQueueConsumer", type: "jms", status: "active", lastTested: "2024-01-15 14:28" },
  { name: "FzfwMessageQueueConsumer", type: "jms", status: "active", lastTested: "2024-01-15 14:22" }
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
  appId?: string;
}

export const ConsumerOverview = ({ onTestConsumer, onConfigureConsumer, appId }: ConsumerOverviewProps) => {
  const [filter, setFilter] = useState<'all' | 'protobuf' | 'json'>('all');
  const [sortField, setSortField] = useState<'name' | 'status' | 'lastTested'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Load filter and sort preferences from localStorage
  useEffect(() => {
    const savedFilter = localStorage.getItem('kafkaConsumerFilter');
    const savedSortField = localStorage.getItem('kafkaConsumerSortField');
    const savedSortOrder = localStorage.getItem('kafkaConsumerSortOrder');
    if (savedFilter) setFilter(savedFilter as 'all' | 'protobuf' | 'json');
    if (savedSortField) setSortField(savedSortField as 'name' | 'status' | 'lastTested');
    if (savedSortOrder) setSortOrder(savedSortOrder as 'asc' | 'desc');
  }, []);

  // Save filter and sort preferences to localStorage
  useEffect(() => {
    localStorage.setItem('kafkaConsumerFilter', filter);
    localStorage.setItem('kafkaConsumerSortField', sortField);
    localStorage.setItem('kafkaConsumerSortOrder', sortOrder);
  }, [filter, sortField, sortOrder]);

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

      <div className="flex items-center gap-4 mb-4">
        <div className="space-y-2">
          <label htmlFor="filter">Filter by Message Format</label>
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
          <label htmlFor="sortField">Sort by</label>
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
          <label htmlFor="sortOrder">Sort Order</label>
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
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAndSortedConsumers.map((consumer) => (
                <div key={consumer.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(consumer.status)}
                    <div>
                      <div className="font-medium text-sm">{consumer.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Format: {consumer.messageFormat?.toUpperCase() || 'N/A'}
                      </div>
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