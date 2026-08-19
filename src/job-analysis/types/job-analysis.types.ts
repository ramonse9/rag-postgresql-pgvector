export type RequirementImportance =
    | 'required'
    | 'preferred'
    | 'valuable';

export type MatchLevel =
    | 'strong'
    | 'partial'
    | 'gap';

export interface JobRequirement {
    requirement: string;
    category: string;
    importance: RequirementImportance;
}

export interface ResumeEvidence {
    content: string;
    filename: string;
    chunkIndex: number;
    distance: number;
}

export interface RequirementEvidence {
    requirement: string;
    evidence: ResumeEvidence[];
}

export interface RequirementEvaluation {
    requirement: string;
    importance: RequirementImportance;

    match: MatchLevel;

    explanation: string;

    evidence: string[];
}

import { z } from 'zod';

export const JobRequirementSchema = z.object({
    requirement: z.string().describe(
        'A specific skill, technology, experience, responsibility, or qualification requested by the job'
    ),

    category: z.enum([
        'frontend',
        'backend',
        'language',
        'database',
        'cloud',
        'ai',
        'architecture',
        'devops',
        'communication',
        'experience',
        'other'
    ]),

    importance: z.enum([
        'required',
        'preferred',
        'valuable'
    ])
});

export const ExtractedRequirementsSchema = z.object({
    requirements: z.array(JobRequirementSchema)
});

export interface RequirementEvaluation {
    requirement: string;
    importance: RequirementImportance;
    match: MatchLevel;
    explanation: string;
    evidence: string[];
}

export const RequirementEvaluationSchema = z.object({
    requirement: z.string(),

    importance: z.enum([
        'required',
        'preferred',
        'valuable'
    ]),

    match: z.enum([
        'strong',
        'partial',
        'gap'
    ]),

    explanation: z.string(),

    evidence: z.array(z.string())
});

export const RequirementsEvaluationSchema = z.object({
    evaluations: z.array(
        RequirementEvaluationSchema
    )
});

export const AnalysisIntentSchema = z.object({

    intent: z.enum([
        'match',
        'gaps',
        'strengths',
        'interview'
    ])

});

export const MATCH_SCORE = {
    strong: 1,
    partial: 0.5,
    gap: 0
} as const;