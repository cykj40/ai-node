import 'dotenv/config';
import OpenAI from 'openai';
import readline from 'readline';

const openai = new OpenAI();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initialize conversation history
const messages = [
  {
    role: 'system',
    content: 'You are a helpful and friendly assistant.',
  }
];

// Function to get user input
const getUserInput = () => {
  return new Promise((resolve) => {
    rl.question('You: ', (input) => {
      resolve(input);
    });
  });
};

// Main chat loop
async function chat() {
  try {
    while (true) {
      // Get user input
      const userInput = await getUserInput();

      // Check for exit command
      if (userInput.toLowerCase() === 'exit') {
        console.log('Assistant: Goodbye! Have a great day!');
        rl.close();
        break;
      }

      // Add user message to conversation
      messages.push({
        role: 'user',
        content: userInput,
      });

      // Get response from OpenAI
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 150,
      });

      // Get assistant's reply
      const assistantReply = response.choices[0].message.content;

      // Add assistant's reply to conversation history
      messages.push({
        role: 'assistant',
        content: assistantReply,
      });

      // Display assistant's reply
      console.log('Assistant:', assistantReply);
    }
  } catch (error) {
    console.error('Error:', error);
    rl.close();
  }
}

// Start the chat
console.log('Chatbot initialized. Type "exit" to end the conversation.');
chat();








