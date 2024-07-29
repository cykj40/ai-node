import 'dotenv/config'; // Ensure .env is correctly set up
import { Document } from 'langchain/document';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

const movies = [
    { id: 1, title: 'Stepbrother', description: 'Comedic journey full of adult humor and awkwardness.' },
    { id: 2, title: 'The Matrix', description: 'Deals with alternate realities and questioning what\'s real.' },
    { id: 3, title: 'Shutter Island', description: 'A mind-bending plot with twists and turns.' },
    { id: 4, title: 'Memento', description: 'A non-linear narrative that challenges the viewer\'s perception.' },
    { id: 5, title: 'Doctor Strange', description: 'Features alternate dimensions and reality manipulation.' },
    { id: 6, title: 'Paw Patrol', description: 'Children\'s animated movie where a group of adorable puppies save people from all sorts of emergencies.' },
    { id: 7, title: 'Interstellar', description: 'Features futuristic space travel with high stakes.' },
    { id: 8, title: 'Inception', description: 'A heist movie that takes place in dreams within dreams.' },
    { id: 9, title: 'The Prestige', description: 'A story of two rival magicians with a dark twist.' },
    { id: 10, title: 'The Dark Knight', description: 'A gritty superhero movie with a complex villain.' },
];

const createStore = async () => {
    const documents = movies.map(
        movie => new Document({
            pageContent: `Title: ${movie.title}\n${movie.description}`,
            metadata: { source: movie.id, title: movie.title }
        })
    );
    const embeddings = new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY });
    return MemoryVectorStore.fromDocuments(documents, embeddings);
};

const search = async (query, count = 1) => {
    try {
        const store = await createStore();
        return store.similaritySearch(query, count);
    } catch (error) {
        console.error('Error during search:', error);
    }
};

(async () => {
    const results = await search('mind-bending plot with twists and turns', 1);
    console.log(results);
})();





