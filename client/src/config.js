export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const getApiUrl = (endpoint) => {
    // Always use the full API URL
    return `${API_URL}${endpoint}`
} 