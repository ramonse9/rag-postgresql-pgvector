import { Injectable } from '@nestjs/common';
import { JobAnalysisGraph } from './job-analysis.graph';
import { DocumentsService } from '../documents/documents.service';
import { PostgresRetriever } from '../documents/retrievers/postgres.retriever';
import { ChatOpenAI } from '@langchain/openai';

@Injectable()
export class JobAnalysisService {

    private readonly graph;

    constructor(
        private readonly documentService: DocumentsService
    ) {

        const retriever = new PostgresRetriever(
            this.documentService,
            4
        )

        const model = new ChatOpenAI({
            model: 'gpt-5.4-mini',
            apiKey: process.env.OPENAI_API_KEY
        });


        const jobAnalysisGraph =  new JobAnalysisGraph(
                                        retriever,
                                        model
                                    );

        this.graph = jobAnalysisGraph.create();

    }

    async analyze(
        jobDescription: string,
        question: string
    ) {

        return this.graph.invoke({
            jobDescription,
            question
        });

    }

}