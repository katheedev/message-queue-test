import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Settings, Activity } from "lucide-react";

// Import proto files as raw text
import OtherSystemsFlightUpdateInternalProto from '../proto/OtherSystemsFlightUpdateInternal.proto?raw';
import DcsFlightUpdateInternal from '../proto/DcsFlightUpdateInternal.proto?raw';
import AcarsMessage from '../proto/AcarsMessage.proto?raw';
import LdmMessage from '../proto/LdmMessage.proto?raw';
import MvtMessage from '../proto/MvtMessage.proto?raw';
import StationFlightSummary from '../proto/StationFlightSummary.proto?raw';

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
}

const kafkaConsumers: Consumer[] = [
  {
    name: "AircraftMaintenanceKafkaConnectConsumer",
    type: "kafka",
    status: "active",
    lastTested: "2024-01-15 14:30",
    topic: "aeroops_aircraft_maintenance_topic",
    protoSchema: "", // Add proto file content if applicable
    messageType: "AircraftMaintenance",
    samplePayload: JSON.stringify({ maintenanceId: "AM123", aircraftId: "A789", status: "scheduled" }, null, 2),
    sampleKey: "maintenance-key-123"
  },
  {
    name: "DcsFlightUpdateInternalConsumer",
    type: "kafka",
    status: "active",
    topic: "aeroops_dcs_flight_update_topic",
    protoSchema: DcsFlightUpdateInternal,
    messageType: "DcsFlightUpdateInternal",
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
    protoSchema: "", // Add proto file content
    messageType: "DelayMapping",
    samplePayload: JSON.stringify({ flightId: "DM789", delayMinutes: 30 }, null, 2),
    sampleKey: "delay-key-789"
  },
  {
    name: "DelayPredictionConsumer",
    type: "kafka",
    status: "error",
    topic: "aeroops_delay_prediction_topic",
    protoSchema: "", // Add proto file content
    messageType: "DelayPrediction",
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
    samplePayload: JSON.stringify({ messageId: "ACARS456", content: "flight update" }, null, 2),
    sampleKey: "acars-key-456"
  },
  {
    name: "FlightFuelKafkaConnectConsumer",
    type: "kafka",
    status: "active",
    topic: "aeroops_flight_fuel_topic",
    protoSchema: "", // Add proto file content
    messageType: "FlightFuel",
    samplePayload: JSON.stringify({ flightId: "FF789", fuelAmount: 5000 }, null, 2),
    sampleKey: "fuel-key-789"
  },
  {
    name: "FlightInBoundOutBoundKafkaConnectConsumer",
    type: "kafka",
    status: "inactive",
    topic: "aeroops_inbound_outbound_topic",
    protoSchema: "", // Add proto file content
    messageType: "InBoundOutBound",
    samplePayload: JSON.stringify({ flightId: "IO123", direction: "inbound" }, null, 2),
    sampleKey: "inout-key-123"
  },
  {
    name: "FlightKafkaConnectConsumer",
    type: "kafka",
    status: "active",
    lastTested: "2024-01-15 14:20",
    topic: "aeroops_flight_connect_topic",
    protoSchema: "", // Add proto file content
    messageType: "FlightConnect",
    samplePayload: JSON.stringify({ flightId: "FC456", status: "connected" }, null, 2),
    sampleKey: "connect-key-456"
  },
  {
    name: "FlightKafkaEETConsumer",
    type: "kafka",
    status: "active",
    topic: "aeroops_flight_eet_topic",
    protoSchema: "", // Add proto file content
    messageType: "FlightEET",
    samplePayload: JSON.stringify({ flightId: "EET789", estimatedTime: "2024-01-15T15:00:00Z" }, null, 2),
    sampleKey: "eet-key-789"
  },
  {
    name: "FlightKeyUpdateInternalConsumer",
    type: "kafka",
    status: "inactive",
    topic: "aeroops_flight_key_update_topic",
    protoSchema: "", // Add proto file content
    messageType: "FlightKeyUpdate",
    samplePayload: JSON.stringify({ flightId: "FKU123", key: "new-key" }, null, 2),
    sampleKey: "key-update-123"
  },
  {
    name: "FlightPassengerKafkaConnectConsumer",
    type: "kafka",
    status: "active",
    lastTested: "2024-01-15 14:10",
    topic: "aeroops_flight_passenger_topic",
    protoSchema: "", // Add proto file content
    messageType: "FlightPassenger",
    samplePayload: JSON.stringify({ flightId: "FP456", passengerCount: 150 }, null, 2),
    sampleKey: "passenger-key-456"
  },
  {
    name: "FlightUpdateEventConsumer",
    type: "kafka",
    status: "active",
    topic: "aeroops_flight_updates",
    protoSchema: "", // ADD proto
    messageType: "FlightUpdate",
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
    protoSchema: "", // Add proto file content
    messageType: "FuelPrice",
    samplePayload: JSON.stringify({ fuelType: "Jet-A", price: 5.50 }, null, 2),
    sampleKey: "fuel-price-key-123"
  },
  {
    name: "FuelSupplierKafkaConnectConsumer",
    type: "kafka",
    status: "active",
    topic: "aeroops_fuel_supplier_topic",
    protoSchema: "", // Add proto file content
    messageType: "FuelSupplier",
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
    samplePayload: JSON.stringify({ operationId: "GO123", status: "completed" }, null, 2),
    sampleKey: "ground-ops-key-123"
  },
  {
    name: "OpsLdmConsumer",
    type: "kafka",
    status: "active",
    topic: "aeroline_ldm_data_topic",
    protoSchema: LdmMessage,
    messageType: "LdmMessage",
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
    protoSchema:MvtMessage,
    messageType: "MvtMessage",
    samplePayload: JSON.stringify(
      {
  flightIdentifier: "890133237",
  airlineDesignator: "G9",
  flightNumber: "G9536",
  flightOperationDateTimeZulu: "12",
  aircraftRegistration: "A6ANA",
  movementAirportCode: "SHJ",
  movmentData: {
    departureMessageDetails: {
      departureIdentifier: "AD",
      offBlockDateTimeZulu: { time: "04:35", date: "12" },
      airBorneDateTimeZule: { time: "04:38", date: "12" },
      estimatedArrivalDateTimeZulu: { time: "08:40", date: "12" },
      estimatedArrivalAirport: "KTM",
      delay: {
        0: {
          delayIdentifier: "DEL-001",
          delayCode: "81",
          delayInMinutes: 5,
          subDelayCode: "81A",
        },
        1: {
          delayIdentifier: "DEL-001",
          delayCode: "93",
          delayInMinutes: 5,
          subDelayCode: "93L",
        },
      },
      passengerInformation: {
        0: { occupiedCount: 132 },
      },
      reclearanceTimeInMinutes: 0,
      reclearanceAirport: "",
      estimatedOnblockTimeZulu: { time: "08:40", date: "12" },
      scheduledFlightDepartureDateTimeZulu: "2025-06-12T04:25:00Z",
      extraDelay: {},
      crewReportTime: {
        0: {
          crewType: "COCKPIT_CREW",
          reportingDateTimeZulu: { time: "04:00", date: "12" },
        },
      },
      movementAfterPushBackDateTimeZulu: { time: "04:35", date: "12" },
      takeOffFuel: 11000,
      takeOffWeight: 26000,
      zeroFuelWeight: 15000,
      operationCategory: {
        crewCategory: "STANDARD",
        aircraftCategory: "COMMERCIAL",
      },
    },
    arrivalMessageDetail: {
      arrivalIdentifier: "THIS SHOULD NOT BE AA FOR DEPATURE",
      touchDownDateTimeZulu: { time: "08:38", date: "12" },
      onBlockDateTimeZule: { time: "08:40", date: "12" },
      scheduledFlightDepartureDateTimeZulu: "2025-06-12T04:25:00Z",
    },
    delayMessageDetail: {
      estimatedDepartureDateTime: { time: "04:35", date: "12" },
      revisedArrivalDateTime: { time: "08:40", date: "12" },
      estimatedBlockDateTimeZule: { time: "08:40", date: "12" },
      delay: {
        0: { delayCode: "93", delayInMinutes: 10, subDelayCode: "93L" },
      },
      scheduledFlightDepartureDateTimeZulu: "2025-06-12T04:25:00Z",
      extraDelay: {},
    },
  },
  rawMessage:
    "COR\nMVT\nG9536/12.A6ABC.SHJ\nAD120435/120438 EA0840 KTM\nDL81/0010\nPX132\nDLA81A///\nAA120838/120840\n",
  remarks: "Runway congestion delay - 10 minutes",
}
, null, 2),
    sampleKey: "mvt-key-789"
  },
  {
    name: "OtherSystemsFlightUpdateInternalConsumer",
    type: "kafka",
    status: "error",
    topic: "aeroops_flight_update_internal_topic",
    protoSchema: OtherSystemsFlightUpdateInternalProto,
    messageType: "OtherSystemsFlightUpdateInternal",
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