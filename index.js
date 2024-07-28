import 'dotenv/config';

import OpenAI from 'openai';

const openai = new OpenAI()
const results = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    {
      role: 'system',
      content: 'You are a helpful assistant.',
    },
    {
      role: 'user',
      content: 'What is the fastest car in the world?',
    },
  ],

  max_tokens: 100,
});

console.log(results.choices[0].message.content);








