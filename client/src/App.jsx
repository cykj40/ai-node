import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  XMarkIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PlayIcon,
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
  const [rateLimitInfo, setRateLimitInfo] = useState(null)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [showVideoPreview, setShowVideoPreview] = useState(false)

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
      setRateLimitInfo(data.rateLimit)
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
      setRateLimitInfo(data.rateLimit)
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

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
  }

  const clearPlaylist = () => {
    setPlaylistTopic('')
    setPlaylist(null)
  }

  const handleVideoSelect = (video) => {
    setVideoUrl(`https://www.youtube.com/watch?v=${video.id}`)
    setSelectedVideo(video)
    setShowVideoPreview(true)
  }

  const handleStartQA = async () => {
    setShowVideoPreview(false)
    await startSession()
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-[#282828] flex items-center gap-2">
              <span className="text-[#ff0000]">▶</span> YouTube Video Assistant
            </h1>
            <div className="flex items-center gap-4">
              {rateLimitInfo && (
                <div className="text-sm text-[#606060]">
                  Remaining requests: {rateLimitInfo.remaining}/{rateLimitInfo.limit}
                </div>
              )}
              {sessionId && (
                <div className="text-sm text-[#606060]">
                  Processing chunk {currentChunk} of {totalChunks}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Video Search Section */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4 text-[#282828]">Search YouTube Videos</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for videos..."
                className="yt-input"
              />
              <button
                onClick={searchVideos}
                disabled={isLoading || !searchQuery}
                className="yt-button"
              >
                {isLoading ? (
                  <ArrowPathIcon className="animate-spin h-5 w-5" />
                ) : (
                  <MagnifyingGlassIcon className="h-5 w-5" />
                )}
              </button>
              {searchResults.length > 0 && (
                <button onClick={clearSearch} className="yt-button-secondary">
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((video) => (
                  <div key={`search-${video.id}`} className="video-card">
                    <div
                      className="relative cursor-pointer overflow-hidden"
                      onClick={() => handleVideoSelect(video)}
                    >
                      <img src={video.thumbnail} alt={video.title} className="video-thumbnail" />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-opacity">
                        <PlayIcon className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3
                        className="video-title cursor-pointer"
                        onClick={() => handleVideoSelect(video)}
                      >
                        {video.title}
                      </h3>
                      <p className="channel-name mt-1">{video.channelTitle}</p>
                      <button
                        onClick={() => handleVideoSelect(video)}
                        className="mt-3 yt-button w-full justify-center"
                      >
                        <PlayIcon className="h-4 w-4 mr-2" />
                        Select for Q&A
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Playlist Recommendations Section */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4 text-[#282828]">
              Get Playlist Recommendations
            </h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={playlistTopic}
                onChange={(e) => setPlaylistTopic(e.target.value)}
                placeholder="Enter a topic (e.g., 'yoga for beginners')"
                className="yt-input"
              />
              <button
                onClick={getPlaylistRecommendations}
                disabled={isLoading || !playlistTopic}
                className="yt-button whitespace-nowrap"
              >
                {isLoading ? (
                  <ArrowPathIcon className="animate-spin h-5 w-5" />
                ) : (
                  'Get Recommendations'
                )}
              </button>
              {playlist && (
                <button onClick={clearPlaylist} className="yt-button-secondary">
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            {playlist && (
              <div className="mt-6">
                <div className="mb-6 prose max-w-none">
                  <ReactMarkdown>{playlist.explanation}</ReactMarkdown>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {playlist.videos.map((video, index) => (
                    <div key={`playlist-${video.id}-${index}`} className="video-card">
                      <div
                        className="relative cursor-pointer overflow-hidden"
                        onClick={() => handleVideoSelect(video)}
                      >
                        <img src={video.thumbnail} alt={video.title} className="video-thumbnail" />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-opacity">
                          <PlayIcon className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <div className="p-4">
                        <h3
                          className="video-title cursor-pointer"
                          onClick={() => handleVideoSelect(video)}
                        >
                          {video.title}
                        </h3>
                        <p className="channel-name mt-1">{video.channelTitle}</p>
                        <p className="mt-1 text-xs text-[#606060]">
                          Search term: {video.searchTerm}
                        </p>
                        <button
                          onClick={() => handleVideoSelect(video)}
                          className="mt-3 yt-button w-full justify-center"
                        >
                          <PlayIcon className="h-4 w-4 mr-2" />
                          Select for Q&A
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Video Preview Modal */}
          {showVideoPreview && selectedVideo && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-[#282828]">{selectedVideo.title}</h2>
                  <button
                    onClick={() => setShowVideoPreview(false)}
                    className="text-[#606060] hover:text-[#282828]"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="aspect-w-16 aspect-h-9 mb-4">
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedVideo.id}`}
                    title={selectedVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full rounded-lg"
                  ></iframe>
                </div>
                <div className="mb-4">
                  <h3 className="font-medium text-[#282828]">Description</h3>
                  <p className="text-sm text-[#606060]">{selectedVideo.description}</p>
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setShowVideoPreview(false)}
                    className="yt-button-secondary"
                  >
                    Cancel
                  </button>
                  <button onClick={handleStartQA} className="yt-button">
                    Start Q&A Session
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Q&A Section */}
          {!sessionId ? (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4 text-[#282828]">Start Q&A Session</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="yt-input"
                  disabled={isLoading}
                />
                <button
                  onClick={startSession}
                  disabled={isLoading || !videoUrl}
                  className="yt-button"
                >
                  {isLoading ? <ArrowPathIcon className="animate-spin h-5 w-5" /> : 'Start Session'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-[calc(100vh-16rem)] bg-white shadow-sm rounded-lg">
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-4xl mx-auto">
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`message message-transition ${msg.type}`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>

              <div className="border-t bg-white p-4">
                <div className="max-w-4xl mx-auto">
                  <form onSubmit={sendMessage} className="flex gap-4">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type your question..."
                      className="yt-input"
                    />
                    <button type="submit" disabled={!inputMessage.trim()} className="yt-button">
                      <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                    <button onClick={resetSession} type="button" className="yt-button-secondary">
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
