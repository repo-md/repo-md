# Let OpenAI Talk with Your Content

RepoMD makes it easy to connect your repository content with OpenAI's API. With just a few lines of code, you can enable AI models to access and query your content directly.

## Quick Start

```javascript
import OpenAI from 'openai';
import { RepoMD, toolSpecs } from 'repo-md';

// Set up your RepoMD client
const repoMd = new RepoMD({
  org: "your-organization",
  projectId: "your-project-id",
  rev: "latest"
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a conversation
const messages = [
  { 
    role: "system", 
    content: "You are an assistant with access to a content repository. Use tools when needed."
  },
  { 
    role: "user", 
    content: "What are the three most recent posts in the repository?" 
  }
];

async function main() {
  // Initial request with tools from RepoMD
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages,
    tools: toolSpecs,
    tool_choice: "auto",
  });
  
  // Save OpenAI's response to conversation
  const assistantMessage = response.choices[0].message;
  messages.push(assistantMessage);
  
  // Process tool calls if present
  if (assistantMessage.tool_calls?.length > 0) {
    // Use RepoMD's handler to process tool calls
    const toolHandler = repoMd.createOpenAiToolHandler();
    
    // Process each tool call and get results
    const toolResults = await Promise.all(
      assistantMessage.tool_calls.map(async (toolCall) => {
        const result = await toolHandler(toolCall);
        return {
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result),
        };
      })
    );
    
    // Add tool results to conversation
    messages.push(...toolResults);
    
    // Get final response with tool results
    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
    });
    
    console.log(finalResponse.choices[0].message.content);
  } else {
    console.log(assistantMessage.content);
  }
}

main().catch(console.error);
```

## Using handleOpenAiRequest for Multiple Tool Calls

For requests with multiple tool calls, you can use the convenient `handleOpenAiRequest` method:

```javascript
import OpenAI from 'openai';
import { RepoMD, toolSpecs } from 'repo-md';

const repoMd = new RepoMD({
  org: "your-organization",
  projectId: "your-project-id",
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getContentInfo(userQuery) {
  // Initialize conversation
  const messages = [
    { role: "system", content: "You help users find content in the repository." },
    { role: "user", content: userQuery }
  ];

  // First request
  const initialResponse = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages,
    tools: toolSpecs,
    tool_choice: "auto",
  });

  // Add assistant's response to conversation
  const assistantMessage = initialResponse.choices[0].message;
  messages.push(assistantMessage);

  // If the AI wants to use tools
  if (assistantMessage.tool_calls?.length > 0) {
    // Process all tool calls at once with handleOpenAiRequest
    const toolOutputs = await repoMd.handleOpenAiRequest({
      messages: [assistantMessage]
    });
    
    // Add tool results to conversation
    toolOutputs.tool_outputs.forEach(output => {
      messages.push({
        role: "tool",
        tool_call_id: output.tool_call_id,
        content: output.output,
      });
    });
    
    // Get final response
    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
    });
    
    return finalResponse.choices[0].message.content;
  }
  
  return assistantMessage.content;
}

// Example
getContentInfo("Show me recent posts about JavaScript")
  .then(console.log)
  .catch(console.error);
```

## Available Tools

RepoMD provides these pre-configured tools for OpenAI:

| Tool | Description |
|------|-------------|
| `getAllPosts` | Get all posts from the repository |
| `getPostById` | Retrieve a post by its ID |
| `getPostBySlug` | Retrieve a post by its slug |
| `getPostByHash` | Retrieve a post by its hash |
| `getRecentPosts` | Get the most recent posts |
| `getSimilarPostsBySlug` | Find posts similar to a specific post (by slug) |
| `getSimilarPostsByHash` | Find posts similar to a specific post (by hash) |
| `getMediaItems` | Get all media items |
| `getReleaseInfo` | Get information about the current release |

## OpenAI Assistants API Example

You can also use RepoMD with OpenAI's Assistants API:

```javascript
import OpenAI from 'openai';
import { RepoMD, toolSpecs } from 'repo-md';

const repoMd = new RepoMD({
  org: "your-organization",
  projectId: "your-project-id",
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create an assistant with RepoMD tools
async function createContentAssistant() {
  return await openai.beta.assistants.create({
    name: "Content Assistant",
    instructions: "You help users find and understand content from the repository.",
    model: "gpt-4-turbo",
    tools: toolSpecs
  });
}

// Handle a conversation with the assistant
async function getAssistantResponse(assistantId, userMessage) {
  // Create a thread and add user message
  const thread = await openai.beta.threads.create();
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: userMessage
  });
  
  // Run the assistant
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId
  });
  
  // Process the run
  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  
  while (runStatus.status !== "completed" && runStatus.status !== "failed") {
    // Handle tool calls
    if (runStatus.status === "requires_action") {
      const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
      
      // Get a tool handler from the RepoMD instance
      const toolHandler = repoMd.createOpenAiToolHandler();
      
      // Process all tool calls
      const toolOutputs = await Promise.all(toolCalls.map(async (toolCall) => {
        const result = await toolHandler(toolCall);
        return {
          tool_call_id: toolCall.id,
          output: JSON.stringify(result)
        };
      }));
      
      // Submit tool outputs back to OpenAI
      await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
        tool_outputs: toolOutputs
      });
    }
    
    // Check status again after a short delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  }
  
  // Get the assistant's response
  const messages = await openai.beta.threads.messages.list(thread.id);
  const assistantMessage = messages.data.find(msg => 
    msg.role === "assistant" && 
    msg.run_id === run.id
  );
  
  return assistantMessage.content[0].text.value;
}

// Example usage
async function main() {
  const assistant = await createContentAssistant();
  const response = await getAssistantResponse(
    assistant.id, 
    "What are the most recent articles in the repository?"
  );
  console.log(response);
}

main().catch(console.error);
```

## Best Practices

1. **Use instance methods** - Always create handlers directly from your RepoMD instance:
   ```javascript
   const toolHandler = repoMd.createOpenAiToolHandler();
   ```

2. **Maintain conversation context** - Save all messages and responses in an array for coherent conversations.

3. **Process tool calls in parallel** - Use `Promise.all()` for better performance with multiple tool calls.

4. **Error handling** - Add try/catch blocks around tool calls to gracefully handle missing content.

5. **Choose the right approach**:
   - For single tool calls: Use the individual `toolHandler` function
   - For multiple tool calls: Use the `handleOpenAiRequest` method

By leveraging these tools, you can create AI assistants that have direct access to your repository's content.