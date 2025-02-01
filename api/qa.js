import 'dotenv/config';
import axios from 'axios';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { YoutubeLoader } from 'langchain/document_loaders/web/youtube';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { openai } from './openai.js';

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-mpnet-base-v2';

const question = process.argv[2] || 'hi';

const video = `https://youtu.be/zR_iuq2evXo?si=cG8rODgRgXOx9_Cn`;

export const createStore = async (docs) => {
  const texts = docs.map(doc => doc.pageContent);
  const embeddings = await Promise.all(
    texts.map(async (text) => {
      const response = await axios.post(
        HUGGINGFACE_API_URL,
        { inputs: text },
        {
          headers: {
            Authorization: `Bearer ${process.env.QNA_APP_TOKEN}`,
            'Content-Type': 'application/json'
          },
        }
      );
      return response.data.embeddings;
    })
  );

  const docsWithEmbeddings = docs.map((doc, idx) => ({
    ...doc,
    embeddings: embeddings[idx],
  }));

  return MemoryVectorStore.fromDocuments(docsWithEmbeddings);
};

export const docsFromYTVideo = async (video) => {
  try {
    const loader = await YoutubeLoader.createFromUrl(video, {
      language: 'en',
      addVideoInfo: true,
    });
    const docs = await loader.load();
    const splitter = new CharacterTextSplitter({
      separator: ' ',
      chunkSize: 2500,
      chunkOverlap: 100,
    });
    return splitter.splitDocuments(docs);
  } catch (error) {
    console.error(`Failed to get YouTube video transcription: ${error.message}`);
    return [];
  }
};

export const docsFromPDF = async () => {
  const loader = new PDFLoader('xbox.pdf');
  const docs = await loader.load();
  const splitter = new CharacterTextSplitter({
    separator: '. ',
    chunkSize: 2500,
    chunkOverlap: 200,
  });
  return splitter.splitDocuments(docs);
};

const loadStore = async () => {
  const videoDocs = await docsFromYTVideo(video);
  const pdfDocs = await docsFromPDF();
  return await createStore([...videoDocs, ...pdfDocs]);
};

const query = async () => {
  const store = await loadStore();
  const results = await store.similaritySearch(question, 1);

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-16k-0613',
    temperature: 0,
    messages: [
      {
        role: 'assistant',
        content: 'You are a helpful AI assistant. Answer questions to your best ability.',
      },
      {
        role: 'user',
        content: `Answer the following question using the provided context. If you cannot answer the question with the context, don't lie and make up stuff. Just say you need more context.
        Question: ${question}
  
        Context: ${results.map((r) => r.pageContent).join('\n')}`,
      },
    ],
  });
  console.log(
    `Answer: ${response.choices[0].message.content}\n\nSources: ${results
      .map((r) => r.metadata.source)
      .join(', ')}`
  );
};

query();





















