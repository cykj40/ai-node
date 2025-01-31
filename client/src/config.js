export const API_URL = import.meta.env.VITE_API_URL || ''

export const getApiUrl = (endpoint) => {
    if (!API_URL || API_URL === 'http://localhost:3001') {
        // In development or if API_URL is not set, use relative paths
        return endpoint
    }
    // In production, use the full API URL
    return `${API_URL}${endpoint}`
} 