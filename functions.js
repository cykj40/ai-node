import 'dotenv/config';
import { openai } from './openai.js';
import math from 'advanced-calculator';

const QUESTION = process.argv[2] || 'hi';

const messages = [
    {
        role: 'user',
        content: QUESTION,
    },
];

const functions = {
    calculate({ expression }) {
        return math.evaluate(expression);
    },
};

const getCompletion = async (messages) => {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages,
            temperature: 0,
            function_call: { name: 'calculate' },
            functions: [
                {
                    name: 'calculate',
                    description: 'Calculate the result of a mathematical expression',
                    parameters: {
                        type: 'object',
                        properties: {
                            expression: {
                                type: 'string',
                                description: 'The mathematical expression to evaluate',
                            },
                        },
                        required: ['expression'],
                    },
                },
            ],
        });
        console.log("OpenAI API Response:", response);
        return response.choices[0].message;
    } catch (error) {
        console.error("Error with OpenAI API request:", error.response ? error.response.data : error.message);
    }
};

const main = async () => {
    let response;
    while (true) {
        response = await getCompletion(messages);

        if (!response) {
            console.error("No response from OpenAI API.");
            break;
        }

        console.log("Response message:", response);

        if (response.content) {
            console.log(response.content);
            break;
        } else if (response.function_call) {
            const fnName = response.function_call.name;
            const args = JSON.parse(response.function_call.arguments);

            const functionToCall = functions[fnName];
            const result = functionToCall(args);

            console.log("Function result:", result);

            messages.push({
                role: 'function',
                name: fnName,
                content: JSON.stringify({ result }),
            });

            // Break the loop after sending the function result back
            console.log(`The result of the calculation is ${result}`);
            break;
        } else {
            console.error("Unexpected response structure:", response);
            break;
        }
    }
};

main();










