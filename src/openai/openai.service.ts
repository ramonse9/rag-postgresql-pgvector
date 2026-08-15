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
            await this.client.chat.completions.create({
                model: 'gpt-4o-mini',
                temperature: 0,
                messages: [
                    {
                        role: 'system',
                        content: `
                            You are an assistant answering questions about Ramon's professional experience.

                            Use only the information provided in the context.

                            If the answer cannot be found in the context, clearly say that the information is not available in the provided resume.

                            Do not invent experience, technologies, companies, responsibilities, certifications, or qualifications.

                            Answer clearly and concisely.
                        `.trim(),
                    },
                    {
                        role: 'user',
                        content: `
                            Context:

                            ${context}

                            Question:

                            ${question}
                        `.trim(),
                    },
                ],
            });

            return response.choices[0].message.content ?? '';

    }

}
