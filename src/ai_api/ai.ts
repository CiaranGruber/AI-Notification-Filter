import { Message, NotificationRequest, NotificationResponse, Priority } from "./types";

/**
 * @constant API_CONFIG
 * @description Configuration for the AI model API
 * @property {string} model - The AI model to use for classification
 * @property {number} maxTokens - Maximum number of tokens in the response
 * @property {number} temperature - Controls randomness in the model's output (0.2 = more focused)
 * @property {string} systemPrompt - The system prompt that defines the model's behavior
 */
const API_CONFIG = {
    model: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
    maxTokens: 1000,
    temperature: 0.2,
    systemPrompt: `You are a classification assistant that determines whether a user should receive a notification for a chat message.
Messages are from an ongoing thread and should be considered as strongly related to previous messages unless they are beginning a new topic.

In general, you should determine who is talking to whom and what the topic of the conversation is. Timestamps and mentions of other people may help.

When evaluating the meaning of a message, you must consider the context of previous messages with the most recent messages being most important for context.

Messages are ordered chronologically with the most recent message last.

If you are not sure about whether a message should be received given the user description, err on the side of receiving it.

The user will provide:
1. A description of the types of messages they are interested in receiving
2. A message to be classified
3. Context of up to 10 previous messages

Your response should be in the following JSON format:
{
    "shouldReceive": "y" | "n",
    "confidence": 0-100,
    "priority": "H" | "M" | "L",
    "reason": "short explanation of why you made your decision"
}

With the following details
- shouldReceive should be replaced with either "y" or "n" indicating if the notification should be received
- confidence should be replaced with an integer between 0 and 100 indicating how confident you are in your classification being either true or false
- priority should be replaced with one of "H", "M", or "L" indicating the priority of the notification according to the user's preferences
- reason should be replaced with a short explanation of why you made your decision as if you were talking to the user themselves. You should use 2nd-person conversational tone and not speak in third person. If the user identifies themselves, use "you" instead of their name, etc

Do not provide any text other than the JSON object itself.

Example answer:
{
    "shouldReceive": "y",
    "confidence": 100,
    "priority": "M",
    "reason": "This aligns with your request to receive messages about recent products"
}
`
} as const;

/**
 * @constant CLEAN_UP_CONFIG
 * @description Configuration for cleaning up AI responses
 * @property {string} model - The AI model to use for response cleanup
 * @property {number} maxTokens - Maximum number of tokens in the response
 * @property {number} temperature - Controls randomness in the model's output (0.2 = more focused)
 * @property {string} systemPrompt - The system prompt that defines the cleanup behavior
 */
const CLEAN_UP_CONFIG = {
    model: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    maxTokens: 100,
    temperature: 0.2,
    systemPrompt: `The given user message should have been a JSON object but likely has additional text. Please remove the extra text.`
}

/**
 * @function formatMessage
 * @description Formats a message object into a string representation
 * @param {Message} message The message to format
 * @returns {string} Formatted message string
 */
function formatMessage(message: Message): string {
    return `- (${message.timestamp.toISOString()}) ${message.sender}: ${message.content}`;
}

/**
 * @function getUserPrompt
 * @description Creates the prompt for the AI model using the user's description and messages
 * @param {string} userDescription The user's description of what messages they want to receive
 * @param {Message} messageToClassify The message to be classified
 * @param {Message[]} previousMessages Array of previous messages for context
 * @returns {string} Formatted prompt for the AI model
 */
function getUserPrompt(userDescription: string, messageToClassify: Message, previousMessages: Message[]): string {
    return `User Description:
${userDescription}

Message to Classify:
${formatMessage(messageToClassify)}

Previous Messages:
${previousMessages.map(formatMessage).join("\n")}`;
}

/**
 * @function classifyMessage
 * @description Classifies a message based on previous messages and a filtering prompt
 * @param {NotificationRequest} request The notification request containing user description, message to classify, and previous messages
 * @returns {Promise<boolean>} Promise resolving to true if the message should be received as a notification
 */
export async function classifyMessage(request: NotificationRequest): Promise<NotificationResponse> {
    try {
        const messages = [
            { role: "system", content: API_CONFIG.systemPrompt },
            { role: "user", content: getUserPrompt(request.userDescription, request.messageToClassify, request.previousMessages) }
        ]
        console.log(messages);

        // Get the response from the API
        const response = await fetch("https://api.gmi-serving.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GMI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: API_CONFIG.model,
                messages,
                max_tokens: API_CONFIG.maxTokens,
                temperature: API_CONFIG.temperature
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // eslint-disable-next-line no-console
        console.log("API Response:", data);

        let ai_response = deserialiseResponse(data.choices[0].message.content);
        return ai_response;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("API Error:", error);
        return {
            shouldReceive: false,
            confidence: 0,
            priority: Priority.LOW,
            reason: "Error"
        }
    }
};

/**
 * @function deserialiseResponse
 * @description Deserialises the response from the AI model into a NotificationResponse object
 * @param {string} response The response from the AI model
 * @returns {NotificationResponse} The deserialised response
 */
function deserialiseResponse(response: string): NotificationResponse {
    // Clean and validate response format
    response = cleanResponse(response);
    
    const json = JSON.parse(response);
    return {
        shouldReceive: json.shouldReceive === "y",
        confidence: json.confidence,
        priority: json.priority as Priority,
        reason: json.reason
    }
}

/**
 * @function cleanResponse
 * @description Cleans up the response to ensure it only contains the classification object
 * @param {string} response The raw response from the classification assistant
 * @returns {string} The cleaned response
 */
function cleanResponse(response: string): string {
    const match = response.match(/.*```json(.*)```.*/s);
    if (!match) {
        throw new Error("No JSON content found in response");
    }
    return match[1].trim();
}