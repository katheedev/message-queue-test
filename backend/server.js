const express = require('express');
const { Kafka } = require('kafkajs');
const cors = require('cors');
const protobuf = require('protobufjs');
const app = express();

app.use(cors());
app.use(express.json());

// Test Kafka connection
app.post('/api/kafka/test-connection', async (req, res) => {
  const config = req.body;
  try {
    const kafka = new Kafka({
      brokers: config.bootstrapServers.split(',').map(s => s.trim()),
      ...(config.securityProtocol !== 'PLAINTEXT' && {
        ssl: config.securityProtocol === 'SSL' ? true : undefined,
        sasl: config.saslMechanism && config.saslUsername && config.saslPassword ? {
          mechanism: config.saslMechanism,
          username: config.saslUsername,
          password: config.saslPassword
        } : undefined
      })
    });
    const admin = kafka.admin();
    await admin.connect();
    await admin.describeCluster();
    await admin.disconnect();
    res.json({ status: 'connected', message: 'Successfully connected to Kafka cluster' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to connect' });
  }
});

// Fetch all topics
app.post('/api/kafka/topics', async (req, res) => {
  const config = req.body;
  if (!config || !config.bootstrapServers) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid configuration: bootstrapServers is required'
    });
  }
  debugger

  try {
    const kafka = new Kafka({
      brokers: config.bootstrapServers.split(',').map(s => s.trim()),
      ...(config.securityProtocol !== 'PLAINTEXT' && {
        ssl: config.securityProtocol === 'SSL' ? true : undefined,
        sasl: config.saslMechanism && config.saslUsername && config.saslPassword ? {
          mechanism: config.saslMechanism,
          username: config.saslUsername,
          password: config.saslPassword
        } : undefined
      })
    });

    const admin = kafka.admin();
    await admin.connect();
    const topicMetadata = await admin.listTopics();
    const topics = [];

    if (topicMetadata.length > 0) {
      const metadata = await admin.fetchTopicMetadata({ topics: topicMetadata });
      for (const topic of metadata.topics) {
        const topicDetails = {
          name: topic.name,
          partitions: topic.partitions.map(p => ({
            partitionId: p.partitionId,
            leader: p.leader,
            replicas: p.replicas,
            isr: p.isr
          })),
          configEntries: []
        };

        // Fetch topic configurations
        const configs = await admin.describeConfigs({
          resources: [{ type: 2, name: topic.name }]
        });
        topicDetails.configEntries = configs.resources[0].configEntries.map(entry => ({
          name: entry.configName,
          value: entry.configValue,
          isDefault: entry.isDefault
        }));

        topics.push(topicDetails);
      }
    }

    await admin.disconnect();
    res.json({ status: 'success', topics });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch topics'
    });
  }
});

// Fetch all consume] Flightkeys - Send the average PAX weight to flightkeys. r groups
app.post('/api/kafka/consumer-groups', async (req, res) => {
  const config = req.body;
  if (!config || !config.bootstrapServers) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid configuration: bootstrapServers is required'
    });
  }

  try {
    const kafka = new Kafka({
      brokers: config.bootstrapServers.split(',').map(s => s.trim()),
      ...(config.securityProtocol !== 'PLAINTEXT' && {
        ssl: config.securityProtocol === 'SSL' ? true : undefined,
        sasl: config.saslMechanism && config.saslUsername && config.saslPassword ? {
          mechanism: config.saslMechanism,
          username: config.saslUsername,
          password: config.saslPassword
        } : undefined
      })
    });

    const admin = kafka.admin();
    await admin.connect();
    const groupDescriptions = await admin.describeGroups(await admin.listGroups().then(res => res.groups.map(g => g.groupId)));

    const consumerGroups = groupDescriptions.groups.map(group => ({
      groupId: group.groupId,
      state: group.state,
      protocolType: group.protocolType,
      protocol: group.protocol,
      members: group.members.map(member => ({
        memberId: member.memberId,
        clientId: member.clientId,
        clientHost: member.clientHost,
        memberAssignment: member.memberAssignment
          ? Array.from(member.memberAssignment).map(b => b.toString('hex')).join('')
          : '',
        memberMetadata: member.memberMetadata
          ? Array.from(member.memberMetadata).map(b => b.toString('hex')).join('')
          : ''
      }))
    }));

    await admin.disconnect();
    res.json({ status: 'success', consumerGroups });
  } catch (error) {
    console.error('Error fetching consumer groups:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch consumer groups'
    });
  }
});

// Send Kafka message
app.post('/api/kafka/send-message', async (req, res) => {
  const { config, topic, messagePayload, protoSchema, messageType, key, messageFormat } = req.body;

  try {
        const kafka = new Kafka({
      brokers: config.bootstrapServers.split(',').map(s => s.trim()),
      ...(config.securityProtocol !== 'PLAINTEXT' && {
        ssl: config.securityProtocol === 'SSL' ? true : undefined,
        sasl: config.saslMechanism && config.saslUsername && config.saslPassword ? {
          mechanism: config.saslMechanism,
          username: config.saslUsername,
          password: config.saslPassword
        } : undefined
      })
    });
    const producer = kafka.producer();

    await producer.connect();

    let value;
    let serializedBuffer;

    if (messageFormat === 'protobuf') {
      if (!protoSchema || !messageType) {
        throw new Error('Missing protoSchema or messageType for Protobuf message');
      }

      const root = await protobuf.parse(protoSchema, { keepCase: true }).root;
      const MessageType = root.lookupType(messageType);

      if (!MessageType) {
        throw new Error(`Message type "${messageType}" not found in schema`);
      }

      let payload;
      try {
        payload = JSON.parse(messagePayload);
      } catch (error) {
        throw new Error('Invalid JSON payload');
      }

      const validationError = MessageType.verify(payload);
      if (validationError) {
        throw new Error(`Validation failed: ${validationError}`);
      }

      const message = MessageType.create(payload);
      value = MessageType.encode(message).finish();
      serializedBuffer = value.toString('hex');
    } else if (messageFormat === 'json') {
      try {
        value = Buffer.from(JSON.stringify(JSON.parse(messagePayload)));
      } catch (error) {
        throw new Error('Invalid JSON payload');
      }
    } else if (messageFormat === 'string') {
      value = Buffer.from(messagePayload);
    } else {
      throw new Error('Invalid messageFormat. Must be "protobuf", "json", or "string"');
    }

    await producer.send({
      topic,
      messages: [{ key: key || null, value }]
    });

    await producer.disconnect();

    res.json({
      status: 'success',
      message: 'Message sent successfully',
      serializedBuffer
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to send message'
    });
  }
});


const mq = require('ibmmq');
const MQC = mq.MQC; // MQ Constants

// Send IBM MQ message
app.post('/api/ibmmq/send-message', async (req, res) => {
  const { config, queue, messagePayload, messageFormat } = req.body;

  if (!config || !config.qmgr || !config.queue || !queue) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid configuration: qmgr, queue, and queue name are required'
    });
  }

  try {
    const connDetails = {
      qMgr: config.qmgr,
      host: config.host || 'localhost',
      port: config.port || 1414,
      channel: config.channel || 'DEV.APP.SVRCONN',
      user: config.user || '',
      password: config.password || ''
    };

    const cno = new mq.MQCNO();
    cno.Options = MQC.MQCNO_NONE;

    if (connDetails.user && connDetails.password) {
      const csp = new mq.MQCSP();
      csp.UserId = connDetails.user;
      csp.Password = connDetails.password;
      cno.SecurityParms = csp;
    }

    const cd = new mq.MQCD();
    cd.ConnectionName = `${connDetails.host}(${connDetails.port})`;
    cd.ChannelName = connDetails.channel;

    cno.ClientConn = cd;

    const hConn = await mq.ConnxPromise(connDetails.qMgr, cno);
    const od = new mq.MQOD();
    od.ObjectName = queue;
    od.ObjectType = MQC.MQOT_Q;

    const openOptions = MQC.MQOO_OUTPUT;
    const hObj = await mq.OpenPromise(hConn, od, openOptions);

    let value;
    if (messageFormat === 'json') {
      try {
        value = JSON.stringify(JSON.parse(messagePayload));
      } catch (error) {
        throw new Error('Invalid JSON payload');
      }
    } else if (messageFormat === 'string') {
      value = messagePayload;
    } else {
      throw new Error('Invalid messageFormat. Must be "json" or "string"');
    }

    const mqmd = new mq.MQMD();
    const pmo = new mq.MQPMO();
    pmo.Options = MQC.MQPMO_NO_SYNCPOINT;

    await mq.PutPromise(hObj, mqmd, pmo, value);

    await mq.ClosePromise(hObj, 0);
    await mq.DiscPromise(hConn);

    res.json({
      status: 'success',
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error sending IBM MQ message:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to send message'
    });
  }
});

// Receive IBM MQ message
app.post('/api/ibmmq/receive-message', async (req, res) => {
  const { config, queue } = req.body;

  if (!config || !config.qmgr || !queue) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid configuration: qmgr and queue are required'
    });
  }

  try {
    const connDetails = {
      qMgr: config.qmgr,
      host: config.host || 'localhost',
      port: config.port || 1414,
      channel: config.channel || 'DEV.APP.SVRCONN',
      user: config.user || '',
      password: config.password || ''
    };

    const cno = new mq.MQCNO();
    cno.Options = MQC.MQCNO_NONE;

    if (connDetails.user && connDetails.password) {
      const csp = new mq.MQCSP();
      csp.UserId = connDetails.user;
      csp.Password = connDetails.password;
      cno.SecurityParms = csp;
    }

    const cd = new mq.MQCD();
    cd.ConnectionName = `${connDetails.host}(${connDetails.port})`;
    cd.ChannelName = connDetails.channel;

    cno.ClientConn = cd;

    const hConn = await mq.ConnxPromise(connDetails.qMgr, cno);
    const od = new mq.MQOD();
    od.ObjectName = queue;
    od.ObjectType = MQC.MQOT_Q;

    const openOptions = MQC.MQOO_INPUT_AS_Q_DEF;
    const hObj = await mq.OpenPromise(hConn, od, openOptions);

    const mqmd = new mq.MQMD();
    const gmo = new mq.MQGMO();
    gmo.Options = MQC.MQGMO_NO_WAIT | MQC.MQGMO_CONVERT;

    try {
      const message = await mq.GetPromise(hObj, mqmd, gmo);
      await mq.ClosePromise(hObj, 0);
      await mq.DiscPromise(hConn);

      let messageContent;
      try {
        messageContent = JSON.parse(message.toString());
      } catch (e) {
        messageContent = message.toString();
      }

      res.json({
        status: 'success',
        message: messageContent
      });
    } catch (error) {
      if (error.mqcc === MQC.MQCC_FAILED && error.mqrc === MQC.MQRC_NO_MSG_AVAILABLE) {
        await mq.ClosePromise(hObj, 0);
        await mq.DiscPromise(hConn);
        res.json({
          status: 'success',
          message: 'No messages available in the queue'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error receiving IBM MQ message:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to receive message'
    });
  }
});

// List IBM MQ channels
app.post('/api/ibmmq/channels', async (req, res) => {
  const { config } = req.body;

  if (!config || !config.qmgr) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid configuration: qmgr is required'
    });
  }

  try {
    const connDetails = {
      qMgr: config.qmgr,
      host: config.host || 'localhost',
      port: config.port || 1414,
      channel: config.channel || 'DEV.APP.SVRCONN',
      user: config.user || '',
      password: config.password || ''
    };

    const cno = new mq.MQCNO();
    cno.Options = MQC.MQCNO_NONE;

    if (connDetails.user && connDetails.password) {
      const csp = new mq.MQCSP();
      csp.UserId = connDetails.user;
      csp.Password = connDetails.password;
      cno.SecurityParms = csp;
    }

    const cd = new mq.MQCD();
    cd.ConnectionName = `${connDetails.host}(${connDetails.port})`;
    cd.ChannelName = connDetails.channel;

    cno.ClientConn = cd;

    const hConn = await mq.ConnxPromise(connDetails.qMgr, cno);

    const pc = new mq.MQPCF();
    pc.Type = MQC.MQCMD_INQUIRE_CHANNEL;
    pc.Parameters = [
      MQC.MQCACH_CHANNEL_NAME,
      MQC.MQCACH_CHANNEL_TYPE,
      MQC.MQCACH_CHANNEL_STATUS
    ];
    pc.StrucId = MQC.MQCFST_STRUC_ID;
    pc.Parameter = MQC.MQCA_CHANNEL_NAME;
    pc.Value = '*'; // Wildcard to get all channels

    const channels = [];
    const response = await mq.PCFExecutePromise(hConn, pc);

    response.forEach(resp => {
      const channelInfo = {};
      resp.Parameters.forEach(param => {
        if (param.Parameter === MQC.MQCACH_CHANNEL_NAME) {
          channelInfo.name = param.Value.trim();
        } else if (param.Parameter === MQC.MQCACH_CHANNEL_TYPE) {
          channelInfo.type = param.Value;
        } else if (param.Parameter === MQC.MQCACH_CHANNEL_STATUS) {
          channelInfo.status = param.Value;
        }
      });
      channels.push(channelInfo);
    });

    await mq.DiscPromise(hConn);

    res.json({
      status: 'success',
      channels
    });
  } catch (error) {
    console.error('Error listing IBM MQ channels:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to list channels'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});