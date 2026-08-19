import { Injectable } from '@nestjs/common';
import {
    END,
    START,
    StateGraph
} from '@langchain/langgraph';

import { JobAnalysisState } from './job-analysis.state';
import { JobAnalysisNodesService } from './job-analysis-nodes.service';

@Injectable()
export class JobAnalysisGraph {

    
    constructor(
        private readonly nodes: JobAnalysisNodesService
    ) {}

    create() {

        const graph = new StateGraph(JobAnalysisState)

            .addNode(
                'validateRequest',
                this.nodes.validateRequest.bind(this.nodes)
            )

            .addNode(
                'extractRequirements',
                this.nodes.extractRequirements.bind(this.nodes)
            )

            .addNode(
                'retrieveEvidence',
                this.nodes.retrieveEvidence.bind(this.nodes)
            )

            .addNode(
                'evaluateRequirements',
                this.nodes.evaluateRequirements.bind(this.nodes)
            )

            .addNode(
                'classifyIntent',
                this.nodes.classifyIntent.bind(this.nodes)
            )
                
            .addNode(
                'generateMatchAnswer',
                this.nodes.generateMatchAnswer.bind(this.nodes)
            )

            .addNode(
                'generateGapsAnswer',
                this.nodes.generateGapsAnswer.bind(this.nodes)
            )           
            
            .addNode(
                'generateStrengthsAnswer',
                this.nodes.generateStrengthsAnswer.bind(this.nodes)
            )

            .addNode(
                'generateInterviewAnswer',
                this.nodes.generateInterviewAnswer.bind(this.nodes)
            )

            .addNode(
                'generateUnsupportedAnswer',
                this.nodes.generateUnsupportedAnswer.bind(this.nodes)
            )

            .addEdge(
                START,
                'validateRequest'
            )

            .addConditionalEdges(
                'validateRequest',
                (state) =>
                    state.requestValid
                        ? 'valid'
                        : 'invalid',
                {
                    valid: 'extractRequirements',
                    invalid: 'generateUnsupportedAnswer'
                }
            )

            .addEdge(
                'extractRequirements',
                'retrieveEvidence'
            )

            .addEdge(
                'retrieveEvidence',
                'evaluateRequirements'
            )

            .addEdge(
                'evaluateRequirements',
                'classifyIntent'
            )

            .addConditionalEdges(
                'classifyIntent',
                (state) => state.intent!,
                {
                    match: 'generateMatchAnswer',
                    gaps: 'generateGapsAnswer',
                    strengths: 'generateStrengthsAnswer',
                    interview: 'generateInterviewAnswer',
                    unsupported: 'generateUnsupportedAnswer',
                }
            )

            .addEdge(
                'generateMatchAnswer',
                END
            )

            .addEdge(
                'generateGapsAnswer',
                END
            )

            .addEdge(
                'generateStrengthsAnswer',
                END
            )

            .addEdge(
                'generateInterviewAnswer',
                END
            )

            .addEdge(
                'generateUnsupportedAnswer',
                END
            );

            

        return graph.compile();
    }
}