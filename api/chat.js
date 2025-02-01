import { openai } from './openai.js';
import readline from 'node:readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const newMessage = async (history, message) => {
    const results = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [...history, message],
        // temprature is a parameter that controls uniqueness of the response 0 more deterministic, 1 more creative

    });
    return results.choices[0].message.content;
};

const formatMessage = (userInput) => ({ role: 'user', content: userInput });

// recursion
const chat = () => {
    const history = [
        { role: 'system', content: 'You are a helpful assistant.' }
    ];

    const start = () => {
        rl.question('You: ', async (userInput) => {
            if (userInput.toLowerCase() === 'exit') {
                rl.close();
                return;
            }
            const userMessage = formatMessage(userInput);
            const responseContent = await newMessage(history, userMessage);

            history.push(userMessage, { role: 'assistant', content: responseContent });
            console.log(`\n\nAI: ${responseContent}\n\n`);
            start();
        });
    };

    console.log('Welcome to the chat! Type "exit" to leave the chat.');
    start();
};

chat();


