import { Injectable } from '@nestjs/common';
import { JobAnalysisGraph } from './job-analysis.graph';

@Injectable()
export class JobAnalysisService {

    private readonly graph;

    constructor(
        private readonly jobAnalysisGraph: JobAnalysisGraph
    ) {

   


        this.graph = this.jobAnalysisGraph.create();

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