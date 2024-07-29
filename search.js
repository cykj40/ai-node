import 'dotenv/config';
import { Document } from 'langchain/document';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'; // Fallback path

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
];

const createStore = async () => {
  const documents = movies.map(
    (movie) =>
      new Document({
        pageContent: `Title: ${movie.title}\n${movie.description}`,
        metadata: { source: movie.id, title: movie.title },
      })
  );

  const embeddings = new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY });
  return MemoryVectorStore.fromDocuments(documents, embeddings);
};

export const search = async (query, count = 1) => {
  try {
    const store = await createStore();
    return await store.similaritySearch(query, count);
  } catch (error) {
    console.error('Error during search:', error);
  }
};

(async () => {
  const results = await search('cute and furry');
  console.log(results);
})();






