import "./styles.css";
import { classifyMessage, NotificationRequest, Message } from "../ai_api/ai";

declare const module: {
    hot?: {
        accept: () => void;
    };
};

/**
 * @interface Elements
 * @description Interface representing the DOM elements used in the application
 */
interface Elements {
    filterPrompt: HTMLTextAreaElement;
    chatMessages: HTMLDivElement;
    result: HTMLDivElement;
    newMessage: HTMLButtonElement;
    runTest: HTMLButtonElement;
    clearAll: HTMLButtonElement;
    exportMessages: HTMLButtonElement;
    importMessages: HTMLButtonElement;
    messagesData: HTMLTextAreaElement;
}

/**
 * @function getElements
 * @description Retrieves all required DOM elements
 * @returns {Elements} Object containing all required DOM elements
 */
function getElements(): Elements {
    return {
        filterPrompt: document.getElementById("filterPrompt") as HTMLTextAreaElement,
        chatMessages: document.getElementById("chatMessages") as HTMLDivElement,
        result: document.getElementById("result") as HTMLDivElement,
        newMessage: document.getElementById("newMessage") as HTMLButtonElement,
        runTest: document.getElementById("runTest") as HTMLButtonElement,
        clearAll: document.getElementById("clearAll") as HTMLButtonElement,
        exportMessages: document.getElementById("exportMessages") as HTMLButtonElement,
        importMessages: document.getElementById("importMessages") as HTMLButtonElement,
        messagesData: document.getElementById("messagesData") as HTMLTextAreaElement
    };
}

/**
 * @function createMessageRow
 * @description Creates a new message row for the UI with sender, content, timestamp, and control buttons
 * @param {Message} [message] Optional message data to populate the row
 * @returns {HTMLDivElement} The created message row element
 */
function createMessageRow(message?: Message): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "message-row";

    const timestamp = document.createElement("input");
    timestamp.type = "datetime-local";
    timestamp.className = "timestamp";
    if (message) {
        // Convert UTC to local time
        const localDate = new Date(message.timestamp);
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, "0");
        const day = String(localDate.getDate()).padStart(2, "0");
        const hours = String(localDate.getHours()).padStart(2, "0");
        const minutes = String(localDate.getMinutes()).padStart(2, "0");
        timestamp.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    } else {
        // Copy timestamp from last message if it exists
        const lastMessage = document.querySelector(".message-row");
        if (lastMessage) {
            const lastTimestamp = lastMessage.querySelector(".timestamp") as HTMLInputElement;
            timestamp.value = lastTimestamp.value;
        }
    }

    const sender = document.createElement("input");
    sender.type = "text";
    sender.placeholder = "Sender";
    sender.className = "sender";
    if (message) {
        sender.value = message.sender;
    }

    const content = document.createElement("input");
    content.placeholder = "Message content";
    content.className = "content";
    if (message) {
        content.value = message.content;
    }

    const controls = document.createElement("div");
    controls.className = "message-controls";

    const upButton = document.createElement("button");
    upButton.textContent = "↑";
    upButton.onclick = () => {
        const prev = row.previousElementSibling;
        if (prev) {
            row.parentNode?.insertBefore(row, prev);
        }
    };

    const downButton = document.createElement("button");
    downButton.textContent = "↓";
    downButton.onclick = () => {
        const next = row.nextElementSibling;
        if (next) {
            row.parentNode?.insertBefore(next, row);
        }
    };

    const removeButton = document.createElement("button");
    removeButton.textContent = "×";
    removeButton.onclick = () => row.remove();

    controls.append(upButton, downButton, removeButton);
    row.append(timestamp, sender, content, controls);

    return row;
}

/**
 * @function getMessages
 * @description Retrieves all messages from the chat messages div and converts them to Message objects
 * @returns {Message[]} Array of Message objects
 */
function getMessages(): Message[] {
    const rows = document.querySelectorAll(".message-row");
    return Array.from(rows).map(row => {
        const sender = (row.querySelector(".sender") as HTMLInputElement).value;
        const content = (row.querySelector(".content") as HTMLInputElement).value;
        const timestamp = new Date((row.querySelector(".timestamp") as HTMLInputElement).value);
        return { timestamp, sender, content };
    });
}

/**
 * @function exportMessages
 * @description Exports all messages to JSON format and stores it in the messages data textarea
 * @param {Elements} elements The DOM elements
 */
function exportMessages(elements: Elements): void {
    const messages = getMessages();
    const exportData = messages.map(msg => ({
        timestamp: msg.timestamp.toISOString(),
        sender: msg.sender,
        content: msg.content
    }));
    elements.messagesData.value = JSON.stringify(exportData, null, 2);
}

/**
 * @function importMessages
 * @description Imports JSON-formatted messages from the messages data textarea
 * @param {Elements} elements The DOM elements
 */
function importMessages(elements: Elements): void {
    try {
        const importData = JSON.parse(elements.messagesData.value);
        if (!Array.isArray(importData)) {
            throw new Error("Invalid import data format");
        }

        elements.chatMessages.innerHTML = "";
        importData.forEach(msg => {
            const message: Message = {
                timestamp: new Date(msg.timestamp),
                sender: msg.sender,
                content: msg.content
            };
            const row = createMessageRow(message);
            elements.chatMessages.appendChild(row);
        });
    } catch (error) {
        console.error("Error importing messages:", error);
        elements.result.textContent = "Error importing messages";
    }
}

/**
 * @function runTest
 * @description Runs the notification classification test for the messages and user description provided
 * @param {Elements} elements The DOM elements
 * @returns {Promise<void>}
 */
async function runTest(elements: Elements): Promise<void> {
    const messages = getMessages();
    if (messages.length === 0) {
        elements.result.textContent = "No messages to classify";
        return Promise.resolve();
    }

    const messageToClassify = messages[messages.length - 1];
    const previousMessages = messages.slice(0, -1);

    try {
        const request: NotificationRequest = {
            userDescription: elements.filterPrompt.value,
            messageToClassify,
            previousMessages
        };
        elements.result.textContent = "Determining response..."
        const shouldShow = await classifyMessage(request);
        elements.result.textContent = shouldShow ? "Yes" : "No";
        return Promise.resolve();
    } catch (error) {
        console.error("Error running test:", error);
        elements.result.textContent = "Error occurred";
        return Promise.resolve();
    }
}

/**
 * @function clearAll
 * @description Clears all input fields and messages
 * @param {Elements} elements The DOM elements
 */
function clearAll(elements: Elements): void {
    elements.filterPrompt.value = "";
    elements.chatMessages.innerHTML = "";
    elements.result.textContent = "";
    elements.messagesData.value = "";
}

/**
 * @function setupEventListeners
 * @description Sets up all event listeners for the application
 * @param {Elements} elements The DOM elements
 */
function setupEventListeners(elements: Elements): void {
    // Remove any existing event listeners
    const newNewMessage = elements.newMessage.cloneNode(true);
    const newRunTest = elements.runTest.cloneNode(true);
    const newClearAll = elements.clearAll.cloneNode(true);
    const newExportMessages = elements.exportMessages.cloneNode(true);
    const newImportMessages = elements.importMessages.cloneNode(true);
    
    elements.newMessage.parentNode?.replaceChild(newNewMessage, elements.newMessage);
    elements.runTest.parentNode?.replaceChild(newRunTest, elements.runTest);
    elements.clearAll.parentNode?.replaceChild(newClearAll, elements.clearAll);
    elements.exportMessages.parentNode?.replaceChild(newExportMessages, elements.exportMessages);
    elements.importMessages.parentNode?.replaceChild(newImportMessages, elements.importMessages);

    // Add event listeners to the new elements
    newNewMessage.addEventListener("click", () => {
        const row = createMessageRow();
        elements.chatMessages.appendChild(row);
    });
    newRunTest.addEventListener("click", () => runTest(elements));
    newClearAll.addEventListener("click", () => clearAll(elements));
    newExportMessages.addEventListener("click", () => exportMessages(elements));
    newImportMessages.addEventListener("click", () => importMessages(elements));
}

/**
 * @function main
 * @description Main entry point for the application
 */
function main(): void {
    const elements = getElements();
    setupEventListeners(elements);
}

// Handle hot module replacement
if (module.hot) {
    module.hot.accept();
}

main();
