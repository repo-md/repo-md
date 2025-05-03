# Let OpenAI Talk with Your Content

Connect OpenAI to your repository content with just a few lines of code.

## Quick Example

```javascript
require('dotenv').config();
const { OpenAI } = require('openai');
const { RepoMD, toolSpecs } = require('repo-md');

// Initialize clients
const repoMd = new RepoMD({
  org: "your-organization",
  projectId: "your-project-id"
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  const userMessage = "What are the most recent posts in the repository?";

  // First call: Ask OpenAI using RepoMD tools
  const chatCompletion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: userMessage }],
    tools: toolSpecs,
    tool_choice: 'auto',
  });

  const response = chatCompletion.choices[0].message;

  // Handle tool calls if present
  if (response.tool_calls) {
    // Create a handler from our RepoMD instance
    const toolHandler = repoMd.createOpenAiToolHandler();

    // For each tool call
    for (const call of response.tool_calls) {
      // Process the call with our handler
      const result = await toolHandler(call);

      // Second call: respond with tool output
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'user', content: userMessage },
          response,
          {
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          },
        ],
      });

      console.log(finalResponse.choices[0].message.content);
    }
  } else {
    console.log(response.content);
  }
}

main();
```

## Available Tools

RepoMD provides these built-in tools for OpenAI:

- `getAllPosts` - Get all blog posts
- `getPostById` - Get a post by ID
- `getPostBySlug` - Get a post by slug
- `getPostByHash` - Get a post by hash
- `getRecentPosts` - Get recent posts
- `getSimilarPostsBySlug` - Find similar posts by slug
- `getSimilarPostsByHash` - Find similar posts by hash
- `getMediaItems` - Get media items
- `getReleaseInfo` - Get release information

## Multiple Tool Calls

For multiple tool calls, use the convenient `handleOpenAiRequest` method:

```javascript
// Process all tool calls at once
if (response.tool_calls) {
  const toolOutputs = await repoMd.handleOpenAiRequest({
    messages: [response]
  });
  
  // Create the messages array for the second call
  const messages = [
    { role: 'user', content: userMessage },
    response
  ];
  
  // Add all tool responses
  toolOutputs.tool_outputs.forEach(output => {
    messages.push({
      role: 'tool',
      tool_call_id: output.tool_call_id,
      content: output.output,
    });
  });
  
  // Get final response with all tool results
  const finalResponse = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages,
  });
  
  console.log(finalResponse.choices[0].message.content);
}
```

## OpenAI Assistants API

```javascript
const { OpenAI } = require('openai');
const { RepoMD, toolSpecs } = require('repo-md');

const repoMd = new RepoMD({
  org: "your-organization",
  projectId: "your-project-id"
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  // Create an assistant with RepoMD tools
  const assistant = await openai.beta.assistants.create({
    name: "Content Assistant",
    instructions: "You help users find content from the repository.",
    model: "gpt-4-turbo",
    tools: toolSpecs
  });
  
  // Create a thread and add a message
  const thread = await openai.beta.threads.create();
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: "What are the most recent posts?"
  });
  
  // Run the assistant
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id
  });
  
  // Monitor the run
  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  
  while (runStatus.status !== "completed" && runStatus.status !== "failed") {
    // Handle tool calls
    if (runStatus.status === "requires_action") {
      const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
      const toolHandler = repoMd.createOpenAiToolHandler();
      
      // Process all tool calls
      const toolOutputs = await Promise.all(toolCalls.map(async (toolCall) => {
        const result = await toolHandler(toolCall);
        return {
          tool_call_id: toolCall.id,
          output: JSON.stringify(result)
        };
      }));
      
      // Submit tool outputs
      await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
        tool_outputs: toolOutputs
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  }
  
  // Get the assistant's response
  const messages = await openai.beta.threads.messages.list(thread.id);
  const assistantMessage = messages.data.find(msg => msg.role === "assistant");
  
  console.log(assistantMessage.content[0].text.value);
}

main();
```