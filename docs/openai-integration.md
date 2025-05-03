# Let OpenAI Talk with Your Content

RepoMD provides a seamless way to connect your content with OpenAI's API, allowing AI models to access and query your content repository directly.

## Quick Start

```javascript
import OpenAI from 'openai';
import { RepoMD, toolSpecs } from 'repo-md';

// Initialize the RepoMD client with your repository details
const repoMd = new RepoMD({
  org: "your-organization",
  orgSlug: "your-org-slug",
  project: "your-project",
  projectId: "your-project-id",
  projectSlug: "your-project-slug",
  rev: "latest"
});

// Initialize the OpenAI client with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Convert RepoMD tool specs to OpenAI function format
const tools = toolSpecs.map(spec => ({
  type: "function",
  function: {
    name: spec.name,
    description: spec.description,
    parameters: spec.parameters
  }
}));

async function main() {
  // Step 1: Make a request to the OpenAI API with the tool definitions
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { 
        role: "system", 
        content: "You are a helpful assistant that can access content from a repository. Use the provided tools when needed."
      },
      { 
        role: "user", 
        content: "What are the most recent posts in the repository?" 
      }
    ],
    tools,
    tool_choice: "auto",
  });
  
  const response = completion.choices[0].message;
  
  // Step 2: If the model wants to use tools, process the request with RepoMD
  if (response.tool_calls && response.tool_calls.length > 0) {
    // Process the tool calls using RepoMD's handleOpenAiRequest
    const toolOutputs = await repoMd.handleOpenAiRequest({
      messages: [response]
    });
    
    // Prepare messages for the follow-up request
    const messages = [
      { 
        role: "system", 
        content: "You are a helpful assistant that can access content from a repository."
      },
      { role: "user", content: "What are the most recent posts in the repository?" },
      response
    ];
    
    // Add tool responses to the messages
    for (const toolOutput of toolOutputs.tool_outputs) {
      messages.push({
        role: "tool",
        tool_call_id: toolOutput.tool_call_id,
        content: toolOutput.output,
      });
    }
    
    // Make a follow-up request to get the final response
    const secondCompletion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
    });
    
    console.log(secondCompletion.choices[0].message.content);
  } else {
    console.log(response.content);
  }
}

main().catch(console.error);
```

## Direct Handler Integration

RepoMD provides a direct tool handler that you can use for each individual tool call:

```javascript
import OpenAI from 'openai';
import { RepoMD, toolSpecs } from 'repo-md';

// Initialize clients
const repoMd = new RepoMD({
  org: "your-organization",
  orgSlug: "your-org-slug",
  project: "your-project",
  projectId: "your-project-id",
  projectSlug: "your-project-slug",
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get the tool handler directly from the RepoMD instance
const toolHandler = repoMd.createOpenAiToolHandler();

// Define tools for OpenAI from RepoMD's tool specs
const tools = toolSpecs.map(spec => ({
  type: "function",
  function: {
    name: spec.name,
    description: spec.description,
    parameters: spec.parameters
  }
}));

async function getContentFromRepository(userQuery) {
  // Initial request to the model
  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: "You are an assistant with access to a content repository. When asked about content, use the appropriate tools."
      },
      { role: "user", content: userQuery }
    ],
    tools,
    tool_choice: "auto",
  });

  const message = chatCompletion.choices[0].message;

  // If the model wants to use tools
  if (message.tool_calls && message.tool_calls.length > 0) {
    const messages = [
      {
        role: "system",
        content: "You are an assistant with access to a content repository."
      },
      { role: "user", content: userQuery },
      message
    ];

    // Process all tool calls in parallel with the handler
    const toolOutputs = await Promise.all(
      message.tool_calls.map(async (toolCall) => {
        try {
          const result = await toolHandler(toolCall);
          return {
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify(result),
          };
        } catch (error) {
          console.error(`Error with tool ${toolCall.function.name}:`, error);
          return {
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify({ error: error.message }),
          };
        }
      })
    );

    // Add tool results to the conversation
    messages.push(...toolOutputs);

    // Get the final response
    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
    });

    return finalResponse.choices[0].message.content;
  }

  return message.content;
}

// Example usage
getContentFromRepository("What are the three most recent blog posts?")
  .then(response => console.log(response))
  .catch(error => console.error("Error:", error));
```

## Available Tools

RepoMD provides these tools for accessing your content through OpenAI:

| Tool Name | Description | Main Parameters |
|-----------|-------------|----------------|
| `getAllPosts` | Retrieve all blog posts | useCache, forceRefresh |
| `getPostById` | Get a post by ID | id |
| `getPostBySlug` | Get a post by slug | slug |
| `getPostByHash` | Get a post by hash | hash |
| `getRecentPosts` | Get most recent posts | count |
| `getSimilarPostsBySlug` | Find similar posts by slug | slug, count, loadIndividually |
| `getSimilarPostsByHash` | Find similar posts by hash | hash, count, loadIndividually |
| `getMediaItems` | Get all media items | useCache |
| `getReleaseInfo` | Get release information | |

The tool specs exported from RepoMD contain the complete parameter definitions for each tool.

## OpenAI Assistants API Integration

You can also use RepoMD with OpenAI's Assistants API:

```javascript
import OpenAI from 'openai';
import { RepoMD, toolSpecs } from 'repo-md';

// Initialize clients
const repoMd = new RepoMD({
  org: "your-organization",
  orgSlug: "your-org-slug",
  project: "your-project",
  projectId: "your-project-id",
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a tool handler for the RepoMD instance
const toolHandler = repoMd.createOpenAiToolHandler();

async function createRepoAssistant() {
  // Create an assistant with the RepoMD tools
  const assistant = await openai.beta.assistants.create({
    name: "Content Repository Assistant",
    instructions: "You help users find and understand content from the repository.",
    model: "gpt-4-turbo",
    tools: toolSpecs.map(spec => ({
      type: "function",
      function: {
        name: spec.name,
        description: spec.description,
        parameters: spec.parameters
      }
    }))
  });
  
  return assistant.id;
}

async function getResponseFromAssistant(assistantId, userMessage) {
  // Create a thread
  const thread = await openai.beta.threads.create();
  
  // Add user message
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: userMessage
  });
  
  // Run the assistant
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId
  });
  
  // Monitor the run status
  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  
  while (runStatus.status !== "completed" && runStatus.status !== "failed") {
    // Process tool calls when required
    if (runStatus.status === "requires_action" && 
        runStatus.required_action?.type === "submit_tool_outputs") {
      
      const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
      
      // Process all tool calls with our handler
      const toolOutputs = await Promise.all(toolCalls.map(async (toolCall) => {
        // Use the RepoMD tool handler to process each call
        const result = await toolHandler(toolCall);
        
        return {
          tool_call_id: toolCall.id,
          output: JSON.stringify(result)
        };
      }));
      
      // Submit the outputs back to OpenAI
      await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
        tool_outputs: toolOutputs
      });
    }
    
    // Wait a moment before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  }
  
  // Get messages after completion
  const messages = await openai.beta.threads.messages.list(thread.id);
  
  // Return the latest assistant message
  return messages.data
    .filter(msg => msg.role === "assistant")
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    .content[0].text.value;
}

// Full example
async function main() {
  try {
    // Create the assistant once
    const assistantId = await createRepoAssistant();
    console.log(`Assistant created with ID: ${assistantId}`);
    
    // Get a response
    const response = await getResponseFromAssistant(
      assistantId, 
      "What are the most popular posts in the repository based on the embedding similarities?"
    );
    
    console.log("Assistant response:", response);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
```

## Best Practices

1. **Use instance methods**: Always use the `repoMd.createOpenAiToolHandler()` and `repoMd.handleOpenAiRequest()` methods on your RepoMD instance.

2. **Provide context**: Give the AI clear instructions about your repository's content and structure.

3. **Error handling**: Implement proper error handling for tool calls as they may fail when content is not found.

4. **Manage conversation context**: Preserve conversation history between requests to maintain continuity.

5. **Use specific tools**: Target specific tools like `getPostBySlug` rather than retrieving all posts when possible.

6. **Optimize caching**: Take advantage of RepoMD's caching to reduce API calls and improve performance.

7. **Use proper ESM imports**: Make use of modern ES module syntax for cleaner code and better tree-shaking.

8. **Run tool calls in parallel**: Process multiple tool calls concurrently with Promise.all for better performance.

By leveraging RepoMD with OpenAI, you can create dynamic applications that intelligently interact with your content repository.