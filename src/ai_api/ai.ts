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

Your response should be:
- "y" if the message should be received as a notification
- "n" if the message should not be received

Only provide the letter "y" or "n" as the response and nothing else or the response will be rejected.`
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
    systemPrompt: `The given user message should have just been either "y" or "n" but it has extra information. Please remove the extra information.`
}

/**
 * @interface Message
 * @description Represents a chat message with timestamp, sender, and content
 * @property {Date} timestamp - When the message was sent
 * @property {string} sender - Who sent the message
 * @property {string} content - The message content
 */
export interface Message {
    timestamp: Date;
    sender: string;
    content: string;
}

/**
 * @interface NotificationRequest
 * @description Represents a request to classify a notification
 * @property {string} userDescription - Description of what types of messages the user wants to receive
 * @property {Message} messageToClassify - The message to be classified
 * @property {Message[]} previousMessages - Array of previous messages for context
 */
export interface NotificationRequest {
    userDescription: string;
    messageToClassify: Message;
    previousMessages: Message[];
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
 * @function getCleanedResponse
 * @description Cleans up the AI response to ensure it only contains the classification
 * @param {string} ai_response The raw response from the classification assistant
 * @returns {Promise<string>} Promise resolving to the cleaned response (y/n)
 * @throws {Error} If the API request fails or returns an error
 */
async function getCleanedResponse(ai_response: string): Promise<string> {
    const clean_up_response = await fetch("https://api.gmi-serving.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.GMI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: CLEAN_UP_CONFIG.model,
            messages: [
                { role: "system", content: CLEAN_UP_CONFIG.systemPrompt },
                { role: "user", content: ai_response }
            ],
            max_tokens: CLEAN_UP_CONFIG.maxTokens,
            temperature: CLEAN_UP_CONFIG.temperature
        })
    });
    const data = await clean_up_response.json();
    // eslint-disable-next-line no-console
    console.log("Clean Up Response:", data);
    return data.choices[0].message.content;
}

/**
 * @function classifyMessage
 * @description Classifies a message based on previous messages and a filtering prompt
 * @param {NotificationRequest} request The notification request containing user description, message to classify, and previous messages
 * @returns {Promise<boolean>} Promise resolving to true if the message should be received as a notification
 */
export async function classifyMessage(request: NotificationRequest): Promise<boolean> {
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

        let ai_response = data.choices[0].message.content;
        for (let i = 0; i < 3; i++) {
            if (ai_response === "y") {
                return true;
            } else if (ai_response === "n") {
                return false;
            }
            // Clean up the response to remove extra information
            ai_response = await getCleanedResponse(ai_response);
        }
        return false;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("API Error:", error);
        return false;
    }
};
