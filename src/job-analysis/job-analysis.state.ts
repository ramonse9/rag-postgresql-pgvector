import {
    StateSchema
} from '@langchain/langgraph';

import { z } from 'zod';

export const JobAnalysisState = new StateSchema({

    jobDescription: z.string(),

    question: z.string(),

    requirements: z.array(
        z.object({
            requirement: z.string(),
            category: z.string(),
            importance: z.enum([
                'required',
                'preferred',
                'valuable'
            ])
        })
    ).default([]),

    evidence: z.array(
        z.object({
            requirement: z.string(),
            evidence: z.array(
                z.object({
                    content: z.string(),
                    filename: z.string(),
                    chunkIndex: z.number(),
                    distance: z.number()
                })
            )
        })
    ).default([]),

    evaluations: z.array(
        z.object({
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
        })
    ).default([]),

    answer: z.string().default('')

});