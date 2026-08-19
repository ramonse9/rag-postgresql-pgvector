import {
    StateSchema
} from '@langchain/langgraph';

import { z } from 'zod';

export const JobRequirementSchema = z.object({
    requirement: z.string(),
    category: z.string(),
    importance: z.enum([
        'required',
        'preferred',
        'valuable'
    ])
});

export const RequirementEvidenceSchema = z.object({
    requirement: z.string(),

    evidence: z.array(
        z.object({
            content: z.string(),
            filename: z.string(),
            chunkIndex: z.number(),
            distance: z.number()
        })
    )
});

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

    evidence: z.array(
        z.string()
    )
});

export const AnalysisIntentSchema = z.enum([
    'match',
    'gaps',
    'strengths',
    'interview'
]);

export const JobAnalysisStateSchema = z.object({

    jobDescription: z.string(),

    question: z.string(),

    requirements: z
        .array(JobRequirementSchema)
        .default([]),

    evidence: z
        .array(RequirementEvidenceSchema)
        .default([]),

    evaluations: z
        .array(RequirementEvaluationSchema)
        .default([]),

    intent: AnalysisIntentSchema.optional(),

    answer: z
        .string()
        .default('')
});

export type JobAnalysisStateType =
    z.infer<typeof JobAnalysisStateSchema>;

export const JobAnalysisState =
    new StateSchema(
        JobAnalysisStateSchema.shape
    );