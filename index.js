const functions = require('@google-cloud/functions-framework');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const {SessionsClient} = require('@google-cloud/dialogflow-cx');
const projectId = 'cogent-tract-437916-t3';
const locationId = 'us-central1';  // e.g., 'global' or 'us-central1'
const agentId = "6f320476-e99a-4cd7-b772-c9a91d8d5c67";
const environment = 'draft';            // Use 'production' for live environments
const languageCode = 'en';              // Your agent's language code
const axios = require('axios');


functions.http('helloHttp', async (req, res) => {
    const apiKey = 'J8rwG9tf5zVScx3Y3N8WLPzo'; // Replace with your Chatwoot API key
    const headers = {
        'Content-Type': 'application/json',
        'api_access_token': `${apiKey}`,
    };

    //triggered by ticket notif
    if(req.body.subscription && req.body.message){
        var incidents_json = req.body.message.data;
        incidents_json = incidents_json.replace(/=/g, '');
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + incidents_json + ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
        var decoded = jwt.decode(token);
        if(decoded.payload?.mobile){// if contact has mobile number in ticket data
          findContactByPhoneNumber(headers, decoded.payload.mobile)  // Replace with the actual phone number, can be found in bigquery {{RESOLVED}}
          .then(search => {
              if(search.meta.count>0){//contact_exists
              var contactId = 0;
              console.log('Contact found:', search);
              search.payload.forEach(s => {
                  console.log(`Contact id: ${s.id}, name: ${s.name}`);
                  contactId = s.id; //set id to be used in dialogflow and chatwoot api
                  });
              //search for existing open or pending convo, convo exists if sessionId matches, else it just creates a new convo
              listAllConversations(headers)
              .then(conversations => {
                  //check if user responded, if they didn't just do nothing, if they did then generate a response with dialogflow.
                  if(conversations.data.payload.filter(item => item.custom_attributes?.session_id === sessionId && item.conversation.status === "open").length > 0){
                      //get the message data from existing convo 
                      conversations.data.payload.filter(item => item.custom_attributes?.session_id === sessionId).forEach(convo => {
                          if(convo.messages[0].sender.id === contactId){// this means the last message sent in the convo was from the user.
                      dialogflowChat(sessionId, query)
                          .then(dialogflowResponse => {
                          createMessage(headers,dialogflowResponse,convo.messages[0].conversation_id) 
                          .then(conversationResponse => {
                          console.log('Message created successfully:', conversationResponse);
                          res.status(201).send("Dialogflow response sent to Chatwoot customer!");
                          })
                          .catch(err => console.error(err.message));
                          })
                          .catch(err => console.error(err.message));
                          }
                          else{
                            res.status(201).send("Customer has not replied yet.");
                          }
                      })
                  }
                  else{
                  //creating new convo with dialogflow and sending to chatwoot user
                  dialogflowChat(sessionId, query)
                      .then(dialogflowResponse => {
                      createConversation(headers,dialogflowResponse,contactId,sessionId) 
                      .then(conversationResponse => {
                      console.log('Conversation created successfully:', conversationResponse);
                      res.status(201).send("Dialogflow response sent to Chatwoot customer!");
                      })
                      .catch(err => console.error(err.message));
                      })
                      .catch(err => console.error(err.message));
      
                  }
              //   console.log("Conversation List:", conversations);
              })
              .catch(err => console.error(err.message));
              }
              else{
              console.log("Creating new contact");
              //contact doesn't exist 
              //create contact and conversation
              createContact(headers, response.result[0].number, response.result[0].number)  // Replace with the actual phone number {{RESOLVED}}
              .then(contactResponse => {
                  console.log('Contact created successfully:', contactResponse);
                  console.log('Contact ID:', contactResponse.payload.contact.id);
                  var contactId = contactResponse.payload.contact.id;
                  //dialogflow should be here
                  dialogflowChat(sessionId, query)
                  .then(dialogflowResponse => {
                    createConversation(headers,dialogflowResponse,contactId,sessionId) 
                    .then(conversationResponse => {
                    console.log('Conversation created successfully:', conversationResponse);
                    res.status(201).send(conversationResponse);
                    })
                    .catch(err => console.error(err.message));
                  })
                  .catch(err => console.error(err.message));
              })
          .catch(err => console.error(err.message));
      
              }
          })
          .catch(err => console.error(err.message));
        }
        else{
        //Dialogflow starts here (sessionId and query)
        var sessionId = decoded.id;
        var query = decoded.payload.type;  // Assuming user input comes from req.body.query
    // {{{{{{{{{{{{{ADD TICKET RESPONSE AUTOMATION CODE HERE AFTER}}}}}}}}}}}}}
          //Chatwoot create conversation
    //if status of ticket is open in incidents
    //triggered by ticket notif
    //find phone number in bigquery first before this {{IMPORTANT}} {{RESOLVED}}
    var bqphonenum = 'SELECT * FROM `telefonica-dev-155211.tracknme.Device` WHERE car = ' + decoded.payload.vehicleId;
    var bqplate = 'SELECT * FROM `telefonica-dev-155211.tracknme.Vehicle` WHERE vehicle_id = ' + decoded.payload.vehicleId;
    queryBigQuery(bqphonenum)
    .then(response => {
    //check if array is not empty {{RESOLVED}}
    //then use that number in the findContactByPhoneNumber function {{RESOLVED}}
    //findContactByPhoneNumber(headers,response.data)
    if(response.result.length === 1 && response.result[0].number != null){
      //phone number exists in bq {{RESOLVED}}
      findContactByPhoneNumber(headers, response.result[0].number)  // Replace with the actual phone number, can be found in bigquery {{RESOLVED}}
      .then(search => {
          if(search.meta.count>0){//contact_exists
          var contactId = 0;
          console.log('Contact found:', search);
          search.payload.forEach(s => {
              console.log(`Contact id: ${s.id}, name: ${s.name}`);
              contactId = s.id; //set id to be used in dialogflow and chatwoot api
              });
          //search for existing open or pending convo, convo exists if sessionId matches, else it just creates a new convo
          listAllConversations(headers)
          .then(conversations => {
              //check if user responded, if they didn't just do nothing, if they did then generate a response with dialogflow.
              if(conversations.data.payload.filter(item => item.custom_attributes?.session_id === sessionId && item.conversation.status === "open").length > 0){
                  //get the message data from existing convo 
                  conversations.data.payload.filter(item => item.custom_attributes?.session_id === sessionId).forEach(convo => {
                      if(convo.messages[0].sender.id === contactId){// this means the last message sent in the convo was from the user.
                  dialogflowChat(sessionId, query)
                      .then(dialogflowResponse => {
                      createMessage(headers,dialogflowResponse,convo.messages[0].conversation_id) 
                      .then(conversationResponse => {
                      console.log('Message created successfully:', conversationResponse);
                      res.status(201).send("Dialogflow response sent to Chatwoot customer!");
                      })
                      .catch(err => console.error(err.message));
                      })
                      .catch(err => console.error(err.message));
                      }
                      else{
                        res.status(201).send("Customer has not replied yet.");
                      }
                  })
              }
              else{
              //creating new convo with dialogflow and sending to chatwoot user
              dialogflowChat(sessionId, query)
                  .then(dialogflowResponse => {
                  createConversation(headers,dialogflowResponse,contactId,sessionId) 
                  .then(conversationResponse => {
                  console.log('Conversation created successfully:', conversationResponse);
                  res.status(201).send("Dialogflow response sent to Chatwoot customer!");
                  })
                  .catch(err => console.error(err.message));
                  })
                  .catch(err => console.error(err.message));
  
              }
          //   console.log("Conversation List:", conversations);
          })
          .catch(err => console.error(err.message));
          }
          else{
          console.log("Creating new contact");
          //contact doesn't exist 
          //create contact and conversation
          createContact(headers, response.result[0].number, response.result[0].number)  // Replace with the actual phone number {{RESOLVED}}
          .then(contactResponse => {
              console.log('Contact created successfully:', contactResponse);
              console.log('Contact ID:', contactResponse.payload.contact.id);
              var contactId = contactResponse.payload.contact.id;
              //dialogflow should be here
              dialogflowChat(sessionId, query)
              .then(dialogflowResponse => {
                createConversation(headers,dialogflowResponse,contactId,sessionId) 
                .then(conversationResponse => {
                console.log('Conversation created successfully:', conversationResponse);
                res.status(201).send(conversationResponse);
                })
                .catch(err => console.error(err.message));
              })
              .catch(err => console.error(err.message));
          })
      .catch(err => console.error(err.message));
  
          }
      })
      .catch(err => console.error(err.message));
    }
    else{
      //phone number not found
      res.status(201).send("Phone number not found in BigQuery");
    }

    })
    .catch(err => console.error(err.message));

        }

    }

    //triggered by chatwoot webhook
    // IF NO SESSION_ID THAT MEANS IT WAS A CHAT OUTSIDE OF THE INCIDENT
    //Chatwoot notification message_created
    if(req.body.event && req.body.event == "message_created"){
      var BQadd = []
      var contactId = "38";
      if(req.body.conversation.custom_attributes?.session_id){//checks if session_id exists
        //adds message to BQ
        BQadd.push(req.body)
        addRowToBigQuery(BQadd,"Chatwoot")
        .then(BQres => {
            console.log("Row added to Bigquery table: Chatwoot", BQres)
        })
        .catch(err => console.error(err.message));
      if(req.body.message_type == "incoming"){
            //get the message data from existing convo 
            if(req.body.sender.id != contactId){// this means the last message sent in the convo was from the user. {{RESOLVED: Use correct contactId}}
                    dialogflowChat(req.body.conversation.custom_attributes.session_id, req.body.content)
                        .then(dialogflowResponse => {
                          createMessage(headers,dialogflowResponse,req.body.conversation.id) 
                            .then(conversationResponse => {
                            console.log('Message created successfully:', conversationResponse);
                            res.status(201).send("Dialogflow response sent to Chatwoot customer!");
                            })
                            .catch(err => console.error(err.message));
                        })
                        .catch(err => console.error(err.message));
                }
                else{//if it's from the bot
                  res.status(201).send("Customer has not replied yet.");
                
                }
      }
      else if(req.body.message_type == "outgoing"){
        if(req.body.content.includes('the interaction will be closed and the status will be updated as "Resolved".')){
                  //push to pub/sub 
        var sessionParamsRows = [
          {
            action: "update", // this will find an existing ticket in elasticsearch
            id: req.body.conversation.custom_attributes.session_id, //
            data: JSON.stringify({
              "status": "closed"
            })
          }
        ];
        
    addRowToBigQuery(sessionParamsRows, "Ticket")
    .then(BQres => {
        console.log("Row added to Bigquery table: Ticket", BQres)
    })
    .catch(err => console.error(err.message));
        
        publishToTopic(sessionParamsRows)
        .then(topicRes => {
          console.log("Ticket pushed to Pub/Sub topic: chatwoot-tickets", topicRes);
          res.status(201).send("Ticket pushed to Pub/Sub topic: chatwoot-tickets")
        })
        .catch(err => console.error(err.message));
        
      }
      else if(req.body.content.includes('We will check to see if you user info exists in our system.')){
        bqphonenum = 'SELECT * FROM `telefonica-dev-155211.tracknme.User` WHERE number = ' + req.body.conversation.meta.sender.phone_number.replace(/\+/g, "");
        queryBigQuery(bqphonenum)
        .then(response => {
          if(response.result?.length === 1){//number exists
          var BQname = response.result[0].name;
          var BQplate = "";
          var BQuid = response.result[0].user_id;
          var bqplatequery = 'SELECT * FROM `telefonica-dev-155211.tracknme.Vehicle` WHERE user = ' + BQuid;
          queryBigQuery(bqplatequery)
          .then(response => {
            if(response.result?.length === 1){//number exists
              BQplate = response.result[0].licensePlate
            }
            else{
              console.log("Plate not found in Bigquery");
            }
          })
          .catch(err => console.error(err.message));

          dialogflowChat(req.body.conversation.custom_attributes.session_id, "USER_INFO_SEARCHED",BQname,BQplate)
          .then(dialogflowResponse => {
            createMessage(headers,dialogflowResponse,req.body.conversation.id) 
              .then(conversationResponse => {
              console.log('Message created successfully:', conversationResponse);
              res.status(201).send("Dialogflow response sent to Chatwoot customer!");
              })
              .catch(err => console.error(err.message));
          })
          .catch(err => console.error(err.message));

          }
          else{ //no number exists in big query
            dialogflowChat(req.body.conversation.custom_attributes.session_id, "USER_INFO_SEARCHED",)
            .then(dialogflowResponse => {
              createMessage(headers,dialogflowResponse,req.body.conversation.id) 
                .then(conversationResponse => {
                console.log('Message created successfully:', conversationResponse);
                res.status(201).send("Dialogflow response sent to Chatwoot customer!");
                })
                .catch(err => console.error(err.message));
            })
            .catch(err => console.error(err.message));
          }
        })
        .catch(err => console.error(err.message));
      }
      else if(req.body.content.includes('Thank you for answering all the questions, we will create a ticket for your concern and will try to resolve it as soon as possible.')){
        getSessionParams(req.body.name, " ")
        .then(params => {
          console.log("params response: ", params);
            var sessionParamsRows = [
              {
                action: "add", //this is a new ticket and should be added to elasticsearch
                id: uuidv4(),
                data: JSON.stringify({
                  name: fields.name.stringValue,
                  plate: fields.plate.stringValue,
                  mobile: req.body.conversation.meta.sender.phone_number.replace(/\+/g, ""),
                  concern_type: fields.concern_type.stringValue,
                  concern_obs: fields.concern_obs.stringValue,  
                  status: "open",
                })
              }
            ];
        addRowToBigQuery(sessionParamsRows, 'Ticket')
        .then(BQres => {
            console.log("Row added to Bigquery table: Ticket", BQres)
        })
        .catch(err => console.error(err.message));
        
        //push to pub/sub 
        publishToTopic(sessionParamsRows)
        .then(topicRes => {
          console.log("Ticket pushed to Pub/Sub topic: chatwoot-tickets", topicRes);
          res.status(201).send("Ticket pushed to Pub/Sub topic: chatwoot-tickets")
        })
        .catch(err => console.error(err.message));
      
        })
        .catch(err => console.error(err.message));
      }
      }
    }
    }

    //Chatwoot notification conversation_created
    if(req.body.event && req.body.event == "conversation_created"){
      var BQadd = []
      BQadd.push(req.body)
      addRowToBigQuery(BQadd)
      .then(BQres => {
          console.log("Row added to Bigquery table: Chatwoot", BQres)
      })

      if(!req.body.conversation.custom_attributes?.session_id){
        if(req.body.conversation.inbox_id === 11){        
          var uuid = uuidv4();
        // var uuid = Math.floor(Math.random() * 999999999999);
        dialogflowChat(uuid, query)
        .then(dialogflowResponse => {
          createMessage(headers,dialogflowResponse, req.body.conversation.id, uuid) 
            .then(conversationResponse => {
            console.log('Message created successfully:', conversationResponse);
            res.status(201).send("Dialogflow response sent to Chatwoot customer!");
            })
            .catch(err => console.error(err.message));
        })
        .catch(err => console.error(err.message));
}//checks if no session_id exists
    }
  }



});

const findContactByPhoneNumber = async (headers, phoneNumber) => {
  const chatwootApiUrl = `https://chatwoot.tracknme.com.br/api/v1/accounts/1/contacts/filter`;

  const filterData = {
    payload: [
      {
        attribute_key: "phone_number",
        filter_operator: "equal_to",
        values: [
          phoneNumber
        ],
        query_operator: null
      }
    ]
}

  // Make a request to search for the contact
  try {
    const response = await axios.post(chatwootApiUrl, filterData, { headers });
    console.log('Contacts found:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error finding contact:', error.response ? error.response.data : error.message);
    throw new Error('Failed to find contact.');
  }
};

const listAllConversations = async (headers) => {
  const chatwootApiUrl = `https://chatwoot.tracknme.com.br/api/v1/accounts/1/conversations`;

  // Make a request to search for all conversations
    try {
    const response = await axios.get(chatwootApiUrl, { headers });
    console.log('Conversations:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error retrieving conversations:', error.response ? error.response.data : error.message);
    throw new Error('Failed to retrieve conversations.');
  }

};

const createContact = async (headers, name, phoneNumber) => {
  const chatwootApiUrl = `https://chatwoot.tracknme.com.br/api/v1/accounts/1/contacts/`;

    const contactData = {
        name: name,
        phone_number: "+" + phoneNumber,
    };

  // Make a request to create the contact
    try {
        const response = await axios.post(chatwootApiUrl, contactData, { headers });
        console.log("Contact created", response.data)
        return response.data
    } catch (error) {
        console.error('Error creating contact:', error.response ? error.response.data : error.message);
        throw new Error('Failed to create contact');
    }

};

const createConversation = async (headers, message, contact_id, sessionId) => {
  const chatwootApiUrl = 'https://chatwoot.tracknme.com.br/api/v1/accounts/1/conversations';

    var sourceID = Math.floor(Math.random() * 999999999999);

    const data = {
    source_id: sourceID,
    inbox_id: "11",
    contact_id: contact_id,
    status: "open",
    custom_attributes: {
        session_id: sessionId,
        "priority_conversation_number": 3
    },
    message: 
    {
        content: message,
    }
    
}
    try {
        const response = await axios.post(chatwootApiUrl, data, { headers });
        console.log("Conversation created", response.data)
        return response.data
    } catch (error) {
        console.error('Error creating conversation:', error.response ? error.response.data : error.message);
        res.status(500).send('Failed to create conversation in Chatwoot.');
    }

}

const createMessage = async (headers, message, conversationId, sessionId = '') => {
  const chatwootApiUrl = 'https://chatwoot.tracknme.com.br/api/v1/accounts/1/conversations/'+ conversationId + '/messages';
    const data = {
    content: message
};

if (sessionId) {
  data.custom_attributes = {
          ...(sessionId && { session_id: sessionId }),
  };
}

  // Make a request to create a conversation
    try {
        const response = await axios.post(chatwootApiUrl, data, { headers });
        console.log("Message sent", response.data)
        return response.data
    } catch (error) {
        console.error('Error creating conversation:', error.response ? error.response.data : error.message);
        res.status(500).send('Failed to create conversation in Chatwoot.');
    }

};

const dialogflowChat = async (sessionId, query, fullname = '', plate = '') => {
        // Initialize a new session client
        const sessionClient = new SessionsClient({
        apiEndpoint: 'us-central1-dialogflow.googleapis.com', // Replace with your agent's region
        });

        // // Create the session path
        const sessionPath = sessionClient.projectLocationAgentSessionPath(
        projectId,
        locationId,
        agentId,
        sessionId
        );

        // // Detect Intent Request
        const request = {
        session: sessionPath,
        queryInput: {
            text: {
            text: query,
            },
            languageCode: languageCode,
        },
        };

        if (fullname || plate) {
          request.queryParams = {
              parameters: {
                  ...(fullname && { name: { stringValue: fullname } }),
                  ...(plate && { plate: { stringValue: plate } })
              }
          };
      }
  
        try{
        // Call the detectIntent method
        const [response] = await sessionClient.detectIntent(request);

        // Extract the fulfillment text from the response
        const fulfillmentText = response.queryResult.responseMessages[0].text.text[0];

        
        // Return the response back to the user
        return fulfillmentText;
        }
        catch (error) {
        // Log the error for debugging (could be replaced with cloud logging tools)
        console.error('Error', error);
        res.status(500).send('Error detecting intent');
        }
};

const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery();

const queryBigQuery = async (query) => {
  const options = {
    query: query,
    location: 'US',
    // params: { param: req.body.sessionInfo.parameters.yourParameter },
    projectId: 'telefonica-dev-155211',
  };

  try {
    const [rows] = await bigquery.query(options);
    return { result: rows };
  } catch (error) {
    return { error: error.message };
  }
};

const addRowToBigQuery = async (data,tableName) => {
  const datasetId = 'Chatbot';
  const tableId = tableName;

  console.log(tableName)
  // const rows = [
  //   {
  //     column1: 'value1',
  //     column2: 123,
  //     column3: 'value3'
  //   }
  // ];

  try {
    bqadd = await bigquery.dataset(datasetId).table(tableId).insert(data);
    return bqadd;
  } catch (error) {
    if (error.name === 'PartialFailureError') {
      console.error('Partial failure error:', error);
      if (error.errors) {
        error.errors.forEach(err => console.error('Row insertion error:', err));
      }
    } else {
      console.error('Error inserting rows:', error);
    }
  }
};

const getSessionParams = async (sessionId) => {
  // Initialize a new session client
  const sessionClient = new SessionsClient({
  apiEndpoint: 'us-central1-dialogflow.googleapis.com', // Replace with your agent's region
  });

  // // Create the session path
  const sessionPath = sessionClient.projectLocationAgentSessionPath(
  projectId,
  locationId,
  agentId,
  sessionId
  );

  // // Detect Intent Request
  const request = {
  session: sessionPath,
  queryInput: {
      text: {
      text: " ",
      },
      languageCode: languageCode,
  },
  };


  try{
  // Call the detectIntent method
  const [response] = await sessionClient.detectIntent(request);

  // Extract the fulfillment text from the response
  const fulfillmentText = response.queryResult.parameters;

  
  // Return the response back to the user
  return fulfillmentText;
  }
  catch (error) {
  // Log the error for debugging (could be replaced with cloud logging tools)
  console.error('Error', error);
  res.status(500).send('Error detecting intent');
  }
};

const { PubSub } = require('@google-cloud/pubsub');
const pubSubClient = new PubSub();

const publishToTopic = async (req) => {
  const topicName = 'chatbot-tickets'; // Replace with your topic name
  const message = JSON.stringify(req); // Assuming the data is sent in the body of the request

  try {
    const dataBuffer = Buffer.from(message);
    const messageId = await pubSubClient.topic(topicName).publish(dataBuffer);
    return `Message ${messageId} published to topic ${topicName}`;
  } catch (error) {
    console.error(`Error publishing message: ${error.message}`);
    return `Error publishing message: ${error.message}`;
  }
};

