import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
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
    <div className="App">
      <header className="App-header">
        <h1>YouTube Video Q&A Bot</h1>
        {sessionId && (
          <div className="chunk-info">
            Processing chunk {currentChunk} of {totalChunks}
          </div>
        )}
      </header>

      <main className="App-main">
        {!sessionId ? (
          <div className="url-input-container">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Enter YouTube video URL"
              disabled={isLoading}
            />
            <button onClick={startSession} disabled={isLoading || !videoUrl}>
              {isLoading ? 'Loading...' : 'Start Session'}
            </button>
          </div>
        ) : (
          <div className="chat-container">
            <div className="messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.type}`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
              <form onSubmit={sendMessage} className="input-form">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your question..."
                />
                <button type="submit" disabled={!inputMessage.trim()}>
                  Send
                </button>
              </form>
              <button onClick={resetSession} className="reset-button">
                Load New Video
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
