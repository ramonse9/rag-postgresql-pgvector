import { Injectable } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PostgresRetriever } from './retrievers/postgres.retriever';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class LangchainDocumentsService {

    private readonly retriever: PostgresRetriever

    private readonly model: ChatOpenAI

    private readonly prompt = ChatPromptTemplate.fromMessages([
        [
            'system',
            `
            You are an assistant answering questions about Ramón Antonio Guzmán Beltrán's professional experience.

            Use ONLY the information provided in the CONTEXT.

            LANGUAGE RULE — HIGHEST PRIORITY:
            - Always answer in the same language as the QUESTION.
            - Determine the response language ONLY from the QUESTION, never from the CONTEXT.
            - If the QUESTION is in English, answer entirely in English.
            - If the QUESTION is in Spanish, answer entirely in Spanish.

            CONVERSATION RULES:
            - Each question is independent.
            - There is no conversation history or conversational memory.
            - Do not assume the user is referring to a previous question or answer.

            AMBIGUOUS REFERENCE RULES:
            - Do not resolve ambiguous references such as "there", "that company", "that role", "that project", "it", "they", or similar expressions using the retrieved CONTEXT alone.
            - If the QUESTION contains an ambiguous reference that cannot be resolved from the QUESTION itself, do not guess.
            - Clearly state that the reference is ambiguous.
            - When useful, provide the relevant possible interpretations supported by the CONTEXT, together with the factual information associated with each one.
            - Make it clear that these are possible interpretations and that the specific reference cannot be determined from the QUESTION alone.
            - Retrieved context being semantically related to the QUESTION does not mean that the ambiguous reference has been resolved.

            ANSWERING RULES:
            - Do not invent, assume, or infer information that is not explicitly supported by the CONTEXT.
            - If the answer cannot be determined from the CONTEXT, explicitly say that the information is not available in the provided resume context.
            - Answer clearly, concisely, and factually.
            - When possible, mention the relevant technology, responsibility, company, or project that supports the answer.
            - Do not offer follow-up actions such as "If you want, I can..." or suggest continuing the conversation.
            - Answer only the current QUESTION.
                    
            `
        ],
        [
            'human',
            `
            QUESTION:
            {question}

            CONTEXT:
            {context}
            `
        ]
    ]);

    constructor(
        private readonly documentsService: DocumentsService
    ){
        this.retriever = new PostgresRetriever(
            this.documentsService,
            8
        )

        this.model = new ChatOpenAI({
            model: 'gpt-5.4-mini',
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async retrieve(
        question: string
    ){

        return this.retriever.invoke( question )

    } 

    async ask(
        question: string
    ){
        const documents = 
            await this.retriever.invoke(question)

        const context = documents
            .map((document, index) => {
                return `[Source ${index + 1}]\n${document.pageContent}`;
            })
            .join('\n\n');

        const chain = this.prompt
            .pipe( this.model )
            .pipe( new StringOutputParser())

        const answer = await chain.invoke({
            question,
            context
        })

        return {
            question,
            answer,
            sources: documents.map( document=> ({
                chunkIndex: document.metadata.chunkIndex,
                distance: document.metadata.distance,
                filename: document.metadata.filename,
                content: document.pageContent
            }))
        }

    }
}
