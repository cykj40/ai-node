import 'dotenv/config'
import { Document } from '../node_modules/langchain/dist/document.js'
import { MemoryVectorStore } from '../node_modules/langchain/dist/vectorstores/memory.js'
import { Embeddings } from '@langchain/core/embeddings'

const movies = [
  {
    id: 1,
    title: 'Stepbrother',
    description: `Comedic journey full of adult humor and awkwardness.`,
  },
  {
    id: 2,
    title: 'The Matrix',
    description: `Deals with alternate realities and questioning what's real.`,
  },
  {
    id: 3,
    title: 'Shutter Island',
    description: `A mind-bending plot with twists and turns.`,
  },
  {
    id: 4,
    title: 'Memento',
    description: `A non-linear narrative that challenges the viewer's perception.`,
  },
  {
    id: 5,
    title: 'Doctor Strange',
    description: `Features alternate dimensions and reality manipulation.`,
  },
  {
    id: 6,
    title: 'Paw Patrol',
    description: `Children's animated movie where a group of adorable puppies save people from all sorts of emergencies.`,
  },
  {
    id: 7,
    title: 'Interstellar',
    description: `Features futuristic space travel with high stakes`,
  },
]

class CustomEmbeddings extends Embeddings {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
  }

  async embedDocuments(documents) {
    // Implement the embedding logic using the API key
    // Placeholder logic for embedding documents
    return documents.map(doc => ({
      text: doc.pageContent,
      vector: new Array(768).fill(Math.random()) // Example embedding with random values
    }));
  }

  async embedQuery(query) {
    // Implement the embedding logic for the query
    // Placeholder logic for embedding a query
    return new Array(768).fill(Math.random()); // Example embedding with random values
  }
}

const createStore = async () => {
  const embeddings = new CustomEmbeddings(process.env.OPENAI_API_KEY);
  const documents = movies.map(
    (movie) =>
      new Document({
        pageContent: `Title: ${movie.title}\n${movie.description}`,
        metadata: { source: movie.id, title: movie.title },
      })
  )
  return MemoryVectorStore.fromDocuments(documents, embeddings)
}

export const search = async (query, count = 1) => {
  try {
    const store = await createStore()
    return await store.similaritySearch(query, count)
  } catch (error) {
    console.error('Error during search:', error)
  }
}

  ; (async () => {
    const results = await search('cute and furry', 3)
    console.log('Search results:', results)
  })()



















