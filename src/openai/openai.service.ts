import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenaiService {
    private readonly client: OpenAI

    constructor(){
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        })
    }

    async createEmbeddings( texts: string[]):Promise<number[][]>{
        const response = await this.client.embeddings.create({
            model: 'text-embedding-3-small',
            input: texts
        })

        return response.data
            .sort( (a,b) => a.index - b.index)
            .map( (item) => item.embedding )
    }

    async generateAnswer(
        question: string,
        context: string,
    ):Promise<string>{

        const response =
            await this.client.responses.create({
                model: 'gpt-5.4-mini',
                instructions: `
                    You are an assistant answering questions about Ramón Antonio Guzmán Beltrán's professional experience.

                    Use ONLY the information provided in the CONTEXT.

                    Rules:
                    - Do not invent, assume, or infer information that is not explicitly supported by the context.
                    - If the answer cannot be determined from the context, explicitly say that the information is not available in the provided resume context.
                    - Answer in the same language as the user's question.
                    - Answer clearly, concisely, and factually.
                    - When possible, mention the relevant technology, responsibility, company, or project that supports the answer.
                `.trim(),

                input: `
                    QUESTION:
                    ${question}

                    CONTEXT:
                    ${context}
                `.trim(),
            });

            return response.output_text;

    }

}
