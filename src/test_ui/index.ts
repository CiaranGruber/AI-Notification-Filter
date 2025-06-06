import "./styles.css";
import { classifyMessage } from "../ai_api/ai";
import { NotificationRequest, Message, NotificationResponse } from "../ai_api/types";

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
    prompt1: HTMLButtonElement;
    prompt2: HTMLButtonElement;
    prompt3: HTMLButtonElement;
    example1: HTMLButtonElement;
    example2: HTMLButtonElement;
    example3: HTMLButtonElement;
}

/**
 * Example data for the three example buttons
 */
const PROMPT_DATA = {
    prompt1: "I am Bob. Only send notifications if Alice responds to me.",
    prompt2: "Only show me sales messages",
    prompt3: "I only want to receive the first message in each topic. I would like to be notified only for documentation-related messages and fun work activities",
};

const EXAMPLE_DATA = {
    example1: [
        {
            timestamp: "2024-06-06T10:00:00.000Z",
            sender: "Alice",
            content: "Hey, are we still meeting for lunch today?"
        },
        {
            timestamp: "2024-06-06T10:15:00.000Z",
            sender: "Bob",
            content: "Yes! Looking forward to it. See you at 12:30 at the cafe."
        },
        {
            timestamp: "2024-06-06T11:45:00.000Z",
            sender: "Alice",
            content: "Running a bit late, will be there in 10 minutes!"
        }
    ],
    example2: [
        {
            timestamp: "2024-06-06T14:30:00.000Z",
            sender: "System",
            content: "Your account password will expire in 7 days. Please update it."
        },
        {
            timestamp: "2024-06-06T15:00:00.000Z",
            sender: "Marketing",
            content: "🎉 FLASH SALE! 50% off everything! Limited time only!"
        },
        {
            timestamp: "2024-06-06T15:30:00.000Z",
            sender: "Manager",
            content: "Team meeting moved to 3 PM tomorrow. Please confirm attendance."
        }
    ],
    example3: [
        {
          "timestamp": "2025-06-06T08:02:00.000Z",
          "sender": "Rachel",
          "content": "Morning folks — any blockers on the onboarding revamp before standup?"
        },
        {
          "timestamp": "2025-06-06T08:04:00.000Z",
          "sender": "Ciaran",
          "content": "Just waiting on the copy from marketing, otherwise good to go on my end."
        },
        {
          "timestamp": "2025-06-06T08:06:00.000Z",
          "sender": "Leo",
          "content": "I'll push the revised flowchart by 9, minor updates to the edge cases."
        },
        {
          "timestamp": "2025-06-06T08:30:00.000Z",
          "sender": "Nina",
          "content": "Heads up — CI's failing on the main branch after the latest merge. Looks like a broken test suite for auth."
        },
        {
          "timestamp": "2025-06-06T08:32:00.000Z",
          "sender": "Ciaran",
          "content": "That might be my patch from last night. I'll revert it and isolate the test cases."
        },
        {
          "timestamp": "2025-06-06T08:35:00.000Z",
          "sender": "Raj",
          "content": "Make sure to clean up the flaky token mocks too — they've been intermittently failing for days."
        },
        {
          "timestamp": "2025-06-06T09:01:00.000Z",
          "sender": "Leo",
          "content": "BTW, anyone got a link to the new linter rules doc? My formatter's yelling at everything this morning."
        },
        {
          "timestamp": "2025-06-06T09:10:00.000Z",
          "sender": "Nina",
          "content": "Pinned it in #dev-notes yesterday — search 'prettier-rules-v3'"
        },
        {
          "timestamp": "2025-06-06T10:00:00.000Z",
          "sender": "Rachel",
          "content": "On a less stressful note — trivia at lunch today. Prizes include eternal bragging rights and leftover donuts."
        },
        {
          "timestamp": "2025-06-06T10:01:00.000Z",
          "sender": "Raj",
          "content": "If there's a round on obscure regex trivia, I'm sweeping it."
        }
      ]
            
};

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
        messagesData: document.getElementById("messagesData") as HTMLTextAreaElement,
        prompt1: document.getElementById("prompt1") as HTMLButtonElement,
        prompt2: document.getElementById("prompt2") as HTMLButtonElement,
        prompt3: document.getElementById("prompt3") as HTMLButtonElement,
        example1: document.getElementById("example1") as HTMLButtonElement,
        example2: document.getElementById("example2") as HTMLButtonElement,
        example3: document.getElementById("example3") as HTMLButtonElement
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

    // Create profile picture
    const profilePic = document.createElement("div");
    profilePic.className = "profile-pic";
    
    // Generate initials from sender name
    const getInitials = (name: string): string => {
        if (!name) return "?";
        return name.split(" ")
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join("");
    };
    
    // Generate color based on sender name
    const getProfileColor = (name: string): string => {
        if (!name) return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
        const colors = [
            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
            "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
            "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
            "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
        ];
        const hash = name.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return colors[Math.abs(hash) % colors.length];
    };
    
    profilePic.textContent = message ? getInitials(message.sender) : "?";
    if (message) {
        profilePic.style.background = getProfileColor(message.sender);
    }

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
    
    // Update profile picture when sender changes
    sender.addEventListener("input", () => {
        const getInitials = (name: string): string => {
            if (!name) return "?";
            return name.split(" ")
                .map(word => word.charAt(0).toUpperCase())
                .slice(0, 2)
                .join("");
        };
        
        const getProfileColor = (name: string): string => {
            if (!name) return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
            const colors = [
                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
                "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
                "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
            ];
            const hash = name.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);
            return colors[Math.abs(hash) % colors.length];
        };
        
        profilePic.textContent = getInitials(sender.value);
        profilePic.style.background = getProfileColor(sender.value);
    });

    const content = document.createElement("textarea");
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
    row.append(profilePic, timestamp, sender, content, controls);

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
        const content = (row.querySelector(".content") as HTMLTextAreaElement).value;
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
 * @function loadExample
 * @description Loads example data into the messages data textarea
 * @param {Elements} elements The DOM elements
 * @param {keyof typeof EXAMPLE_DATA} exampleKey The example key to load
 */
function loadPrompt(elements: Elements, exampleKey: keyof typeof PROMPT_DATA): void {
    const exampleData = PROMPT_DATA[exampleKey];
    elements.filterPrompt.value = exampleData
}

/**
 * @function loadExample
 * @description Loads example data into the messages data textarea
 * @param {Elements} elements The DOM elements
 * @param {keyof typeof EXAMPLE_DATA} exampleKey The example key to load
 */
function loadExample(elements: Elements, exampleKey: keyof typeof EXAMPLE_DATA): void {
    const exampleData = EXAMPLE_DATA[exampleKey];
    elements.messagesData.value = JSON.stringify(exampleData, null, 2);
}

/**
 * @function runTest
 * @description Runs the notification classification test for the messages and user description provided
 * @param {Elements} elements The DOM elements
 * @returns {Promise<void>}
 */
function runTest(elements: Elements): void {
    const messages = getMessages();
    if (messages.length === 0) {
        elements.result.textContent = "No messages to classify";
        return;
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
        classifyMessage(request).then(response => {
            showResponse(response, elements);
        });
    } catch (error) {
        console.error("Error running test:", error);
        elements.result.textContent = "Error occurred";
    }
}

function showResponse(response: NotificationResponse, elements: Elements): void {
    elements.result.innerHTML = `<p>Notification shown: ${response.shouldReceive}</p>
<p>Confidence: ${response.confidence}</p>
<p>Priority: ${response.priority}</p>
<p>Reason: ${response.reason}</p>`;
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

    const newPrompt1 = elements.prompt1.cloneNode(true);
    const newPrompt2 = elements.prompt2.cloneNode(true);
    const newPrompt3 = elements.prompt3.cloneNode(true);

    const newExample1 = elements.example1.cloneNode(true);
    const newExample2 = elements.example2.cloneNode(true);
    const newExample3 = elements.example3.cloneNode(true);
    
    elements.newMessage.parentNode?.replaceChild(newNewMessage, elements.newMessage);
    elements.runTest.parentNode?.replaceChild(newRunTest, elements.runTest);
    elements.clearAll.parentNode?.replaceChild(newClearAll, elements.clearAll);
    elements.exportMessages.parentNode?.replaceChild(newExportMessages, elements.exportMessages);
    elements.importMessages.parentNode?.replaceChild(newImportMessages, elements.importMessages);

    elements.prompt1.parentNode?.replaceChild(newPrompt1, elements.prompt1);
    elements.prompt2.parentNode?.replaceChild(newPrompt2, elements.prompt2);
    elements.prompt3.parentNode?.replaceChild(newPrompt3, elements.prompt3);

    elements.example1.parentNode?.replaceChild(newExample1, elements.example1);
    elements.example2.parentNode?.replaceChild(newExample2, elements.example2);
    elements.example3.parentNode?.replaceChild(newExample3, elements.example3);

    // Add event listeners to the new elements
    newNewMessage.addEventListener("click", () => {
        const row = createMessageRow();
        elements.chatMessages.appendChild(row);
    });
    newRunTest.addEventListener("click", () => runTest(elements));
    newClearAll.addEventListener("click", () => clearAll(elements));
    newExportMessages.addEventListener("click", () => exportMessages(elements));
    newImportMessages.addEventListener("click", () => importMessages(elements));
    newPrompt1.addEventListener("click", () => loadPrompt(elements, "prompt1"));
    newPrompt2.addEventListener("click", () => loadPrompt(elements, "prompt2"));
    newPrompt3.addEventListener("click", () => loadPrompt(elements, "prompt3"));

    newExample1.addEventListener("click", () => loadExample(elements, "example1"));
    newExample2.addEventListener("click", () => loadExample(elements, "example2"));
    newExample3.addEventListener("click", () => loadExample(elements, "example3"));
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