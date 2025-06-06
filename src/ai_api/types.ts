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
 * @enum Priority
 * @description Represents the priority level of a notification
 */
export enum Priority {
    HIGH = "H",
    MEDIUM = "M",
    LOW = "L"
}

/**
 * @interface NotificationResponse
 * @description Represents a response from the AI model
 * @property {boolean} shouldReceive - Whether the message should be received as a notification
 * @property {number} confidence - Confidence in the response
 * @property {Priority} priority - Priority of the notification
 * @property {string} reason - Reason for the response
 */
export interface NotificationResponse {
    shouldReceive: boolean;
    confidence: number;
    priority: Priority;
    reason: string;
}