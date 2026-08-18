import {
    Body,
    Controller,
    Post
} from '@nestjs/common';

import { JobAnalysisService } from './job-analysis.service';

@Controller('job-analysis')
export class JobAnalysisController {

    constructor(
        private readonly jobAnalysisService:
            JobAnalysisService
    ) {}

    @Post('analyze')
    analyze(
        @Body()
        body: {
            jobDescription: string;
            question: string;
        }
    ) {

        return this.jobAnalysisService.analyze(
            body.jobDescription,
            body.question
        );

    }

}