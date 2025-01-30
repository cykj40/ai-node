import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { XMarkIcon, ArrowPathIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import './App.css'

function App() {
  const [videoUrl, setVideoUrl] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentChunk, setCurrentChunk] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
            <h1 className="text-2xl font-bold text-gray-900">YouTube Video Q&A Bot</h1>
            {sessionId && (
              <div className="text-sm text-gray-500">
                Processing chunk {currentChunk} of {totalChunks}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {!sessionId ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">Enter YouTube Video URL</h2>
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
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100vh-12rem)]">
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`message message-transition ${msg.type}`}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="bg-white border-t">
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
      </main>
    </div>
  )
}

export default App
