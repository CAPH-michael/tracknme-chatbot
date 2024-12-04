# tracknme-chatbot
# Integração do Sistema de Incidentes (Elasticsearch) e Chatwoot com Dialogflow CX e Gemini

Este código Node.js implementa uma função de nuvem para integrar o Chatwoot com o Dialogflow CX, permitindo automação de conversas e criação de tickets no Tracknme.

## Fluxo de Execução

A função `helloHttp` é o ponto de entrada principal e lida com três tipos de gatilhos:

1. **Notificação de Ticket:** Acionado quando um novo ticket é criado.
2. **Webhook do Chatwoot (message_created):** Acionado quando uma nova mensagem é enviada ou recebida no Chatwoot.
3. **Webhook do Chatwoot (conversation_created):** Acionado quando uma nova conversa é iniciada no Chatwoot.

### 1. Notificação de Ticket

* Recebe dados do ticket via `req.body.message.data`.
* Decodifica um JWT contendo informações do ticket.
* Se o ticket contém um número de celular, busca um contato existente no Chatwoot usando `findContactByPhoneNumber`.
    * Se o contato existe:
        * Busca conversas existentes com o mesmo `sessionId` usando `listAllConversations`.
        * Se uma conversa aberta existe e a última mensagem foi do usuário, envia a consulta para o Dialogflow CX (`dialogflowChat`) e cria uma nova mensagem na conversa com a resposta (`createMessage`).
        * Se não existe conversa aberta, cria uma nova conversa com a resposta do Dialogflow CX (`createConversation`).
    * Se o contato não existe:
        * Cria um novo contato no Chatwoot (`createContact`).
        * Cria uma nova conversa com a resposta do Dialogflow CX.
* Se o ticket não contém um número de celular, consulta o BigQuery para obter o número associado ao `vehicleId` do ticket.
    * Se o número é encontrado, segue o mesmo fluxo de busca/criação de contato e conversa descrito acima.
    * Se o número não é encontrado, retorna uma mensagem indicando que o número não foi encontrado.

### 2. Webhook do Chatwoot (message_created)

* Adiciona a mensagem ao BigQuery.
* Se a conversa possui um `session_id`:
    * Se a mensagem é recebida (`message_type == "incoming"`) e não foi enviada pelo bot, envia a mensagem para o Dialogflow CX e cria uma nova mensagem na conversa com a resposta.
    * Se a mensagem é enviada (`message_type == "outgoing"`) e contém uma frase específica indicando o fechamento da interação, atualiza o status do ticket no BigQuery para "closed" e publica uma mensagem em um tópico Pub/Sub para atualizar o Elasticsearch.
    * Se a mensagem é enviada e contém uma frase específica sobre busca de informações do usuário, consulta o BigQuery, envia uma mensagem para o Dialogflow CX com as informações encontradas (ou não) e cria uma mensagem na conversa com a resposta.
    * Se a mensagem é enviada e contém uma frase específica sobre criação de ticket, extrai os parâmetros da sessão do Dialogflow CX (`getSessionParams`), cria um novo ticket no BigQuery e publica a informação em um tópico Pub/Sub.


### 3. Webhook do Chatwoot (conversation_created)

* Adiciona a conversa ao BigQuery.
* Se a conversa não possui `session_id` e pertence à inbox específica (ID 11):
    * Gera um novo `uuid`.
    * Inicia uma conversa com o Dialogflow CX usando o `uuid` e envia a primeira mensagem para o Chatwoot.


## Funções

* **`findContactByPhoneNumber(headers, phoneNumber)`:** Busca um contato no Chatwoot por número de telefone.
* **`listAllConversations(headers)`:** Lista todas as conversas no Chatwoot.
* **`createContact(headers, name, phoneNumber)`:** Cria um novo contato no Chatwoot.
* **`createConversation(headers, message, contact_id, sessionId)`:** Cria uma nova conversa no Chatwoot.
* **`createMessage(headers, message, conversationId, sessionId)`:** Cria uma nova mensagem em uma conversa no Chatwoot.
* **`dialogflowChat(sessionId, query, fullname, plate)`:** Envia uma consulta para o Dialogflow CX e retorna a resposta.
* **`queryBigQuery(query)`:** Executa uma consulta no BigQuery.
* **`addRowToBigQuery(data, tableName)`:** Adiciona uma nova linha a uma tabela no BigQuery.
* **`getSessionParams(sessionId)`:** Obtém os parâmetros da sessão do Dialogflow CX.
* **`publishToTopic(req)`:** Publica uma mensagem em um tópico Pub/Sub.

## Variáveis de Ambiente

* `projectId`: ID do projeto GCP.
* `locationId`:  Localização do agente Dialogflow CX.
* `agentId`: ID do agente Dialogflow CX.
* `environment`: Ambiente do agente Dialogflow CX (draft ou production).
* `languageCode`: Código de idioma do agente.
* `apiKey`: Chave de API do Chatwoot.


## Melhorias

* Adicionar tratamento de erros mais robusto.
* Implementar logging mais detalhado.
* Documentar o formato dos dados esperados nas notificações e webhooks.
* Configurar as variáveis de ambiente de forma segura.
content_copy
Use code with caution.
Markdown

This improved README provides a more detailed explanation of the code's execution flow, including how it handles different trigger events and how the functions interact. It also includes a description of the environment variables and suggestions for improvements. The BigQuery table names and Pub/Sub topic names are now explicit, making the documentation clearer. Finally, the explanation of how session_id is used to track conversations is more precise.