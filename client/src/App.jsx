import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  XMarkIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import './App.css'

function App() {
  const [videoUrl, setVideoUrl] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentChunk, setCurrentChunk] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [playlistTopic, setPlaylistTopic] = useState('')
  const [playlist, setPlaylist] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const searchVideos = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/search-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      })

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      setSearchResults(data.videos)
    } catch (error) {
      console.error('Error searching videos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPlaylistRecommendations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/recommend-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: playlistTopic }),
      })

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      setPlaylist(data)
    } catch (error) {
      console.error('Error getting playlist:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startSession = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoUrl }),
      })

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      setSessionId(data.sessionId)
      setTotalChunks(data.totalChunks)
      setMessages([
        {
          type: 'system',
          content: `Transcript loaded! You can now ask questions about the video.\nProcessing ${data.totalChunks} chunks of transcript.`,
        },
      ])
    } catch (error) {
      setMessages([{ type: 'error', content: error.message }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const resetSession = async () => {
    try {
      if (sessionId) {
        await fetch('/api/reset-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        })
      }
      setSessionId(null)
      setMessages([])
      setVideoUrl('')
      setCurrentChunk(0)
      setTotalChunks(0)
    } catch (error) {
      console.error('Error resetting session:', error)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || !sessionId) return

    const userMessage = inputMessage
    setInputMessage('')
    setMessages((prev) => [...prev, { type: 'user', content: userMessage }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: userMessage,
        }),
      })

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      setCurrentChunk(data.currentChunk)
      setMessages((prev) => [...prev, { type: 'assistant', content: data.reply }])
    } catch (error) {
      setMessages((prev) => [...prev, { type: 'error', content: error.message }])
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">YouTube Video Assistant</h1>
            {sessionId && (
              <div className="text-sm text-gray-500">
                Processing chunk {currentChunk} of {totalChunks}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Video Search Section */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Search YouTube Videos</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for videos..."
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <button
                onClick={searchVideos}
                disabled={isLoading || !searchQuery}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <ArrowPathIcon className="animate-spin h-5 w-5" />
                ) : (
                  <MagnifyingGlassIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((video) => (
                  <div key={video.id} className="border rounded-lg p-4">
                    <img src={video.thumbnail} alt={video.title} className="w-full rounded-lg" />
                    <h3 className="mt-2 text-sm font-medium">{video.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{video.channelTitle}</p>
                    <button
                      onClick={() => setVideoUrl(`https://www.youtube.com/watch?v=${video.id}`)}
                      className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      Select for Q&A
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Playlist Recommendations Section */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Get Playlist Recommendations</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={playlistTopic}
                onChange={(e) => setPlaylistTopic(e.target.value)}
                placeholder="Enter a topic (e.g., 'yoga for beginners')"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <button
                onClick={getPlaylistRecommendations}
                disabled={isLoading || !playlistTopic}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <ArrowPathIcon className="animate-spin h-5 w-5" />
                ) : (
                  'Get Recommendations'
                )}
              </button>
            </div>
            {playlist && (
              <div className="mt-4">
                <div className="mb-4 prose">
                  <ReactMarkdown>{playlist.explanation}</ReactMarkdown>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {playlist.videos.map((video) => (
                    <div key={video.id} className="border rounded-lg p-4">
                      <img src={video.thumbnail} alt={video.title} className="w-full rounded-lg" />
                      <h3 className="mt-2 text-sm font-medium">{video.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{video.channelTitle}</p>
                      <p className="mt-1 text-xs text-gray-400">Search term: {video.searchTerm}</p>
                      <button
                        onClick={() => setVideoUrl(`https://www.youtube.com/watch?v=${video.id}`)}
                        className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Select for Q&A
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Q&A Section */}
          {!sessionId ? (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">Start Q&A Session</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  disabled={isLoading}
                />
                <button
                  onClick={startSession}
                  disabled={isLoading || !videoUrl}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <ArrowPathIcon className="animate-spin h-5 w-5" /> : 'Start Session'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-[calc(100vh-36rem)]">
              <div className="flex-1 overflow-y-auto px-4 py-6 bg-white shadow-sm rounded-lg">
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`message message-transition ${msg.type}`}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="bg-white border-t mt-4 rounded-lg shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4">
                  <form onSubmit={sendMessage} className="flex gap-4">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type your question..."
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim()}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={resetSession}
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
