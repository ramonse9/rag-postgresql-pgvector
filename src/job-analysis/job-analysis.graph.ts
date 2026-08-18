import {
    END,
    START,
    StateGraph
} from '@langchain/langgraph';

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

import { JobAnalysisState } from './job-analysis.state';
import { ExtractedRequirementsSchema, RequirementEvaluation, RequirementEvaluationSchema, RequirementEvidence } from './types/job-analysis.types';
import { PostgresRetriever } from 'src/documents/retrievers/postgres.retriever';

export class JobAnalysisGraph {

    
    constructor(
        private readonly retriever: PostgresRetriever,
        private readonly model: ChatOpenAI
    ) {
        /*this.model = new ChatOpenAI({
            model: 'gpt-5.4-mini',
            apiKey: process.env.OPENAI_API_KEY
        });*/

        
    }

    create() {

        const graph = new StateGraph(JobAnalysisState)

            .addNode(
                'extractRequirements',
                async (state) => {

                    const prompt =
                        ChatPromptTemplate.fromMessages([
                            [
                                'system',
                                `
                                You are analyzing a software engineering job description.

                                Extract the concrete requirements that a candidate should be evaluated against.

                                Rules:
                                - Extract technologies, technical skills, architecture experience, AI experience, cloud/devops skills, professional experience, and communication requirements.
                                - Do not invent requirements that are not present in the job description.
                                - Keep requirements specific enough that they can later be searched against a professional resume.
                                - Avoid duplicate or semantically equivalent requirements.
                                - Classify each requirement by category.
                                - Determine importance from the wording of the job description:
                                - required: clearly expected or explicitly required.
                                - preferred: preferred, desired, or nice-to-have.
                                - valuable: explicitly described as valuable but not mandatory.

                                IMPORTANT FOR ROLE/TITLE REQUIREMENTS:

                                - Evaluate demonstrated responsibilities and capabilities, not only exact job titles.
                                - Do not require the resume to contain the exact requested title.
                                - If the candidate has closely related responsibilities that substantially overlap with the role, classify as PARTIAL.
                                - Use STRONG only when the resume clearly demonstrates the majority of the requested responsibilities.
                                - Use GAP when the relevant responsibilities or capabilities are not demonstrated.
                                `
                            ],
                            [
                                'human',
                                `
                                JOB DESCRIPTION:

                                {jobDescription}
                                `
                            ]
                        ]);

                    const structuredModel =
                        this.model.withStructuredOutput(
                            ExtractedRequirementsSchema
                        );

                    const chain =
                        prompt.pipe(structuredModel);

                    const result =
                        await chain.invoke({
                            jobDescription:
                                state.jobDescription
                        });

                    return {
                        requirements:
                            result.requirements
                    };
                }
            )

            .addNode(
                'retrieveEvidence',
                async (state) => {

                    const evidence: RequirementEvidence[] = [];

                    for (const requirement of state.requirements) {

                        const searchQuery =
                            `What professional experience does Ramon have that demonstrates this requirement: ${requirement.requirement}?`;

                        const documents =
                            await this.retriever.invoke(
                                searchQuery
                            );

                        evidence.push({
                            requirement: requirement.requirement,

                            evidence: documents.map(document => ({
                                content: document.pageContent,
                                filename: document.metadata.filename,
                                chunkIndex: document.metadata.chunkIndex,
                                distance: document.metadata.distance
                            }))
                        });
                    }

                    return {
                        evidence
                    };
                }
            )

            .addNode(
                'evaluateRequirements',
                async (state) => {

                    const evaluations: RequirementEvaluation[] = [];

                    const structuredModel =
                        this.model.withStructuredOutput(
                            RequirementEvaluationSchema
                        );

                    const prompt =
                        ChatPromptTemplate.fromMessages([
                            [
                                'system',
                                `
                    You are evaluating whether a candidate's resume provides evidence for a specific job requirement.

                    Use ONLY the provided resume evidence.

                    Evaluation rules:

                    STRONG:
                    - The resume explicitly demonstrates direct hands-on experience with the requirement.
                    - The technology, responsibility, or capability is clearly used in professional work or projects.

                    PARTIAL:
                    - The resume provides related or transferable experience, but does not fully demonstrate the exact requirement.
                    - The evidence is relevant but incomplete.

                    GAP:
                    - The resume does not explicitly demonstrate the requirement.
                    - Semantic similarity alone is NOT evidence.
                    - Do not treat related technologies as proof of the requested technology.
                    - Do not infer experience that is not explicitly stated.

                    Important:
                    - If the retrieved documents do not mention or clearly demonstrate the requested requirement, classify it as GAP.
                    - Be conservative.
                    - Do not invent experience.
                    - Evidence must contain short factual statements supported directly by the resume.
                                `
                            ],
                            [
                                'human',
                                `
                    JOB REQUIREMENT:

                    {requirement}

                    IMPORTANCE:

                    {importance}

                    RESUME EVIDENCE:

                    {evidence}
                                `
                            ]
                        ]);

                    const chain =
                        prompt.pipe(structuredModel);

                    for (const requirement of state.requirements) {

                        const requirementEvidence =
                            state.evidence.find(
                                item =>
                                    item.requirement ===
                                    requirement.requirement
                            );

                        const context =
                            requirementEvidence?.evidence
                                .map((item, index) =>
                                    `[Source ${index + 1}]
                                    ${item.content}`
                                )
                                .join('\n\n') ?? '';

                        const evaluation =
                            await chain.invoke({
                                requirement:
                                    requirement.requirement,

                                importance:
                                    requirement.importance,

                                evidence:
                                    context
                            });

                        evaluations.push({
                            ...evaluation,
                            requirement:
                                requirement.requirement,
                            importance:
                                requirement.importance
                        });
                    }

                    return {
                        evaluations
                    };
                }
            )

            .addNode(
                'generateAnswer',
                async (state) => {

                    return {
                        answer:
                            `Extracted ${state.requirements.length} job requirements.`
                    };
                }
            )

            .addEdge(
                START,
                'extractRequirements'
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
                'generateAnswer'
            )

            .addEdge(
                'generateAnswer',
                END
            );

        return graph.compile();
    }
}