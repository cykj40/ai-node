import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import OpenAI from 'openai';
import { YoutubeTranscript } from 'youtube-transcript';
import { google } from 'googleapis';

const app = express();

// CORS configuration that handles Vercel preview deployments
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow any vercel.app subdomain and localhost
        if (origin.match(/\.vercel\.app$/) || origin.match(/localhost/)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());

// Add a test route at the root
app.get('/', (req, res) => {
    res.json({ message: 'API is running' });
});

// Test route for CORS
app.get('/test-cors', (req, res) => {
    res.json({ message: 'CORS is working' });
});

// Create API router
const apiRouter = express.Router();

// Move all existing routes to apiRouter
// ... rest of your route definitions but using apiRouter instead of app ...

// Mount the API router at /api
app.use('/api', apiRouter);

const openai = new OpenAI();
const youtube = google.youtube('v3');

// Rate limiting setup
const DAILY_LIMIT = 10000;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const rateLimitStore = {
    requests: new Map(),
    ips: new Map()
};

// Clean up old rate limit data every hour
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of rateLimitStore.requests) {
        if (now - timestamp > RATE_LIMIT_WINDOW) {
            rateLimitStore.requests.delete(key);
        }
    }
    for (const [ip, data] of rateLimitStore.ips) {
        if (now - data.timestamp > RATE_LIMIT_WINDOW) {
            rateLimitStore.ips.delete(ip);
        }
    }
}, 60 * 60 * 1000); // Run every hour

// Rate limiting middleware
const rateLimiter = (req, res, next) => {
    const clientIP = req.ip;
    const now = Date.now();

    // Initialize or update IP data
    if (!rateLimitStore.ips.has(clientIP)) {
        rateLimitStore.ips.set(clientIP, {
            count: 0,
            timestamp: now
        });
    }

    const ipData = rateLimitStore.ips.get(clientIP);

    // Reset count if 24 hours have passed
    if (now - ipData.timestamp > RATE_LIMIT_WINDOW) {
        ipData.count = 0;
        ipData.timestamp = now;
    }

    // Check if limit exceeded
    if (ipData.count >= DAILY_LIMIT) {
        return res.status(429).json({
            error: 'Rate limit exceeded. Please try again tomorrow.',
            remainingTime: Math.ceil((ipData.timestamp + RATE_LIMIT_WINDOW - now) / 1000 / 60), // minutes
        });
    }

    // Increment counter
    ipData.count++;
    rateLimitStore.ips.set(clientIP, ipData);

    next();
};

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

apiRouter.post('/start-session', async (req, res) => {
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

apiRouter.post('/chat', async (req, res) => {
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
apiRouter.post('/reset-session', (req, res) => {
    const { sessionId } = req.body;
    if (sessions.has(sessionId)) {
        sessions.delete(sessionId);
        res.json({ message: 'Session reset successfully' });
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

// Move search-videos route directly to app
app.post('/api/search-videos', async (req, res) => {
    try {
        const { query } = req.body;
        const youtube = google.youtube({
            version: 'v3',
            auth: process.env.YOUTUBE_API_KEY
        });

        const response = await youtube.search.list({
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: 10
        });

        const videos = response.data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.medium.url,
            channelTitle: item.snippet.channelTitle
        }));

        res.json({ videos });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get AI-generated playlist recommendations
apiRouter.post('/recommend-playlist', rateLimiter, async (req, res) => {
    try {
        const { topic } = req.body;

        // First, get AI suggestions for search terms
        const searchResponse = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `You are a helpful assistant that suggests YouTube search terms for creating a playlist about a specific topic. 
                   Format your response as a JSON array of 5 specific search terms.
                   Make the search terms specific and varied to create a well-rounded playlist.`
                },
                {
                    role: 'user',
                    content: `Suggest 5 specific search terms for creating a YouTube playlist about: ${topic}`
                }
            ],
            temperature: 0.7,
        });

        let searchTerms;
        try {
            searchTerms = JSON.parse(searchResponse.choices[0].message.content);
        } catch (e) {
            const content = searchResponse.choices[0].message.content;
            searchTerms = content.split('\n').filter(term => term.trim()).slice(0, 5);
        }

        const youtube = google.youtube('v3');
        const playlistVideos = [];

        for (const term of searchTerms) {
            const response = await youtube.search.list({
                part: 'snippet',
                q: term,
                type: 'video',
                maxResults: 2
            });

            const videos = response.data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.medium.url,
                channelTitle: item.snippet.channelTitle,
                searchTerm: term
            }));

            playlistVideos.push(...videos);
        }

        const organizationResponse = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that organizes and explains YouTube playlists.'
                },
                {
                    role: 'user',
                    content: `Here's a list of videos for a ${topic} playlist. Please organize them and explain why each video is included:
          ${playlistVideos.map(video => video.title).join('\n')}`
                }
            ],
            temperature: 0.7,
        });

        // Include rate limit info in response
        const ipData = rateLimitStore.ips.get(req.ip);
        const remainingRequests = DAILY_LIMIT - ipData.count;
        const resetTime = new Date(ipData.timestamp + RATE_LIMIT_WINDOW).toISOString();

        res.json({
            videos: playlistVideos,
            explanation: organizationResponse.choices[0].message.content,
            rateLimit: {
                remaining: remainingRequests,
                resetAt: resetTime,
                limit: DAILY_LIMIT
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove the port listening for Vercel
// Instead, export the app
export default app; 