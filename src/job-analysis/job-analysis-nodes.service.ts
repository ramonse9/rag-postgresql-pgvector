import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import { PostgresRetriever } from '../documents/retrievers/postgres.retriever';
import { AnalysisIntentSchema, ExtractedRequirementsSchema, MATCH_SCORE, RequirementEvaluation, RequirementEvaluationSchema, RequirementEvidence } from './types/job-analysis.types';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { JobAnalysisStateType } from './job-analysis.state';
import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class JobAnalysisNodesService {

    private readonly retriever: PostgresRetriever;
    private readonly model: ChatOpenAI

    constructor(
        private readonly documentsService: DocumentsService
    ) {

        this.retriever = new PostgresRetriever(
            this.documentsService,
            4
        );
        
        this.model = new ChatOpenAI({
            model: 'gpt-5.4-mini',
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async extractRequirements(
        state: JobAnalysisStateType
    ){
        const prompt = ChatPromptTemplate.fromMessages([
    [
        'system',
        `
        You are analyzing a software engineering job description.

        Extract the concrete requirements that a candidate should be evaluated against.

        Rules:
        - Extract technologies, technical skills, architecture experience, AI experience, cloud/devops skills, professional experience, and communication requirements.
        - Use ONLY requirements explicitly stated or clearly required by the job description.
        - Do not invent requirements.
        - Keep each requirement atomic: one skill, capability, responsibility, or qualification per requirement.
        - Do not combine multiple independent requirements into a single requirement.
        - Avoid duplicate or semantically equivalent requirements.
        - Normalize technology names to their commonly used names, for example:
            - React
            - TypeScript
            - Python
            - RAG
            - LangChain
            - LangGraph
        - Phrase requirements consistently and concisely.
        - Keep requirements specific enough that they can later be searched against a professional resume.

        ROLE AND SENIORITY RULES:
        - A job title alone is not automatically a separate requirement.
        - Extract seniority, architecture, leadership, or ownership as requirements only when the job description explicitly expects those capabilities.
        - Evaluate responsibilities and capabilities separately from exact job titles.
        - Avoid combining seniority, architecture, and a technology into one requirement unless the job description explicitly requires that exact combination.

        CATEGORY:
        Classify each requirement as one of the supported categories.

        IMPORTANCE:
        Determine importance only from the wording of the job description:
        - required: clearly expected, mandatory, or presented as a core requirement.
        - preferred: preferred, desired, or nice-to-have.
        - valuable: explicitly described as valuable or beneficial but not mandatory.

        Do not promote a preferred or valuable skill to required.
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

    async retrieveEvidence(
        state: JobAnalysisStateType
    ){
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
                    distance: Number(document.metadata.distance)
                }))
            });
        }

        return {
            evidence
        };
    }

    async evaluateRequirements(
        state: JobAnalysisStateType
    ){
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
        - The technology, responsibility, or capability is explicitly demonstrated through concrete professional experience or a clearly described project in the provided resume evidence.

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
        
        IMPORTANT FOR ROLE/TITLE REQUIREMENTS:

        - Evaluate demonstrated responsibilities and capabilities, not only exact job titles.
        - Do not require the resume to contain the exact requested title.
        - If the candidate has closely related responsibilities that substantially overlap with the role, classify as PARTIAL.
        - Use STRONG only when the resume clearly demonstrates the majority of the requested responsibilities.
        - These role/title rules apply to responsibilities, seniority, leadership, and architecture requirements.
        - They do NOT apply to exact technology requirements such as React, Python, LangChain, or LangGraph.
        - Use GAP when the relevant responsibilities or capabilities are not demonstrated.

        EVIDENCE QUALITY:
        - Retrieved documents are search candidates, not automatically valid evidence.
        - Ignore retrieved passages that do not materially support the requirement.
        - The fact that a passage was retrieved must never influence the match classification by itself.
        - Evidence returned in the structured result must directly support the explanation.
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

    async classifyIntent(
        state: JobAnalysisStateType
    ){
    
        const prompt =
            ChatPromptTemplate.fromMessages([
                [
                    'system',
                    `
        You are classifying a user's question about a job analysis.

        Classify the question into exactly one intent:

        MATCH
        - Questions about overall fit or how strong the candidate matches the job.
        - Examples:
        "How strong is my match?"
        "Am I a good fit for this position?"
        "How well do I meet the requirements?"

        GAPS
        - Questions about missing requirements, weaknesses, or what the candidate lacks.
        - Examples:
        "What am I missing?"
        "What requirements do I not meet?"
        "What should I learn?"

        STRENGTHS
        - Questions about the candidate's strongest qualifications for the job.
        - Examples:
        "What are my strongest points?"
        "What makes me a good candidate?"
        "Which requirements do I match best?"

        INTERVIEW
        - Questions about preparing for an interview for this job.
        - Examples:
        "What should I prepare for the interview?"
        "What might they ask me?"
        "What should I emphasize during the interview?"

        - Classify based on the user's primary intent when a question could fit more than one category.

        Return only the structured classification.
                    `
                ],
                [
                    'human',
                    `
        USER QUESTION:

        {question}
                    `
                ]
            ]);

        const structuredModel =
            this.model.withStructuredOutput(
                AnalysisIntentSchema
            );

        const chain =
            prompt.pipe(structuredModel);

        const result =
            await chain.invoke({
                question: state.question
            });

        return {
            intent: result.intent
        };
    }

    async generateMatchAnswer(
        state: JobAnalysisStateType
    ){

        const evaluations = state.evaluations;

        const totalScore = evaluations.reduce(
            (sum, evaluation) =>
                sum + MATCH_SCORE[evaluation.match],
            0
        );

        const score = evaluations.length
            ? Math.round(
                (totalScore / evaluations.length) * 100
            )
            : 0;

        const strongMatches = evaluations.filter(
            evaluation => evaluation.match === 'strong'
        );

        const partialMatches = evaluations.filter(
            evaluation => evaluation.match === 'partial'
        );

        const gaps = evaluations.filter(
            evaluation => evaluation.match === 'gap'
        );

        const prompt =
            ChatPromptTemplate.fromMessages([
                [
                    'system',
                    `
        You are a career analysis assistant.

        The candidate's resume has already been evaluated against a job description.

        Your task is to explain the candidate's overall match for the position.

        IMPORTANT:
        - The match score has already been calculated deterministically.
        - Do NOT modify, recalculate, reinterpret, or invent a different score.
        - Do NOT assign qualitative labels such as "weak", "moderate", "good", "strong", or "excellent" to the numeric score.
        - State the calculated score exactly as provided.
        - Use ONLY the provided evaluations.
        - Clearly explain the strongest matches, partial matches, and most important gaps.
        - Prioritize REQUIRED requirements.
        - Do not invent experience or qualifications.
        - Do not claim that related technologies satisfy an exact requirement unless the evaluation says so.
        - Answer in the same language as the user's QUESTION.
        - Be concise, professional, and specific.
        - Do not offer follow-up actions.
        - Do not imply that the numeric score represents hiring probability or the probability of getting the job.
        - Treat the score only as a resume-to-requirements alignment score.
        - Do not interpret it as hiring probability, interview probability, or candidate quality.
                    `
                ],
                [
                    'human',
                    `
        QUESTION:

        {question}

        MATCH SCORE:

        {score}%

        STRONG MATCHES:

        {strongMatches}

        PARTIAL MATCHES:

        {partialMatches}

        GAPS:

        {gaps}
                    `
                ]
            ]);

        const chain = prompt
            .pipe(this.model)
            .pipe(new StringOutputParser());

        const answer =
            await chain.invoke({
                question: state.question,

                score,

                strongMatches: JSON.stringify(
                    strongMatches,
                    null,
                    2
                ),

                partialMatches: JSON.stringify(
                    partialMatches,
                    null,
                    2
                ),

                gaps: JSON.stringify(
                    gaps,
                    null,
                    2
                )
            });

        return {
            answer
        };
    }

    async generateGapsAnswer( 
        state: JobAnalysisStateType
    ){

        const gaps = state.evaluations.filter(
            evaluation =>
                evaluation.match === 'gap' ||
                evaluation.match === 'partial'
        );

        const prompt =
            ChatPromptTemplate.fromMessages([
                [
                    'system',
                    `
        You are a career analysis assistant.

        The candidate's resume has already been evaluated against a job description.

        Your task is to answer specifically what the candidate is missing or only partially satisfies for this position.

        Use ONLY the provided evaluations.

        Rules:
        - Focus on GAP and PARTIAL requirements.
        - Do not invent experience or qualifications.
        - Clearly distinguish between:
        - GAP: the resume does not demonstrate the requirement.
        - PARTIAL: the resume shows related or transferable experience but does not fully demonstrate the requirement.
        - Prioritize REQUIRED requirements before preferred or valuable ones.
        - Explain the most important gaps clearly and concisely.
        - When useful, mention related experience the candidate already has, but do not present it as satisfying the missing requirement.
        - Answer in the same language as the user's QUESTION.
        - Do not discuss strong matches unless they help explain a partial match.
        - Do not offer follow-up actions.
        - Do not recommend learning technologies unless the user's question explicitly asks what they should learn or improve.
                    `
                ],
                [
                    'human',
                    `
        QUESTION:

        {question}

        GAPS AND PARTIAL MATCHES:

        {evaluations}
                    `
                ]
            ]);

        const chain = prompt
            .pipe(this.model)
            .pipe(new StringOutputParser());

        const answer =
            await chain.invoke({
                question: state.question,
                evaluations: JSON.stringify(
                    gaps,
                    null,
                    2
                )
            });

        return {
            answer
        };
    }

    async generateStrengthsAnswer(
        state: JobAnalysisStateType
    ){

        const strengths = state.evaluations.filter(
            evaluation =>
                evaluation.match === 'strong'
        );

        const prompt =
            ChatPromptTemplate.fromMessages([
                [
                    'system',
                    `
        You are a career analysis assistant.

        The candidate's resume has already been evaluated against a job description.

        Your task is to explain the candidate's strongest qualifications for this specific position.

        Use ONLY the provided evaluations.

        Rules:
        - Focus primarily on STRONG matches.
        - Prioritize REQUIRED requirements.
        - Explain why each strength is relevant to the position.
        - Use the factual evidence provided in the evaluations.
        - Do not invent experience or qualifications.
        - Do not present GAP requirements as strengths.
        - Do not exaggerate transferable skills.
        - Answer in the same language as the user's QUESTION.
        - Be concise, professional, and specific.
        - Do not offer follow-up actions.
        - If there are no STRONG matches, state that no direct strong matches were identified instead of promoting PARTIAL matches to strengths.
                    `
                ],
                [
                    'human',
                    `
        QUESTION:

        {question}

        STRONG MATCHES:

        {evaluations}
                    `
                ]
            ]);

        const chain = prompt
            .pipe(this.model)
            .pipe(new StringOutputParser());

        const answer =
            await chain.invoke({
                question: state.question,
                evaluations: JSON.stringify(
                    strengths,
                    null,
                    2
                )
            });

        return {
            answer
        };
    }

    async generateInterviewAnswer(
        state: JobAnalysisStateType
    ){

        const strongMatches = state.evaluations.filter(
            evaluation => evaluation.match === 'strong'
        );

        const partialMatches = state.evaluations.filter(
            evaluation => evaluation.match === 'partial'
        );

        const gaps = state.evaluations.filter(
            evaluation => evaluation.match === 'gap'
        );

        const prompt =
            ChatPromptTemplate.fromMessages([
                [
                    'system',
                    `
        You are a career interview preparation assistant.

        The candidate's resume has already been evaluated against a job description.

        Your task is to help the candidate prepare for an interview for this specific position.

        Use ONLY the provided evaluations.

        IMPORTANT:
        - Do not invent experience, technologies, projects, or qualifications.
        - Do not tell the candidate to claim experience that is not supported by the evaluations.
        - Clearly distinguish between direct experience, transferable experience, and gaps.
        - Prioritize REQUIRED requirements.
        - Focus on practical interview preparation.
        - Do not introduce interview topics that are unrelated to the job requirements or the candidate evaluations.
        - Base likely interview topics on the job requirements and the provided evaluations.

        Structure the answer around:

        1. What the candidate should emphasize
        - Use STRONG matches.
        - Explain which concrete experience should be highlighted.

        2. What the interviewer may challenge
        - Use GAP and PARTIAL requirements.
        - Identify likely areas where the candidate may be questioned.

        3. How to address gaps honestly
        - Never suggest pretending to have experience.
        - For PARTIAL matches, explain the transferable experience that can be discussed.
        - For GAP matches, clearly state that the candidate should acknowledge the gap and connect it only to genuinely related experience when appropriate.

        4. Likely interview topics
        - Suggest specific technical or architectural topics that are directly supported by the evaluations and relevant to the role.

        LANGUAGE:
        - Answer in the same language as the user's QUESTION.

        STYLE:
        - Be concise, practical, professional, and specific.
        - Do not offer follow-up actions.
                    `
                ],
                [
                    'human',
                    `
        QUESTION:

        {question}

        STRONG MATCHES:

        {strongMatches}

        PARTIAL MATCHES:

        {partialMatches}

        GAPS:

        {gaps}
                    `
                ]
            ]);

        const chain = prompt
            .pipe(this.model)
            .pipe(new StringOutputParser());

        const answer = await chain.invoke({
            question: state.question,

            strongMatches: JSON.stringify(
                strongMatches,
                null,
                2
            ),

            partialMatches: JSON.stringify(
                partialMatches,
                null,
                2
            ),

            gaps: JSON.stringify(
                gaps,
                null,
                2
            )
        });

        return {
            answer
        };
    }
    
}
