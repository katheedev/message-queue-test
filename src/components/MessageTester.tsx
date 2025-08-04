import { useState } from "react";
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

interface TestResult {
  id: string;
  timestamp: string;
  consumer: string;
  type: 'kafka' | 'jms';
  status: 'success' | 'error' | 'pending';
  message: string;
  response?: string;
  error?: string;
}

interface MessageTesterProps {
  selectedConsumer?: { name: string; type: 'kafka' | 'jms' } | null;
}

export const MessageTester = ({ selectedConsumer }: MessageTesterProps) => {
  const [protoFile, setProtoFile] = useState<File | null>(null);
  const [jsonSample, setJsonSample] = useState("");
  const [messagePayload, setMessagePayload] = useState("");
  const [topic, setTopic] = useState("");
  const [queue, setQueue] = useState("");
  const [headers, setHeaders] = useState("{}");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [validationResult, setValidationResult] = useState<{status: 'valid' | 'invalid' | null, message: string}>({
    status: null,
    message: ""
  });
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProtoFile(file);
      toast({
        title: "Proto File Uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
    }
  };

  const handleValidateMessage = async () => {
    if (!protoFile || !jsonSample) {
      toast({
        title: "Missing Requirements",
        description: "Please upload a proto file and provide JSON sample.",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    
    // Simulate validation process
    setTimeout(() => {
      const isValid = Math.random() > 0.3; // 70% success rate for demo
      setValidationResult({
        status: isValid ? 'valid' : 'invalid',
        message: isValid 
          ? "Message structure is valid according to proto schema"
          : "Message validation failed: Missing required field 'flightNumber'"
      });
      setIsValidating(false);
      
      if (isValid) {
        setMessagePayload(jsonSample);
      }
    }, 1500);
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

    setIsSending(true);
    
    const testId = `test-${Date.now()}`;
    const newTest: TestResult = {
      id: testId,
      timestamp: new Date().toISOString(),
      consumer: selectedConsumer?.name || "Unknown",
      type: selectedConsumer?.type || 'kafka',
      status: 'pending',
      message: messagePayload
    };
    
    setTestResults(prev => [newTest, ...prev]);

    // Simulate message sending
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% success rate for demo
      
      setTestResults(prev => prev.map(test => 
        test.id === testId 
          ? {
              ...test,
              status: success ? 'success' : 'error',
              response: success ? "Message sent successfully" : undefined,
              error: success ? undefined : "Connection timeout after 5 seconds"
            }
          : test
      ));
      
      setIsSending(false);
      
      toast({
        title: success ? "Message Sent" : "Send Failed",
        description: success 
          ? "Message has been sent successfully" 
          : "Failed to send message. Check connection.",
        variant: success ? "default" : "destructive"
      });
    }, 2000);
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
              {/* Proto File Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Proto File & Validation</h3>
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

                <div className="space-y-2">
                  <Label htmlFor="jsonSample">JSON Sample for Validation</Label>
                  <Textarea
                    id="jsonSample"
                    value={jsonSample}
                    onChange={(e) => setJsonSample(e.target.value)}
                    placeholder='{"flightNumber": "AA123", "departure": "JFK", "arrival": "LAX", "timestamp": "2024-01-15T14:30:00Z"}'
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
              {/* Message Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Message Configuration</h3>
                
                {selectedConsumer?.type === 'kafka' ? (
                  <div className="space-y-2">
                    <Label htmlFor="topic">Kafka Topic</Label>
                    <Input
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="aero.ops.flight.updates"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="queue">JMS Queue</Label>
                    <Input
                      id="queue"
                      value={queue}
                      onChange={(e) => setQueue(e.target.value)}
                      placeholder="aero.ops.acars.messages"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="headers">Message Headers (JSON)</Label>
                  <Textarea
                    id="headers"
                    value={headers}
                    onChange={(e) => setHeaders(e.target.value)}
                    placeholder='{"messageType": "flightUpdate", "version": "1.0"}'
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="messagePayload">Message Payload</Label>
                  <Textarea
                    id="messagePayload"
                    value={messagePayload}
                    onChange={(e) => setMessagePayload(e.target.value)}
                    placeholder="Enter your message payload here..."
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
                              {JSON.stringify(JSON.parse(result.message || "{}"), null, 2)}
                            </pre>
                          </details>
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