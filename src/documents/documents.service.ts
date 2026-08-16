import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { Repository } from 'typeorm';
import { DocumentChunk } from './entities/document-chunk.entity';
import { OpenaiService } from '../openai/openai.service';
import { ChunkingService } from './chunking.service';
import { TextCleaningService } from './text-cleaning.service';

@Injectable()
export class DocumentsService {

    constructor(
        @InjectRepository(Document) private readonly documentRepository: Repository<Document>,
        @InjectRepository(DocumentChunk) private readonly documentChunkRepository: Repository<DocumentChunk>,
        private readonly openAIService: OpenaiService,
        private readonly chunkingService: ChunkingService,
        private readonly textCleaningService: TextCleaningService
    ){}

    async ingest(
        filename: string,
        text: string
    ){

        const cleanedText = this.textCleaningService.clean( text )

        const chunks = this.chunkingService.split( cleanedText )

        const embeddings = 
            await this.openAIService.createEmbeddings(
                chunks.map( chunk => chunk.content )
            )

        const document = this.documentRepository.create({
            filename,
            originalText: text
        })

        await this.documentRepository.save( document )

        const chunkEntities = chunks.map( (chunk, index) => 
            this.documentChunkRepository.create({
                content: chunk.content, 
                chunkIndex: index,
                embedding: embeddings[index],
                document
            })
        )

        await this.documentChunkRepository.save( chunkEntities )

        return {
            documentId: document.id,
            filename,
            chunks: chunkEntities.length
        }

    }

    async search(
        query: string,
        topK: number = 8
    ){
        const [queryEmbedding] = 
                await this.openAIService.createEmbeddings([query])

        const vector = `[${queryEmbedding.join(',')}]`;

        const results = await this.documentChunkRepository.query(
             `
                SELECT
                    dc.id,
                    dc.content,
                    dc."chunkIndex",
                    dc.document_id,
                    d.filename,
                    dc.embedding <=> $1::vector AS distance
                FROM document_chunks dc
                INNER JOIN documents d
                    ON d.id = dc.document_id
                ORDER BY dc.embedding <=> $1::vector
                LIMIT $2
            `,
            [
                vector,
                topK
            ]
        )

        return results

    }

    async ask(
        question: string,
        topK: number = 8
    ){

        const results = await this.search(
            question,
            topK
        )

        const context = results
                .map( (result, index) => {
                    return `[Source ${index + 1}]\n${result.content}`;
                })
                .join('\n\n');

        const answer = 
                await this.openAIService.generateAnswer(
                    question,
                    context
                )

        return {
            question,
            answer,
            sources: results.map( result => ({
                chunkIndex: result.chunkIndex,
                distance: Number( result.distance ),
                filename: result.filename,
                content: result.content
            }))
        }

    }

}
