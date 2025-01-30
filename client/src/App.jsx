import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [videoUrl, setVideoUrl] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const startSession = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('http://localhost:3001/api/start-session', {
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
      setMessages([{ type: 'system', content: 'Transcript loaded! You can now ask questions about the video.' }])
    } catch (error) {
      setMessages([{ type: 'error', content: error.message }])
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || !sessionId) return

    const userMessage = inputMessage
    setInputMessage('')
    setMessages(prev => [...prev, { type: 'user', content: userMessage }])

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
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

      setMessages(prev => [...prev, { type: 'assistant', content: data.reply }])
    } catch (error) {
      setMessages(prev => [...prev, { type: 'error', content: error.message }])
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>YouTube Video Q&A Bot</h1>
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
                  {msg.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
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
          </div>
        )}
      </main>
    </div>
  )
}

export default App 