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

// Function to extract video ID from URL
function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}

// Enhanced transcript fetching
async function getTranscript(videoUrl) {
    try {
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        // Add timestamps and organize transcript better
        return transcript.map(item => ({
            text: item.text,
            timestamp: item.offset / 1000, // Convert to seconds
            duration: item.duration
        }));
    } catch (error) {
        console.error('Error fetching transcript:', error);
        return null;
    }
}

function chunkTranscript(transcript, maxLength = 8000) {
    const chunks = [];
    let currentChunk = [];
    let currentLength = 0;

    for (const item of transcript) {
        if (currentLength + item.text.length > maxLength) {
            chunks.push(currentChunk);
            currentChunk = [item];
            currentLength = item.text.length;
        } else {
            currentChunk.push(item);
            currentLength += item.text.length;
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
}

// Store transcripts in memory
const sessions = new Map();

app.post('/api/start-session', async (req, res) => {
    try {
        const { videoUrl } = req.body;
        const transcript = await getTranscript(videoUrl);

        if (!transcript) {
            return res.status(400).json({ error: 'Failed to get transcript' });
        }

        const sessionId = Date.now().toString();
        const transcriptChunks = chunkTranscript(transcript);

        sessions.set(sessionId, {
            videoUrl,
            transcriptChunks,
            currentChunk: 0,
            messages: [{
                role: 'system',
                content: `You are a helpful assistant that answers questions about a YouTube video. 
                         Format your responses using markdown when appropriate for tables, lists, and emphasis.
                         Always include timestamps when referencing specific parts of the video.`
            }]
        });

        res.json({
            sessionId,
            totalChunks: transcriptChunks.length,
            videoUrl
        });
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

        const currentChunkText = session.transcriptChunks[session.currentChunk]
            .map(item => `[${Math.floor(item.timestamp)}s] ${item.text}`)
            .join('\n');

        const messages = [
            {
                role: 'system',
                content: `You are a helpful assistant that answers questions about a YouTube video.
                         Format your responses using markdown for better readability.
                         Current transcript chunk (${session.currentChunk + 1}/${session.transcriptChunks.length}):
                         ${currentChunkText}`
            },
            ...session.messages.slice(1),
            { role: 'user', content: message }
        ];

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages,
            max_tokens: 500,
            temperature: 0.7,
        });

        const assistantReply = response.choices[0].message.content;

        if (assistantReply.toLowerCase().includes("i don't see any information") &&
            session.currentChunk < session.transcriptChunks.length - 1) {
            session.currentChunk++;
            return await handleChat(req, res);
        }

        session.messages.push(
            { role: 'user', content: message },
            { role: 'assistant', content: assistantReply }
        );

        res.json({
            reply: assistantReply,
            currentChunk: session.currentChunk + 1,
            totalChunks: session.transcriptChunks.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// New endpoint to unload/reset session
app.post('/api/reset-session', (req, res) => {
    const { sessionId } = req.body;
    if (sessions.has(sessionId)) {
        sessions.delete(sessionId);
        res.json({ message: 'Session reset successfully' });
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 