import 'dotenv/config';
import OpenAI from 'openai';
import readline from 'readline';
import { YoutubeTranscript } from 'youtube-transcript';

const openai = new OpenAI();

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to get user input
const getUserInput = (prompt) => {
    return new Promise((resolve) => {
        rl.question(prompt, (input) => {
            resolve(input);
        });
    });
};

// Function to get YouTube transcript
async function getTranscript(videoUrl) {
    try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
        return transcript.map(item => item.text).join(' ');
    } catch (error) {
        console.error('Error fetching transcript:', error);
        return null;
    }
}

// Main chat loop
async function youtubeChat() {
    try {
        // Get YouTube URL from user
        const videoUrl = await getUserInput('Enter YouTube video URL: ');
        console.log('Fetching video transcript...');

        const transcript = await getTranscript(videoUrl);
        if (!transcript) {
            console.log('Failed to get transcript. Make sure the video has subtitles/CC available.');
            rl.close();
            return;
        }

        // Initialize conversation with context
        const messages = [
            {
                role: 'system',
                content: `You are a helpful assistant that answers questions about a YouTube video. 
                 Here's the transcript of the video: ${transcript}`
            }
        ];

        console.log('\nTranscript loaded! You can now ask questions about the video content.');
        console.log('Type "exit" to end the conversation.\n');

        while (true) {
            const userInput = await getUserInput('Your question: ');

            if (userInput.toLowerCase() === 'exit') {
                console.log('Assistant: Goodbye! Have a great day!');
                rl.close();
                break;
            }

            messages.push({
                role: 'user',
                content: userInput,
            });

            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: messages,
                max_tokens: 150,
            });

            const assistantReply = response.choices[0].message.content;
            messages.push({
                role: 'assistant',
                content: assistantReply,
            });

            console.log('Assistant:', assistantReply, '\n');
        }
    } catch (error) {
        console.error('Error:', error);
        rl.close();
    }
}

// Start the chat
console.log('YouTube Video Q&A Bot initialized.');
youtubeChat(); 