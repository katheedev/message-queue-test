import { useEffect, useMemo, useState } from "react";
import protobuf from "protobufjs";
import {
  AlertTriangle,
  Database,
  KeyRound,
  Layers3,
  LogOut,
  Play,
  Plus,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Shield,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { DEFAULT_ADMIN_CREDENTIALS, UserService } from "@/services/userService";
import { AppService } from "@/services/appService";
import { HistoryService } from "@/services/historyService";
import { LocalConfigService } from "@/services/localConfigService";
import { useToast } from "@/hooks/use-toast";
import {
  AppEnvironment,
  EnvironmentKind,
  ENVIRONMENT_KIND_META,
  KafkaConfig,
  LocalEnvironmentOverride,
  MessageFormat,
  MessageLog,
  MessagingApplication,
  ProducerProfile,
  SessionUser,
  User,
  UserRole,
  createDefaultEnvironment,
  createDefaultJmsConfig,
  createDefaultKafkaConfig,
  createDefaultProducerProfile,
} from "@/types/environment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface LoginFormState {
  email: string;
  password: string;
}

interface UserFormState {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
  active: boolean;
}

interface ApplicationFormState {
  id?: string;
  name: string;
  description: string;
}

interface EnvironmentFormState {
  id?: string;
  name: string;
  kind: EnvironmentKind;
  description: string;
}

interface SendFormState {
  destination: string;
  key: string;
  headers: string;
  payload: string;
  protoSchema: string;
  messageType: string;
  messageFormat: MessageFormat;
}

interface RunResult {
  id: string;
  producerName: string;
  environmentName: string;
  transport: "kafka" | "jms";
  status: "success" | "error";
  message: string;
  payload: string;
  createdAt: string;
  serializedBuffer?: string;
}

const createEmptyUserForm = (): UserFormState => ({
  name: "",
  email: "",
  role: "qa",
  password: "",
  active: true,
});

const createEmptyApplicationForm = (): ApplicationFormState => ({
  name: "",
  description: "",
});

const createEmptyEnvironmentForm = (): EnvironmentFormState => ({
  name: "",
  kind: "staging",
  description: "",
});

const createSendForm = (producer?: ProducerProfile | null): SendFormState => ({
  destination: producer?.destination || "",
  key: producer?.defaultKey || "",
  headers: producer?.defaultHeaders || "{}",
  payload: producer?.defaultPayload || "{\n  \n}",
  protoSchema: producer?.protoSchema || "",
  messageType: producer?.messageType || "",
  messageFormat: producer?.messageFormat || "json",
});

const roleBadgeClassName = (role: UserRole) =>
  role === "admin"
    ? "border-sky-400/40 bg-sky-500/10 text-sky-100"
    : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";

const stringifyJson = (value: unknown) => JSON.stringify(value, null, 2);

const getProducerDefaults = (producer: ProducerProfile | null) => ({
  headers: producer?.defaultHeaders || "{}",
  payload: producer?.defaultPayload || "{\n  \n}",
  key: producer?.defaultKey || "",
  protoSchema: producer?.protoSchema || "",
  messageType: producer?.messageType || "",
});

const Index = () => {
  const { currentUser, loading: authLoading, isAdmin, login, logout, refreshSession } = useUser();
  const { toast } = useToast();
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    email: DEFAULT_ADMIN_CREDENTIALS.email,
    password: DEFAULT_ADMIN_CREDENTIALS.password,
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [applications, setApplications] = useState<MessagingApplication[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState("");
  const [selectedProducerId, setSelectedProducerId] = useState("");
  const [activeTab, setActiveTab] = useState("workspace");
  const [userForm, setUserForm] = useState<UserFormState>(createEmptyUserForm());
  const [applicationForm, setApplicationForm] = useState<ApplicationFormState>(createEmptyApplicationForm());
  const [environmentForm, setEnvironmentForm] = useState<EnvironmentFormState>(createEmptyEnvironmentForm());
  const [producerForm, setProducerForm] = useState({
    ...createDefaultProducerProfile(),
    id: undefined as string | undefined,
  });
  const [sharedKafkaDraft, setSharedKafkaDraft] = useState(createDefaultKafkaConfig());
  const [sharedJmsDraft, setSharedJmsDraft] = useState(createDefaultJmsConfig());
  const [localKafkaDraft, setLocalKafkaDraft] = useState(createDefaultKafkaConfig());
  const [localJmsDraft, setLocalJmsDraft] = useState(createDefaultJmsConfig());
  const [sendForm, setSendForm] = useState<SendFormState>(createSendForm());
  const [runResults, setRunResults] = useState<RunResult[]>([]);
  const [isSavingSharedConfig, setIsSavingSharedConfig] = useState(false);
  const [isSavingLocalConfig, setIsSavingLocalConfig] = useState(false);
  const [isSavingProducer, setIsSavingProducer] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string>("");
  const [validationStatus, setValidationStatus] = useState<"success" | "error" | "idle">("idle");

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === selectedAppId) || null,
    [applications, selectedAppId],
  );
  const selectedEnvironment = useMemo(
    () =>
      selectedApplication?.environments.find(
        (environment) => environment.id === selectedEnvironmentId,
      ) || null,
    [selectedApplication, selectedEnvironmentId],
  );
  const selectedProducer = useMemo(
    () =>
      selectedEnvironment?.producers.find((producer) => producer.id === selectedProducerId) ||
      null,
    [selectedEnvironment, selectedProducerId],
  );

  const effectiveKafkaConfig = useMemo(
    () => ({
      ...(selectedEnvironment?.kafkaConfig || createDefaultKafkaConfig()),
      ...(!isAdmin ? localKafkaDraft : {}),
    }),
    [isAdmin, localKafkaDraft, selectedEnvironment],
  );

  const effectiveJmsConfig = useMemo(
    () => ({
      ...(selectedEnvironment?.jmsConfig || createDefaultJmsConfig()),
      ...(!isAdmin ? localJmsDraft : {}),
    }),
    [isAdmin, localJmsDraft, selectedEnvironment],
  );

  const isProductionEnvironment = selectedEnvironment?.kind === "production";
  const selectedEnvironmentMeta = selectedEnvironment
    ? ENVIRONMENT_KIND_META[selectedEnvironment.kind]
    : null;

  const loadWorkspace = async (sessionUser: SessionUser | null = currentUser) => {
    if (!sessionUser) {
      return;
    }

    setWorkspaceLoading(true);
    try {
      const [nextApplications, nextUsers] = await Promise.all([
        AppService.getApplications(),
        isAdmin ? UserService.getUsers() : Promise.resolve([]),
      ]);
      setApplications(nextApplications);
      setUsers(nextUsers);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const loadLogs = async (applicationId: string) => {
    try {
      const nextLogs = await HistoryService.getLogsForApplication(applicationId, 10);
      setLogs(nextLogs);
    } catch {
      setLogs([]);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setApplications([]);
      setUsers([]);
      setLogs([]);
      setSelectedAppId("");
      setSelectedEnvironmentId("");
      setSelectedProducerId("");
      return;
    }

    loadWorkspace(currentUser);
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (!selectedAppId && applications.length > 0) {
      setSelectedAppId(applications[0].id);
      return;
    }

    if (selectedAppId && !applications.some((application) => application.id === selectedAppId)) {
      setSelectedAppId(applications[0]?.id || "");
    }
  }, [applications, selectedAppId]);

  useEffect(() => {
    const environments = selectedApplication?.environments || [];
    if (!selectedEnvironmentId && environments.length > 0) {
      setSelectedEnvironmentId(environments[0].id);
      return;
    }

    if (
      selectedEnvironmentId &&
      !environments.some((environment) => environment.id === selectedEnvironmentId)
    ) {
      setSelectedEnvironmentId(environments[0]?.id || "");
    }
  }, [selectedApplication, selectedEnvironmentId]);

  useEffect(() => {
    const producers = selectedEnvironment?.producers || [];
    if (!selectedProducerId && producers.length > 0) {
      setSelectedProducerId(producers[0].id);
      return;
    }

    if (
      selectedProducerId &&
      !producers.some((producer) => producer.id === selectedProducerId)
    ) {
      setSelectedProducerId(producers[0]?.id || "");
    }
  }, [selectedEnvironment, selectedProducerId]);

  useEffect(() => {
    if (!selectedApplication) {
      setLogs([]);
      return;
    }

    loadLogs(selectedApplication.id);
  }, [selectedApplication?.id]);

  useEffect(() => {
    if (!selectedEnvironment) {
      setSharedKafkaDraft(createDefaultKafkaConfig());
      setSharedJmsDraft(createDefaultJmsConfig());
      setLocalKafkaDraft(createDefaultKafkaConfig());
      setLocalJmsDraft(createDefaultJmsConfig());
      return;
    }

    setSharedKafkaDraft(selectedEnvironment.kafkaConfig);
    setSharedJmsDraft(selectedEnvironment.jmsConfig);

    if (currentUser) {
      const localOverride = LocalConfigService.getOverride(
        currentUser.id,
        selectedApplication?.id || "",
        selectedEnvironment.id,
      );
      setLocalKafkaDraft(localOverride.kafkaConfig || selectedEnvironment.kafkaConfig);
      setLocalJmsDraft(localOverride.jmsConfig || selectedEnvironment.jmsConfig);
    }
  }, [currentUser, selectedApplication?.id, selectedEnvironment]);

  useEffect(() => {
    setSendForm(createSendForm(selectedProducer));
    setValidationStatus("idle");
    setValidationMessage("");
  }, [selectedProducerId, selectedEnvironmentId, selectedAppId]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login(loginForm.email, loginForm.password);
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: error instanceof Error ? error.message : "Unable to sign in.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSaveSharedConfig = async () => {
    if (!selectedApplication || !selectedEnvironment || !isAdmin) {
      return;
    }

    setIsSavingSharedConfig(true);
    try {
      await AppService.updateEnvironment(selectedApplication.id, selectedEnvironment.id, {
        kafkaConfig: sharedKafkaDraft,
        jmsConfig: sharedJmsDraft,
      });
      await loadWorkspace();
      toast({
        title: "Shared config updated",
        description: `${selectedEnvironment.name} now uses the saved Kafka and JMS settings.`,
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to save config.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSharedConfig(false);
    }
  };

  const handleSaveLocalOverride = async () => {
    if (!currentUser || !selectedApplication || !selectedEnvironment || isAdmin) {
      return;
    }

    setIsSavingLocalConfig(true);
    try {
      const override: LocalEnvironmentOverride = {
        kafkaConfig: localKafkaDraft,
        jmsConfig: localJmsDraft,
      };
      LocalConfigService.saveOverride(
        currentUser.id,
        selectedApplication.id,
        selectedEnvironment.id,
        override,
      );
      toast({
        title: "Local override saved",
        description: "These config changes only apply to your browser session for testing.",
      });
    } finally {
      setIsSavingLocalConfig(false);
    }
  };

  const handleClearLocalOverride = () => {
    if (!currentUser || !selectedApplication || !selectedEnvironment) {
      return;
    }

    LocalConfigService.clearOverride(
      currentUser.id,
      selectedApplication.id,
      selectedEnvironment.id,
    );
    setLocalKafkaDraft(selectedEnvironment.kafkaConfig);
    setLocalJmsDraft(selectedEnvironment.jmsConfig);
    toast({
      title: "Local override cleared",
      description: "Testing config reverted to the admin-managed environment config.",
    });
  };

  const resetProducerForm = () => {
    setProducerForm({
      ...createDefaultProducerProfile(),
      id: undefined,
    });
  };

  const handleSaveProducer = async () => {
    if (!selectedApplication || !selectedEnvironment || !isAdmin) {
      return;
    }

    if (!producerForm.name.trim() || !producerForm.destination.trim()) {
      toast({
        title: "Missing producer data",
        description: "Producer name and destination are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingProducer(true);
    try {
      await AppService.upsertProducer(selectedApplication.id, selectedEnvironment.id, {
        ...producerForm,
        name: producerForm.name.trim(),
        destination: producerForm.destination.trim(),
        description: producerForm.description.trim(),
      });
      await loadWorkspace();
      resetProducerForm();
      toast({
        title: producerForm.id ? "Producer updated" : "Producer created",
        description: "The producer profile is available in the current environment.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to save producer.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProducer(false);
    }
  };

  const handleValidatePayload = async () => {
    if (!selectedProducer) {
      return;
    }

    try {
      if (sendForm.messageFormat === "json") {
        JSON.parse(sendForm.payload);
      }

      if (sendForm.messageFormat === "protobuf") {
        const root = protobuf.parse(sendForm.protoSchema, { keepCase: true }).root;
        const messageType = root.lookupType(sendForm.messageType);
        const payload = JSON.parse(sendForm.payload);
        const validationResult = messageType.verify(payload);
        if (validationResult) {
          throw new Error(validationResult);
        }
      }

      setValidationStatus("success");
      setValidationMessage("Payload is valid for the selected producer profile.");
    } catch (error) {
      setValidationStatus("error");
      setValidationMessage(error instanceof Error ? error.message : "Payload validation failed.");
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser || !selectedApplication || !selectedEnvironment || !selectedProducer) {
      return;
    }

    if (!sendForm.destination.trim()) {
      toast({
        title: "Missing destination",
        description: "Select a producer with a valid topic or queue.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      let parsedHeaders: Record<string, string> | undefined;
      if (selectedProducer.transport === "kafka" && sendForm.headers.trim()) {
        parsedHeaders = JSON.parse(sendForm.headers);
      }

      if (sendForm.messageFormat === "json") {
        JSON.parse(sendForm.payload);
      }

      if (sendForm.messageFormat === "protobuf") {
        const root = protobuf.parse(sendForm.protoSchema, { keepCase: true }).root;
        const messageType = root.lookupType(sendForm.messageType);
        const payload = JSON.parse(sendForm.payload);
        const validationResult = messageType.verify(payload);
        if (validationResult) {
          throw new Error(validationResult);
        }
      }

      const endpoint =
        selectedProducer.transport === "kafka"
          ? "http://localhost:3001/api/kafka/send-message"
          : "http://localhost:3001/api/ibmmq/send-message";

      const requestBody =
        selectedProducer.transport === "kafka"
          ? {
              config: effectiveKafkaConfig,
              topic: sendForm.destination,
              messagePayload: sendForm.payload,
              protoSchema:
                sendForm.messageFormat === "protobuf" ? sendForm.protoSchema : undefined,
              messageType:
                sendForm.messageFormat === "protobuf" ? sendForm.messageType : undefined,
              key: sendForm.key || undefined,
              headers: parsedHeaders,
              messageFormat: sendForm.messageFormat,
            }
          : {
              config: effectiveJmsConfig,
              queue: sendForm.destination,
              messagePayload: sendForm.payload,
              messageFormat: sendForm.messageFormat,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const result = await response.json();

      if (!response.ok || result.status === "error") {
        throw new Error(result.message || "Message send failed.");
      }

      const nextResult: RunResult = {
        id: crypto.randomUUID(),
        producerName: selectedProducer.name,
        environmentName: selectedEnvironment.name,
        transport: selectedProducer.transport,
        status: "success",
        message: result.message,
        payload: sendForm.payload,
        createdAt: new Date().toISOString(),
        serializedBuffer: result.serializedBuffer,
      };
      setRunResults((previous) => [nextResult, ...previous].slice(0, 10));

      await HistoryService.logMessage({
        appId: selectedApplication.id,
        appName: selectedApplication.name,
        environmentId: selectedEnvironment.id,
        environmentName: selectedEnvironment.name,
        producerId: selectedProducer.id,
        producerName: selectedProducer.name,
        userId: currentUser.id,
        userName: currentUser.name,
        transport: selectedProducer.transport,
        payload: sendForm.payload,
        status: "success",
        result: result.message,
        messageFormat: sendForm.messageFormat,
      });
      await loadLogs(selectedApplication.id);

      toast({
        title: "Message sent",
        description: result.message,
      });
    } catch (error) {
      const nextResult: RunResult = {
        id: crypto.randomUUID(),
        producerName: selectedProducer.name,
        environmentName: selectedEnvironment.name,
        transport: selectedProducer.transport,
        status: "error",
        message: error instanceof Error ? error.message : "Message send failed.",
        payload: sendForm.payload,
        createdAt: new Date().toISOString(),
      };
      setRunResults((previous) => [nextResult, ...previous].slice(0, 10));
      toast({
        title: "Send failed",
        description: error instanceof Error ? error.message : "Message send failed.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveUser = async () => {
    if (!isAdmin) {
      return;
    }

    if (!userForm.name.trim() || !userForm.email.trim()) {
      toast({
        title: "Missing user data",
        description: "Name and email are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (userForm.id) {
        await UserService.updateUser(userForm.id, {
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          active: userForm.active,
        });
        if (userForm.password.trim()) {
          await UserService.resetPassword(userForm.id, userForm.password);
        }
      } else {
        if (!userForm.password.trim()) {
          throw new Error("A password is required when creating a new user.");
        }
        await UserService.createUser({
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          password: userForm.password,
        });
      }

      await loadWorkspace();
      await refreshSession();
      setUserForm(createEmptyUserForm());
      toast({
        title: userForm.id ? "User updated" : "User created",
        description: "Authentication data has been saved.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to save user.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await UserService.deleteUser(userId);
      await loadWorkspace();
      await refreshSession();
      if (userForm.id === userId) {
        setUserForm(createEmptyUserForm());
      }
      toast({
        title: "User deleted",
        description: "The user has been removed.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete user.",
        variant: "destructive",
      });
    }
  };

  const handleSaveApplication = async () => {
    if (!isAdmin) {
      return;
    }

    try {
      if (applicationForm.id) {
        await AppService.updateApplication(applicationForm.id, applicationForm);
      } else {
        await AppService.createApplication(applicationForm);
      }
      await loadWorkspace();
      setApplicationForm(createEmptyApplicationForm());
      toast({
        title: applicationForm.id ? "Application updated" : "Application created",
        description: "Workspace navigation has been updated.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to save application.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    try {
      await AppService.deleteApplication(applicationId);
      await loadWorkspace();
      if (selectedAppId === applicationId) {
        setSelectedAppId("");
      }
      toast({
        title: "Application deleted",
        description: "The application has been removed from the SaaS workspace.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete application.",
        variant: "destructive",
      });
    }
  };

  const handleSaveEnvironment = async () => {
    if (!selectedApplication || !isAdmin) {
      return;
    }

    try {
      if (environmentForm.id) {
        const currentEnvironment = selectedApplication.environments.find(
          (environment) => environment.id === environmentForm.id,
        );
        await AppService.updateEnvironment(selectedApplication.id, environmentForm.id, {
          name: environmentForm.name,
          kind: environmentForm.kind,
          description: environmentForm.description,
          kafkaConfig: currentEnvironment?.kafkaConfig,
          jmsConfig: currentEnvironment?.jmsConfig,
          producers: currentEnvironment?.producers,
        });
      } else {
        await AppService.createEnvironment(selectedApplication.id, environmentForm);
      }
      await loadWorkspace();
      setEnvironmentForm(createEmptyEnvironmentForm());
      toast({
        title: environmentForm.id ? "Environment updated" : "Environment created",
        description: "Top-level environment selection is available immediately.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to save environment.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEnvironment = async (environmentId: string) => {
    if (!selectedApplication) {
      return;
    }

    try {
      await AppService.deleteEnvironment(selectedApplication.id, environmentId);
      await loadWorkspace();
      if (selectedEnvironmentId === environmentId) {
        setSelectedEnvironmentId("");
      }
      toast({
        title: "Environment deleted",
        description: "The environment and its producer definitions have been removed.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete environment.",
        variant: "destructive",
      });
    }
  };

  const renderConfigEditor = (
    title: string,
    description: string,
    config: KafkaConfig | ReturnType<typeof createDefaultJmsConfig>,
    onChange: (field: string, value: string | number | boolean) => void,
    isKafka: boolean,
  ) => (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {Object.entries(config).map(([field, value]) => {
          if (typeof value === "boolean") {
            return (
              <div key={field} className="space-y-2">
                <Label>{field}</Label>
                <Select
                  value={value ? "true" : "false"}
                  onValueChange={(nextValue) => onChange(field, nextValue === "true")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          }

          if (field === "extraProperties") {
            return (
              <div key={field} className="space-y-2 md:col-span-2">
                <Label>{field}</Label>
                <Textarea
                  value={String(value)}
                  onChange={(event) => onChange(field, event.target.value)}
                  rows={4}
                />
              </div>
            );
          }

          const inputType =
            typeof value === "number"
              ? "number"
              : field.toLowerCase().includes("password")
                ? "password"
                : "text";

          return (
            <div key={field} className="space-y-2">
              <Label>{field}</Label>
              <Input
                type={inputType}
                value={String(value)}
                onChange={(event) =>
                  onChange(
                    field,
                    typeof value === "number"
                      ? Number(event.target.value || 0)
                      : event.target.value,
                  )
                }
                placeholder={isKafka ? "Kafka value" : "JMS value"}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading MessageQueue Tester...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.18),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,1)_0%,_rgba(8,15,28,1)_100%)] px-6 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Badge className="border-white/10 bg-white/10 text-white">SaaS Workspace</Badge>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white">
                MessageQueue Tester
              </h1>
              <p className="max-w-2xl text-base text-slate-300">
                One workspace for application environments, Kafka and JMS producer profiles,
                and message testing without the old hardcoded product flow.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-white/10 bg-white/[0.04]">
                <CardContent className="pt-6 text-sm text-slate-200">
                  <Shield className="mb-3 h-5 w-5 text-sky-300" />
                  Basic authentication for all users.
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/[0.04]">
                <CardContent className="pt-6 text-sm text-slate-200">
                  <Layers3 className="mb-3 h-5 w-5 text-amber-300" />
                  Application and environment selection pinned at the top.
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/[0.04]">
                <CardContent className="pt-6 text-sm text-slate-200">
                  <Play className="mb-3 h-5 w-5 text-emerald-300" />
                  Producer defaults, payloads, headers, and proto schemas in one place.
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="border-white/10 bg-slate-950/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Sign in</CardTitle>
              <CardDescription>
                The first bootstrapped admin account can be changed after login.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((previous) => ({
                      ...previous,
                      email: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((previous) => ({
                      ...previous,
                      password: event.target.value,
                    }))
                  }
                />
              </div>
              <Button onClick={handleLogin} disabled={isLoggingIn} className="w-full">
                {isLoggingIn ? "Signing in..." : "Sign in"}
              </Button>
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                Default admin credentials: {DEFAULT_ADMIN_CREDENTIALS.email} /{" "}
                {DEFAULT_ADMIN_CREDENTIALS.password}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.10),_transparent_30%),linear-gradient(180deg,_rgba(7,12,21,1)_0%,_rgba(9,16,30,1)_100%)] text-foreground">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">MessageQueue Tester</h1>
                <p className="text-sm text-slate-400">
                  Multi-tenant Kafka and JMS producer testing workspace
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={selectedAppId} onValueChange={setSelectedAppId}>
                <SelectTrigger className="min-w-[220px] border-white/10 bg-white/[0.04]">
                  <SelectValue placeholder="Select application" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((application) => (
                    <SelectItem key={application.id} value={application.id}>
                      {application.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedEnvironmentId} onValueChange={setSelectedEnvironmentId}>
                <SelectTrigger className="min-w-[220px] border-white/10 bg-white/[0.04]">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedApplication?.environments || []).map((environment) => (
                    <SelectItem key={environment.id} value={environment.id}>
                      {environment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2">
              <div>
                <div className="text-sm font-medium text-white">{currentUser.name}</div>
                <div className="text-xs text-slate-400">{currentUser.email}</div>
              </div>
              <Badge className={cn("border", roleBadgeClassName(currentUser.role))}>
                {currentUser.role}
              </Badge>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {workspaceLoading ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading workspace data...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-white">
                    {selectedApplication?.name || "No application selected"}
                  </h2>
                  {selectedEnvironment && selectedEnvironmentMeta && (
                    <Badge className={cn("border", selectedEnvironmentMeta.badgeClassName)}>
                      {selectedEnvironment.name} · {selectedEnvironmentMeta.label}
                    </Badge>
                  )}
                </div>
                <p className="max-w-3xl text-sm text-slate-400">
                  {selectedApplication?.description ||
                    "Create an application and add at least one environment to start testing."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 px-4 py-2">
                  {selectedApplication?.environments.length || 0} environments
                </div>
                <div className="rounded-2xl border border-white/10 px-4 py-2">
                  {selectedEnvironment?.producers.length || 0} producers
                </div>
                <div className="rounded-2xl border border-white/10 px-4 py-2">
                  {logs.length} recent log entries
                </div>
              </div>
            </div>

            {isProductionEnvironment && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                Production environment selected. Message sends use live connection details for
                this application environment.
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 bg-white/[0.04]">
                <TabsTrigger value="workspace" className="gap-2">
                  <Play className="h-4 w-4" />
                  Workspace
                </TabsTrigger>
                <TabsTrigger value="configs" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Configs
                </TabsTrigger>
                <TabsTrigger value="admin" className="gap-2" disabled={!isAdmin}>
                  <UserCog className="h-4 w-4" />
                  Admin
                </TabsTrigger>
              </TabsList>

              <TabsContent value="workspace" className="space-y-6">
                {!selectedEnvironment ? (
                  <Card className="border-dashed border-white/15 bg-white/[0.03]">
                    <CardContent className="py-16 text-center text-sm text-slate-400">
                      Select an application and environment to open the test workspace.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <Card className="border-white/10 bg-white/[0.03]">
                      <CardHeader>
                        <CardTitle>Producer library</CardTitle>
                        <CardDescription>
                          Select a Kafka or JMS producer profile for this environment.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[620px] pr-3">
                          <div className="space-y-3">
                            {selectedEnvironment.producers.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                                No producer profiles exist for this environment.
                              </div>
                            ) : (
                              selectedEnvironment.producers.map((producer) => (
                                <button
                                  key={producer.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedProducerId(producer.id);
                                    setSendForm(createSendForm(producer));
                                  }}
                                  className={cn(
                                    "w-full rounded-2xl border p-4 text-left transition",
                                    selectedProducerId === producer.id
                                      ? "border-cyan-400/40 bg-cyan-400/10"
                                      : "border-white/10 bg-black/10 hover:border-white/20",
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="font-medium text-white">{producer.name}</div>
                                    <Badge
                                      variant="outline"
                                      className="border-white/10 bg-white/5 text-slate-200"
                                    >
                                      {producer.transport}
                                    </Badge>
                                  </div>
                                  <div className="mt-2 text-xs text-slate-400">
                                    {producer.destination}
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Badge className="border-white/10 bg-white/5 text-slate-200">
                                      {producer.messageFormat}
                                    </Badge>
                                    <Badge
                                      className={cn(
                                        "border",
                                        producer.status === "active"
                                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                                          : "border-white/10 bg-white/5 text-slate-300",
                                      )}
                                    >
                                      {producer.status}
                                    </Badge>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                      <Card className="border-white/10 bg-white/[0.03]">
                        <CardHeader>
                          <CardTitle>
                            {selectedProducer
                              ? `Send with ${selectedProducer.name}`
                              : "Select a producer"}
                          </CardTitle>
                          <CardDescription>
                            Producer defaults are preloaded. Edit payload, headers, and key
                            before sending.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {!selectedProducer ? (
                            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                              Pick a producer from the left column.
                            </div>
                          ) : (
                            <>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>Destination</Label>
                                  <Input
                                    value={sendForm.destination}
                                    onChange={(event) =>
                                      setSendForm((previous) => ({
                                        ...previous,
                                        destination: event.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                {selectedProducer.transport === "kafka" && (
                                  <div className="space-y-2">
                                    <Label>Message key</Label>
                                    <Input
                                      value={sendForm.key}
                                      onChange={(event) =>
                                        setSendForm((previous) => ({
                                          ...previous,
                                          key: event.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                )}
                              </div>

                              {selectedProducer.transport === "kafka" && (
                                <div className="space-y-2">
                                  <Label>Headers JSON</Label>
                                  <Textarea
                                    rows={3}
                                    value={sendForm.headers}
                                    onChange={(event) =>
                                      setSendForm((previous) => ({
                                        ...previous,
                                        headers: event.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              )}

                              {sendForm.messageFormat === "protobuf" && (
                                <>
                                  <div className="space-y-2">
                                    <Label>Message type</Label>
                                    <Input
                                      value={sendForm.messageType}
                                      onChange={(event) =>
                                        setSendForm((previous) => ({
                                          ...previous,
                                          messageType: event.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Proto schema</Label>
                                    <Textarea
                                      rows={10}
                                      className="font-mono text-xs"
                                      value={sendForm.protoSchema}
                                      onChange={(event) =>
                                        setSendForm((previous) => ({
                                          ...previous,
                                          protoSchema: event.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                </>
                              )}

                              <div className="space-y-2">
                                <Label>Payload</Label>
                                <Textarea
                                  rows={12}
                                  className="font-mono text-xs"
                                  value={sendForm.payload}
                                  onChange={(event) =>
                                    setSendForm((previous) => ({
                                      ...previous,
                                      payload: event.target.value,
                                    }))
                                  }
                                />
                              </div>

                              {validationStatus !== "idle" && (
                                <div
                                  className={cn(
                                    "rounded-2xl border p-3 text-sm",
                                    validationStatus === "success"
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                                      : "border-rose-500/30 bg-rose-500/10 text-rose-100",
                                  )}
                                >
                                  {validationMessage}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-3">
                                <Button variant="outline" onClick={handleValidatePayload}>
                                  Validate payload
                                </Button>
                                <Button onClick={handleSendMessage} disabled={isSending}>
                                  <Send className="mr-2 h-4 w-4" />
                                  {isSending ? "Sending..." : "Send message"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() =>
                                    setSendForm((previous) => ({
                                      ...previous,
                                      ...getProducerDefaults(selectedProducer),
                                    }))
                                  }
                                >
                                  Reset to producer defaults
                                </Button>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      <div className="grid gap-6 lg:grid-cols-2">
                        <Card className="border-white/10 bg-white/[0.03]">
                          <CardHeader>
                            <CardTitle>Current session results</CardTitle>
                            <CardDescription>
                              Immediate send results for this browser session.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[320px] pr-3">
                              <div className="space-y-3">
                                {runResults.length === 0 ? (
                                  <div className="text-sm text-slate-400">
                                    No send attempts yet.
                                  </div>
                                ) : (
                                  runResults.map((result) => (
                                    <div
                                      key={result.id}
                                      className="rounded-2xl border border-white/10 p-4"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="font-medium text-white">
                                          {result.producerName}
                                        </div>
                                        <Badge
                                          className={cn(
                                            "border",
                                            result.status === "success"
                                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                                              : "border-rose-500/30 bg-rose-500/10 text-rose-100",
                                          )}
                                        >
                                          {result.status}
                                        </Badge>
                                      </div>
                                      <div className="mt-2 text-xs text-slate-400">
                                        {new Date(result.createdAt).toLocaleString()} ·{" "}
                                        {result.environmentName} · {result.transport}
                                      </div>
                                      <div className="mt-3 text-sm text-slate-200">
                                        {result.message}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-white/[0.03]">
                          <CardHeader>
                            <CardTitle>Recent audit log</CardTitle>
                            <CardDescription>
                              Persisted message history for the current application.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[320px] pr-3">
                              <div className="space-y-3">
                                {logs.length === 0 ? (
                                  <div className="text-sm text-slate-400">
                                    No logs have been written yet.
                                  </div>
                                ) : (
                                  logs.map((log) => (
                                    <div key={log.id} className="rounded-2xl border border-white/10 p-4">
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="font-medium text-white">
                                          {log.producerName}
                                        </div>
                                        <Badge
                                          className={cn(
                                            "border",
                                            log.status === "success"
                                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                                              : "border-rose-500/30 bg-rose-500/10 text-rose-100",
                                          )}
                                        >
                                          {log.status}
                                        </Badge>
                                      </div>
                                      <div className="mt-2 text-xs text-slate-400">
                                        {new Date(log.timestamp).toLocaleString()} · {log.userName}
                                      </div>
                                      <div className="mt-3 text-sm text-slate-200">{log.result}</div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="configs" className="space-y-6">
                {!selectedEnvironment ? (
                  <Card className="border-dashed border-white/15 bg-white/[0.03]">
                    <CardContent className="py-16 text-center text-sm text-slate-400">
                      Select an environment to manage connection settings and producer profiles.
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                      {isAdmin
                        ? "You are editing the shared environment config used by all users."
                        : "You are editing a local testing override. Admin-managed environment config remains unchanged."}
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                      {renderConfigEditor(
                        "Kafka connection",
                        "These settings are used for Kafka producer tests.",
                        isAdmin ? sharedKafkaDraft : localKafkaDraft,
                        (field, value) =>
                          isAdmin
                            ? setSharedKafkaDraft((previous) => ({ ...previous, [field]: value }))
                            : setLocalKafkaDraft((previous) => ({ ...previous, [field]: value })),
                        true,
                      )}

                      {renderConfigEditor(
                        "JMS connection",
                        "These settings are used for IBM MQ / JMS producer tests.",
                        isAdmin ? sharedJmsDraft : localJmsDraft,
                        (field, value) =>
                          isAdmin
                            ? setSharedJmsDraft((previous) => ({ ...previous, [field]: value }))
                            : setLocalJmsDraft((previous) => ({ ...previous, [field]: value })),
                        false,
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {isAdmin ? (
                        <Button onClick={handleSaveSharedConfig} disabled={isSavingSharedConfig}>
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingSharedConfig ? "Saving..." : "Save shared environment config"}
                        </Button>
                      ) : (
                        <>
                          <Button onClick={handleSaveLocalOverride} disabled={isSavingLocalConfig}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSavingLocalConfig ? "Saving..." : "Save local override"}
                          </Button>
                          <Button variant="outline" onClick={handleClearLocalOverride}>
                            Reset local override
                          </Button>
                        </>
                      )}
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                      <Card className="border-white/10 bg-white/[0.03]">
                        <CardHeader>
                          <CardTitle>Producer profiles</CardTitle>
                          <CardDescription>
                            Kafka and JMS producers are defined per application environment.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[520px] pr-3">
                            <div className="space-y-3">
                              {selectedEnvironment.producers.map((producer) => (
                                <div key={producer.id} className="rounded-2xl border border-white/10 p-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <div className="font-medium text-white">{producer.name}</div>
                                      <div className="text-xs text-slate-400">
                                        {producer.transport} · {producer.destination}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className="border-white/10 bg-white/5 text-slate-200">
                                        {producer.messageFormat}
                                      </Badge>
                                      {isAdmin && (
                                        <>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setProducerForm({ ...producer })}
                                          >
                                            Edit
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={async () => {
                                              await AppService.deleteProducer(
                                                selectedApplication!.id,
                                                selectedEnvironment.id,
                                                producer.id,
                                              );
                                              await loadWorkspace();
                                              if (selectedProducerId === producer.id) {
                                                setSelectedProducerId("");
                                              }
                                              if (producerForm.id === producer.id) {
                                                resetProducerForm();
                                              }
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {producer.description && (
                                    <div className="mt-3 text-sm text-slate-300">
                                      {producer.description}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {selectedEnvironment.producers.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                                  No producers have been configured yet.
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>

                      <Card className="border-white/10 bg-white/[0.03]">
                        <CardHeader>
                          <CardTitle>Producer editor</CardTitle>
                          <CardDescription>
                            {isAdmin
                              ? "Create or update the producer profile used in the test workspace."
                              : "Only admins can change producer definitions."}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Name</Label>
                              <Input
                                value={producerForm.name}
                                onChange={(event) =>
                                  setProducerForm((previous) => ({
                                    ...previous,
                                    name: event.target.value,
                                  }))
                                }
                                disabled={!isAdmin}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Destination</Label>
                              <Input
                                value={producerForm.destination}
                                onChange={(event) =>
                                  setProducerForm((previous) => ({
                                    ...previous,
                                    destination: event.target.value,
                                  }))
                                }
                                disabled={!isAdmin}
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label>Transport</Label>
                              <Select
                                value={producerForm.transport}
                                onValueChange={(value: "kafka" | "jms") =>
                                  setProducerForm((previous) => ({
                                    ...previous,
                                    transport: value,
                                  }))
                                }
                                disabled={!isAdmin}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="kafka">kafka</SelectItem>
                                  <SelectItem value="jms">jms</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Message format</Label>
                              <Select
                                value={producerForm.messageFormat}
                                onValueChange={(value: MessageFormat) =>
                                  setProducerForm((previous) => ({
                                    ...previous,
                                    messageFormat: value,
                                  }))
                                }
                                disabled={!isAdmin}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="json">json</SelectItem>
                                  <SelectItem value="protobuf">protobuf</SelectItem>
                                  <SelectItem value="string">string</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Status</Label>
                              <Select
                                value={producerForm.status}
                                onValueChange={(value: "active" | "inactive") =>
                                  setProducerForm((previous) => ({
                                    ...previous,
                                    status: value,
                                  }))
                                }
                                disabled={!isAdmin}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">active</SelectItem>
                                  <SelectItem value="inactive">inactive</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              rows={3}
                              value={producerForm.description}
                              onChange={(event) =>
                                setProducerForm((previous) => ({
                                  ...previous,
                                  description: event.target.value,
                                }))
                              }
                              disabled={!isAdmin}
                            />
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Default key</Label>
                              <Input
                                value={producerForm.defaultKey}
                                onChange={(event) =>
                                  setProducerForm((previous) => ({
                                    ...previous,
                                    defaultKey: event.target.value,
                                  }))
                                }
                                disabled={!isAdmin}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Message type</Label>
                              <Input
                                value={producerForm.messageType}
                                onChange={(event) =>
                                  setProducerForm((previous) => ({
                                    ...previous,
                                    messageType: event.target.value,
                                  }))
                                }
                                disabled={!isAdmin}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Default headers JSON</Label>
                            <Textarea
                              rows={4}
                              className="font-mono text-xs"
                              value={producerForm.defaultHeaders}
                              onChange={(event) =>
                                setProducerForm((previous) => ({
                                  ...previous,
                                  defaultHeaders: event.target.value,
                                }))
                              }
                              disabled={!isAdmin}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Default payload</Label>
                            <Textarea
                              rows={8}
                              className="font-mono text-xs"
                              value={producerForm.defaultPayload}
                              onChange={(event) =>
                                setProducerForm((previous) => ({
                                  ...previous,
                                  defaultPayload: event.target.value,
                                }))
                              }
                              disabled={!isAdmin}
                            />
                          </div>

                          {producerForm.messageFormat === "protobuf" && (
                            <div className="space-y-2">
                              <Label>Proto schema</Label>
                              <Textarea
                                rows={10}
                                className="font-mono text-xs"
                                value={producerForm.protoSchema}
                                onChange={(event) =>
                                  setProducerForm((previous) => ({
                                    ...previous,
                                    protoSchema: event.target.value,
                                  }))
                                }
                                disabled={!isAdmin}
                              />
                            </div>
                          )}

                          <div className="flex flex-wrap gap-3">
                            <Button onClick={handleSaveProducer} disabled={!isAdmin || isSavingProducer}>
                              {isSavingProducer ? "Saving..." : producerForm.id ? "Update producer" : "Create producer"}
                            </Button>
                            <Button variant="outline" onClick={resetProducerForm} disabled={!isAdmin}>
                              New producer
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="admin" className="space-y-6">
                {isAdmin && (
                  <Tabs defaultValue="users" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 bg-white/[0.04]">
                      <TabsTrigger value="users">Users</TabsTrigger>
                      <TabsTrigger value="applications">Applications</TabsTrigger>
                      <TabsTrigger value="environments">Environments</TabsTrigger>
                    </TabsList>

                    <TabsContent value="users" className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                      <Card className="border-white/10 bg-white/[0.03]">
                        <CardHeader>
                          <CardTitle>User editor</CardTitle>
                          <CardDescription>
                            Admins create users, change roles, disable accounts, and reset passwords.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                              value={userForm.name}
                              onChange={(event) =>
                                setUserForm((previous) => ({
                                  ...previous,
                                  name: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              value={userForm.email}
                              onChange={(event) =>
                                setUserForm((previous) => ({
                                  ...previous,
                                  email: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Role</Label>
                              <Select
                                value={userForm.role}
                                onValueChange={(value: UserRole) =>
                                  setUserForm((previous) => ({
                                    ...previous,
                                    role: value,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">admin</SelectItem>
                                  <SelectItem value="qa">qa</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Account status</Label>
                              <Select
                                value={userForm.active ? "active" : "disabled"}
                                onValueChange={(value) =>
                                  setUserForm((previous) => ({
                                    ...previous,
                                    active: value === "active",
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">active</SelectItem>
                                  <SelectItem value="disabled">disabled</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>{userForm.id ? "Reset password" : "Initial password"}</Label>
                            <Input
                              type="password"
                              value={userForm.password}
                              onChange={(event) =>
                                setUserForm((previous) => ({
                                  ...previous,
                                  password: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Button onClick={handleSaveUser}>
                              <KeyRound className="mr-2 h-4 w-4" />
                              {userForm.id ? "Update user" : "Create user"}
                            </Button>
                            <Button variant="outline" onClick={() => setUserForm(createEmptyUserForm())}>
                              New user
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-white/10 bg-white/[0.03]">
                        <CardHeader>
                          <CardTitle>Users</CardTitle>
                          <CardDescription>
                            Every user now authenticates with email and password.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[560px] pr-3">
                            <div className="space-y-3">
                              {users.map((user) => (
                                <div key={user.id} className="rounded-2xl border border-white/10 p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <div className="font-medium text-white">{user.name}</div>
                                      <div className="text-xs text-slate-400">{user.email}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={cn("border", roleBadgeClassName(user.role))}>
                                        {user.role}
                                      </Badge>
                                      <Badge
                                        className={cn(
                                          "border",
                                          user.active
                                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                                            : "border-white/10 bg-white/5 text-slate-300",
                                        )}
                                      >
                                        {user.active ? "active" : "disabled"}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="mt-4 flex flex-wrap gap-3">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        setUserForm({
                                          id: user.id,
                                          name: user.name,
                                          email: user.email,
                                          role: user.role,
                                          password: "",
                                          active: user.active,
                                        })
                                      }
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteUser(user.id)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="applications" className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                      <Card className="border-white/10 bg-white/[0.03]">
                        <CardHeader>
                          <CardTitle>Application editor</CardTitle>
                          <CardDescription>
                            Admins own the SaaS application catalog.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                              value={applicationForm.name}
                              onChange={(event) =>
                                setApplicationForm((previous) => ({
                                  ...previous,
                                  name: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              rows={5}
                              value={applicationForm.description}
                              onChange={(event) =>
                                setApplicationForm((previous) => ({
                                  ...previous,
                                  description: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Button onClick={handleSaveApplication}>
                              <Plus className="mr-2 h-4 w-4" />
                              {applicationForm.id ? "Update application" : "Create application"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setApplicationForm(createEmptyApplicationForm())}
                            >
                              New application
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-white/10 bg-white/[0.03]">
                        <CardHeader>
                          <CardTitle>Applications</CardTitle>
                          <CardDescription>
                            Each application contains its own environments and producers.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {applications.map((application) => (
                              <div key={application.id} className="rounded-2xl border border-white/10 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="font-medium text-white">{application.name}</div>
                                    <div className="mt-1 text-sm text-slate-400">
                                      {application.description}
                                    </div>
                                  </div>
                                  <Badge className="border-white/10 bg-white/5 text-slate-200">
                                    {application.environments.length} envs
                                  </Badge>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setApplicationForm({
                                        id: application.id,
                                        name: application.name,
                                        description: application.description,
                                      })
                                    }
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteApplication(application.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="environments" className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                      <Card className="border-white/10 bg-white/[0.03]">
                        <CardHeader>
                          <CardTitle>Environment editor</CardTitle>
                          <CardDescription>
                            Environments belong to the currently selected application.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {!selectedApplication ? (
                            <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                              Select an application at the top first.
                            </div>
                          ) : (
                            <>
                              <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                  value={environmentForm.name}
                                  onChange={(event) =>
                                    setEnvironmentForm((previous) => ({
                                      ...previous,
                                      name: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                  value={environmentForm.kind}
                                  onValueChange={(value: EnvironmentKind) =>
                                    setEnvironmentForm((previous) => ({
                                      ...previous,
                                      kind: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="staging">staging</SelectItem>
                                    <SelectItem value="production">production</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                  rows={5}
                                  value={environmentForm.description}
                                  onChange={(event) =>
                                    setEnvironmentForm((previous) => ({
                                      ...previous,
                                      description: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="flex flex-wrap gap-3">
                                <Button onClick={handleSaveEnvironment}>
                                  {environmentForm.id ? "Update environment" : "Create environment"}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setEnvironmentForm(createEmptyEnvironmentForm())}
                                >
                                  New environment
                                </Button>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-white/10 bg-white/[0.03]">
                        <CardHeader>
                          <CardTitle>Application environments</CardTitle>
                          <CardDescription>
                            Only admins can add or remove staging and production environments.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {!selectedApplication ? (
                            <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                              No application selected.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {selectedApplication.environments.map((environment) => (
                                <div key={environment.id} className="rounded-2xl border border-white/10 p-4">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <div className="font-medium text-white">{environment.name}</div>
                                      <div className="mt-1 text-sm text-slate-400">
                                        {environment.description || "No description"}
                                      </div>
                                    </div>
                                    <Badge
                                      className={cn(
                                        "border",
                                        ENVIRONMENT_KIND_META[environment.kind].badgeClassName,
                                      )}
                                    >
                                      {environment.kind}
                                    </Badge>
                                  </div>
                                  <div className="mt-4 flex flex-wrap gap-3">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        setEnvironmentForm({
                                          id: environment.id,
                                          name: environment.name,
                                          kind: environment.kind,
                                          description: environment.description,
                                        })
                                      }
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteEnvironment(environment.id)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              {selectedApplication.environments.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                                  No environments defined for this application.
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
