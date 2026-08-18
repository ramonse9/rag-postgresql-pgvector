import { BaseRetriever } from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
import { DocumentsService } from '../documents.service';

export class PostgresRetriever extends BaseRetriever {

    lc_namespace = [
        'custom',
        'retrievers',
        'postgres'
    ];

    constructor(
        private readonly documentsService: DocumentsService,
        private readonly topK: number = 8
    ) {
        super();
    }

    async _getRelevantDocuments(
        query: string
    ): Promise<Document[]> {

        const results = await this.documentsService.search(
            query,
            this.topK
        );

        return results.map(result =>
            new Document({
                pageContent: result.content,
                metadata: {
                    chunkIndex: result.chunkIndex,
                    filename: result.filename,
                    distance: Number(result.distance),
                    documentId: result.document_id
                }
            })
        );
    }
}