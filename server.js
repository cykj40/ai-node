import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import OpenAI from 'openai';
import { YoutubeTranscript } from 'youtube-transcript';

const app = express();
const port = 3001;  // React will use 3000

app.use(cors());
app.use(express.json());

const openai = new OpenAI();

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

// Store transcripts in memory (you might want to use a proper database in production)
const sessions = new Map();

app.post('/api/start-session', async (req, res) => {
    try {
        const { videoUrl } = req.body;
        const transcript = await getTranscript(videoUrl);

        if (!transcript) {
            return res.status(400).json({ error: 'Failed to get transcript' });
        }

        const sessionId = Date.now().toString();
        sessions.set(sessionId, {
            transcript,
            messages: [{
                role: 'system',
                content: `You are a helpful assistant that answers questions about a YouTube video. 
                         Here's the transcript of the video: ${transcript}`
            }]
        });

        res.json({ sessionId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { sessionId, message } = req.body;
        const session = sessions.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        session.messages.push({
            role: 'user',
            content: message
        });

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: session.messages,
            max_tokens: 150,
        });

        const assistantReply = response.choices[0].message.content;
        session.messages.push({
            role: 'assistant',
            content: assistantReply
        });

        res.json({ reply: assistantReply });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 