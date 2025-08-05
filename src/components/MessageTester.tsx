import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Send, FileText, CheckCircle, XCircle, Clock, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import protobuf from 'protobufjs';

interface TestResult {
  id: string;
  timestamp: string;
  consumer: string;
  type: 'kafka' | 'jms';
  status: 'success' | 'error' | 'pending';
  message: string;
  response?: string;
  error?: string;
  serializedBuffer?: string;
  protoSchema?: string;
  messageFormat?: 'protobuf' | 'json' | 'string';
}

interface ConsumerConfig {
  topic?: string;
  protoSchema?: string;
  messageType?: string;
  samplePayload?: string;
  sampleKey?: string;
  messageFormat?: 'protobuf' | 'json' | 'string';
}

interface MessageTesterProps {
  selectedConsumer?: {
    name: string;
    type: 'kafka' | 'jms';
    topic?: string;
    protoSchema?: string;
    messageType?: string;
    samplePayload?: string;
    sampleKey?: string;
    messageFormat?: 'protobuf' | 'json' | 'string';
  } | null;
}

export const MessageTester = ({ selectedConsumer }: MessageTesterProps) => {
  const [protoFile, setProtoFile] = useState<File | null>(null);
  const [protoContent, setProtoContent] = useState("");
  const [protoInputMode, setProtoInputMode] = useState<'upload' | 'text'>('text');
  const [jsonSample, setJsonSample] = useState("");
  const [messagePayload, setMessagePayload] = useState("");
  const [topic, setTopic] = useState("");
  const [queue, setQueue] = useState("");
  const [headers, setHeaders] = useState("");
  const [messageType, setMessageType] = useState("");
  const [key, setKey] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [validationResult, setValidationResult] = useState<{ status: 'valid' | 'invalid' | null; message: string }>({
    status: null,
    message: ""
  });
  const { toast } = useToast();

  // Load consumer config when selectedConsumer changes
  useEffect(() => {
    if (selectedConsumer?.name && selectedConsumer.type === 'kafka') {
      // Load from localStorage if available, else use consumer props
      const savedConfig = JSON.parse(localStorage.getItem(`consumerConfig_${selectedConsumer.name}`) || '{}');
      setTopic(savedConfig.topic || selectedConsumer.topic || "");
      setProtoContent(savedConfig.protoSchema || selectedConsumer.protoSchema || "");
      setMessageType(savedConfig.messageType || selectedConsumer.messageType || "");
      setJsonSample(savedConfig.samplePayload || selectedConsumer.samplePayload || "");
      setMessagePayload(savedConfig.samplePayload || selectedConsumer.samplePayload || "");
      setKey(savedConfig.sampleKey || selectedConsumer.sampleKey || "");
      setHeaders(savedConfig.headers || "");
    } else if (selectedConsumer?.type === 'jms') {
      const savedConfig = JSON.parse(localStorage.getItem(`consumerConfig_${selectedConsumer.name}`) || '{}');
      setQueue(savedConfig.queue || "");
      setTopic("");
      setProtoContent("");
      setMessageType("");
      setJsonSample("");
      setMessagePayload("");
      setKey("");
      setHeaders("");
    } else {
      setTopic("");
      setQueue("");
      setProtoContent("");
      setMessageType("");
      setJsonSample("");
      setMessagePayload("");
      setKey("");
      setHeaders("");
    }
  }, [selectedConsumer]);

  // Save consumer config to localStorage
  const saveConsumerConfig = () => {
    if (selectedConsumer?.name) {
      const config: ConsumerConfig & { headers?: string; queue?: string } = {
        topic,
        protoSchema: selectedConsumer?.messageFormat === 'protobuf' ? protoContent : undefined,
        messageType: selectedConsumer?.messageFormat === 'protobuf' ? messageType : undefined,
        samplePayload: jsonSample,
        sampleKey: key,
        headers,
        queue: selectedConsumer?.type === 'jms' ? queue : undefined,
        messageFormat: selectedConsumer?.messageFormat
      };
      localStorage.setItem(`consumerConfig_${selectedConsumer.name}`, JSON.stringify(config));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProtoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setProtoContent(content);
        setMessageType(file.name.replace('.proto', '')); // Auto-set messageType
        saveConsumerConfig();
      };
      reader.readAsText(file);

      toast({
        title: "Proto File Uploaded",
        description: `${file.name} has been uploaded and loaded for editing.`
      });
    }
  };

  const handleValidateMessage = async () => {
    if (!jsonSample) {
      toast({
        title: "Missing Payload",
        description: "Please provide a JSON sample or message payload.",
        variant: "destructive"
      });
      return;
    }

    if (selectedConsumer?.messageFormat === 'protobuf' && (!protoContent || !messageType)) {
      toast({
        title: "Missing Requirements",
        description: "Please provide proto content and message type for Protobuf messages.",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);

    try {
      if (selectedConsumer?.messageFormat === 'protobuf') {
        // Load Protobuf schema
        const root = await protobuf.parse(protoContent, { keepCase: true }).root;
        const MessageType = root.lookupType(messageType);

        if (!MessageType) {
          setValidationResult({
            status: 'invalid',
            message: `Message type "${messageType}" not found in the provided schema`
          });
          toast({
            title: "Validation Failed",
            description: `Message type "${messageType}" not found in the provided schema`,
            variant: "destructive"
          });
          setIsValidating(false);
          return;
        }

        // Parse JSON sample
        let payload;
        try {
          payload = JSON.parse(jsonSample);
        } catch (error) {
          setValidationResult({
            status: 'invalid',
            message: 'Invalid JSON format'
          });
          toast({
            title: "Validation Failed",
            description: "Invalid JSON format",
            variant: "destructive"
          });
          setIsValidating(false);
          return;
        }

        // Validate against schema
        const validationError = MessageType.verify(payload);
        if (validationError) {
          setValidationResult({
            status: 'invalid',
            message: `Validation failed: ${validationError}`
          });
          toast({
            title: "Validation Failed",
            description: `Validation failed: ${validationError}`,
            variant: "destructive"
          });
        } else {
          // Serialize for preview
          const message = MessageType.create(payload);
          const buffer = MessageType.encode(message).finish();
          setValidationResult({
            status: 'valid',
            message: `Message structure is valid according to proto schema. Serialized buffer length: ${buffer.length} bytes`
          });
          setMessagePayload(JSON.stringify(payload));
          saveConsumerConfig();
          toast({
            title: "Validation Passed",
            description: "Message structure is valid according to proto schema"
          });
        }
      } else if (selectedConsumer?.messageFormat === 'json') {
        // Validate JSON syntax
        try {
          JSON.parse(jsonSample);
          setValidationResult({
            status: 'valid',
            message: 'JSON payload is valid'
          });
          setMessagePayload(jsonSample);
          saveConsumerConfig();
          toast({
            title: "Validation Passed",
            description: "JSON payload is valid"
          });
        } catch (error) {
          setValidationResult({
            status: 'invalid',
            message: 'Invalid JSON format'
          });
          toast({
            title: "Validation Failed",
            description: "Invalid JSON format",
            variant: "destructive"
          });
        }
      } else {
        // String format: no validation needed
        setValidationResult({
          status: 'valid',
          message: 'String payload is valid'
        });
        setMessagePayload(jsonSample);
        saveConsumerConfig();
        toast({
          title: "Validation Passed",
          description: "String payload is valid"
        });
      }
    } catch (error) {
      setValidationResult({
        status: 'invalid',
        message: `Validation error: ${error.message}`
      });
      toast({
        title: "Validation Failed",
        description: `Validation error: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messagePayload) {
      toast({
        title: "No Message Payload",
        description: "Please provide a message payload to send.",
        variant: "destructive"
      });
      return;
    }

    if (selectedConsumer?.type === 'kafka' && !topic) {
      toast({
        title: "Missing Topic",
        description: "Please specify a Kafka topic.",
        variant: "destructive"
      });
      return;
    }

    if (selectedConsumer?.type === 'jms' && !queue) {
      toast({
        title: "Missing Queue",
        description: "Please specify a JMS queue.",
        variant: "destructive"
      });
      return;
    }

    if (selectedConsumer?.type === 'kafka' && selectedConsumer?.messageFormat === 'protobuf' && (!protoContent || !messageType)) {
      toast({
        title: "Missing Schema",
        description: "Please provide a Protobuf schema and message type.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);

    const testId = `test-${Date.now()}`;
    let serializedBuffer: string | undefined;

    // Pre-serialize for debugging (Protobuf only)
    if (selectedConsumer?.type === 'kafka' && selectedConsumer?.messageFormat === 'protobuf') {
      try {
        const root = await protobuf.parse(protoContent, { keepCase: true }).root;
        const MessageType = root.lookupType(messageType);
        const payload = JSON.parse(messagePayload);
        const message = MessageType.create(payload);
        const buffer = MessageType.encode(message).finish();
        serializedBuffer = buffer.toString('hex');
      } catch (error) {
        console.error('Pre-serialization error:', error);
      }
    }

    const newTest: TestResult = {
      id: testId,
      timestamp: new Date().toISOString(),
      consumer: selectedConsumer?.name || "Unknown",
      type: selectedConsumer?.type || 'kafka',
      status: 'pending',
      message: messagePayload,
      serializedBuffer: selectedConsumer?.messageFormat === 'protobuf' ? serializedBuffer : undefined,
      protoSchema: selectedConsumer?.messageFormat === 'protobuf' ? protoContent : undefined,
      messageFormat: selectedConsumer?.messageFormat
    };

    setTestResults(prev => [newTest, ...prev]);

    try {
      let parsedHeaders: Record<string, string> | undefined;
      if (headers) {
        try {
          parsedHeaders = JSON.parse(headers);
        } catch (error) {
          throw new Error('Invalid headers JSON format');
        }
      }

      let payload = messagePayload;
      if (selectedConsumer?.messageFormat === 'json') {
        try {
          JSON.parse(messagePayload); // Ensure valid JSON
        } catch (error) {
          throw new Error('Invalid JSON payload');
        }
      }

      const response = await fetch('http://localhost:3001/api/kafka/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: JSON.parse(localStorage.getItem('kafkaConfig') || '{}'),
          topic,
          messagePayload: payload,
          protoSchema: selectedConsumer?.messageFormat === 'protobuf' ? protoContent : undefined,
          messageType: selectedConsumer?.messageFormat === 'protobuf' ? messageType : undefined,
          key,
          messageFormat: selectedConsumer?.messageFormat
        })
      });

      const result = await response.json();

      setTestResults(prev => prev.map(test =>
        test.id === testId
          ? {
              ...test,
              status: result.status,
              response: result.status === 'success' ? result.message : undefined,
              error: result.status === 'error' ? result.message : undefined,
              serializedBuffer: result.serializedBuffer || test.serializedBuffer
            }
          : test
      ));

      toast({
        title: result.status === 'success' ? "Message Sent" : "Send Failed",
        description: result.message,
        variant: result.status === 'success' ? "default" : "destructive"
      });

      saveConsumerConfig();
    } catch (error: any) {
      setTestResults(prev => prev.map(test =>
        test.id === testId
          ? {
              ...test,
              status: 'error',
              error: error.message || 'Failed to send message'
            }
          : test
      ));

      toast({
        title: "Send Failed",
        description: error.message || "Failed to send message. Check connection.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending': return <Clock className="h-4 w-4 text-warning animate-pulse" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <Badge className="bg-success text-success-foreground">Success</Badge>;
      case 'error': return <Badge className="bg-destructive text-destructive-foreground">Error</Badge>;
      case 'pending': return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Message Tester
            {selectedConsumer && (
              <Badge variant="outline" className="ml-2">
                {selectedConsumer.name} ({selectedConsumer.type.toUpperCase()})
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="compose" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="compose">Compose Message</TabsTrigger>
              <TabsTrigger value="validate">Validate & Test</TabsTrigger>
              <TabsTrigger value="results">Test Results</TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="space-y-6">
              <div className="space-y-4">
                {selectedConsumer?.type === 'kafka' && selectedConsumer?.messageFormat === 'protobuf' && (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Proto File & Validation</h3>
                      <Select value={protoInputMode} onValueChange={(value: 'upload' | 'text') => setProtoInputMode(value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text Input</SelectItem>
                          <SelectItem value="upload">Upload</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {protoInputMode === 'upload' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="protoFile">Upload Proto File</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="protoFile"
                              type="file"
                              accept=".proto"
                              onChange={handleFileUpload}
                              className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-muted file:text-muted-foreground"
                            />
                            {protoFile && <CheckCircle className="h-5 w-5 text-success" />}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Proto File Status</Label>
                          <div className="flex items-center gap-2 p-2 rounded border bg-muted">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">
                              {protoFile ? protoFile.name : "No file selected"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <Label htmlFor="protoContent">Proto File Content</Label>
                      <Textarea
                        id="protoContent"
                        value={protoContent}
                        onChange={(e) => { setProtoContent(e.target.value); saveConsumerConfig(); }}
                        placeholder='syntax = "proto3";\nmessage OtherSystemsFlightUpdateInternal {\n  repeated string flightReferences = 1;\n  string originFlightReference = 2;\n  bool isAdhoc = 3;\n  bool isFlightTimeUpdate = 4;\n  bool isRegistrationUpdate = 5;\n}'
                        rows={12}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="messageType">Message Type</Label>
                      <Input
                        id="messageType"
                        value={messageType}
                        onChange={(e) => { setMessageType(e.target.value); saveConsumerConfig(); }}
                        placeholder="OtherSystemsFlightUpdateInternal"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="jsonSample">Message Payload</Label>
                  <Textarea
                    id="jsonSample"
                    value={jsonSample}
                    onChange={(e) => { setJsonSample(e.target.value); saveConsumerConfig(); }}
                    placeholder={
                      selectedConsumer?.messageFormat === 'protobuf' || selectedConsumer?.messageFormat === 'json'
                        ? '{"flightReferences": ["okcEPEt", "IQe"], "originFlightReference": "7oFfs8WGv", "isAdhoc": true, "isFlightTimeUpdate": false, "isRegistrationUpdate": true}'
                        : 'Raw message string'
                    }
                    rows={6}
                  />
                </div>

                <Button
                  onClick={handleValidateMessage}
                  disabled={isValidating}
                  className="flex items-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Validate Message
                    </>
                  )}
                </Button>

                {validationResult.status && (
                  <div className={`p-3 rounded border ${
                    validationResult.status === 'valid'
                      ? 'bg-success/10 border-success text-success'
                      : 'bg-destructive/10 border-destructive text-destructive'
                  }`}>
                    <div className="flex items-center gap-2">
                      {validationResult.status === 'valid' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <span className="font-medium">
                        {validationResult.status === 'valid' ? 'Validation Passed' : 'Validation Failed'}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{validationResult.message}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="validate" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Message Configuration</h3>

                {selectedConsumer?.type === 'kafka' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="topic">Kafka Topic</Label>
                      <Input
                        id="topic"
                        value={topic}
                        onChange={(e) => { setTopic(e.target.value); saveConsumerConfig(); }}
                        placeholder="aeroops_flight_update_internal_topic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="key">Message Key</Label>
                      <Input
                        id="key"
                        value={key}
                        onChange={(e) => { setKey(e.target.value); saveConsumerConfig(); }}
                        placeholder="flight-update-key-123"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="queue">JMS Queue</Label>
                    <Input
                      id="queue"
                      value={queue}
                      onChange={(e) => { setQueue(e.target.value); saveConsumerConfig(); }}
                      placeholder="aero.ops.acars.messages"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="headers">Message Headers (JSON, Optional)</Label>
                  <Textarea
                    id="headers"
                    value={headers}
                    onChange={(e) => { setHeaders(e.target.value); saveConsumerConfig(); }}
                    placeholder='{"messageType": "flightUpdate", "version": "1.0"}'
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="messagePayload">Message Payload</Label>
                  <Textarea
                    id="messagePayload"
                    value={messagePayload}
                    onChange={(e) => { setMessagePayload(e.target.value); saveConsumerConfig(); }}
                    placeholder={
                      selectedConsumer?.messageFormat === 'protobuf' || selectedConsumer?.messageFormat === 'json'
                        ? '{"flightReferences": ["okcEPEt", "IQe"], "originFlightReference": "7oFfs8WGv", "isAdhoc": true, "isFlightTimeUpdate": false, "isRegistrationUpdate": true}'
                        : 'Raw message string'
                    }
                    rows={8}
                  />
                </div>

                <Button
                  onClick={handleSendMessage}
                  disabled={isSending}
                  className="flex items-center gap-2"
                >
                  {isSending ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Test Results</h3>
                <Badge variant="outline">{testResults.length} tests</Badge>
              </div>

              <ScrollArea className="h-96 w-full">
                <div className="space-y-3">
                  {testResults.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2" />
                      <p>No test results yet. Send a message to see results here.</p>
                    </div>
                  ) : (
                    testResults.map((result) => (
                      <Card key={result.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(result.status)}
                                <span className="font-medium">{result.consumer}</span>
                                <Badge variant="outline" className="text-xs">
                                  {result.type.toUpperCase()}
                                </Badge>
                                {result.messageFormat && (
                                  <Badge variant="outline" className="text-xs">
                                    {result.messageFormat.toUpperCase()}
                                  </Badge>
                                )}
                                {getStatusBadge(result.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(result.timestamp).toLocaleString()}
                              </p>
                              {result.response && (
                                <p className="text-sm text-success">{result.response}</p>
                              )}
                              {result.error && (
                                <p className="text-sm text-destructive">{result.error}</p>
                              )}
                            </div>
                          </div>
                          <Separator className="my-3" />
                          <details className="group">
                            <summary className="cursor-pointer text-sm font-medium">
                              Message Payload
                            </summary>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                              {result.messageFormat === 'string'
                                ? result.message
                                : JSON.stringify(JSON.parse(result.message || "{}"), null, 2)}
                            </pre>
                          </details>
                          {result.serializedBuffer && (
                            <>
                              <Separator className="my-3" />
                              <details className="group">
                                <summary className="cursor-pointer text-sm font-medium">
                                  Serialized Buffer (Hex)
                                </summary>
                                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                                  {result.serializedBuffer}
                                </pre>
                              </details>
                            </>
                          )}
                          {result.protoSchema && (
                            <>
                              <Separator className="my-3" />
                              <details className="group">
                                <summary className="cursor-pointer text-sm font-medium">
                                  Protobuf Schema
                                </summary>
                                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                                  {result.protoSchema}
                                </pre>
                              </details>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};