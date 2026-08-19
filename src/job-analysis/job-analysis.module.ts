import { Module } from '@nestjs/common';
import { JobAnalysisController } from './job-analysis.controller';
import { JobAnalysisService } from './job-analysis.service';
import { DocumentsModule } from '../documents/documents.module';
import { JobAnalysisNodesService } from './job-analysis-nodes.service';
import { JobAnalysisGraph } from './job-analysis.graph';

@Module({
  imports: [DocumentsModule],
  controllers: [JobAnalysisController],
  providers: [
    JobAnalysisService, 
    JobAnalysisGraph, 
    JobAnalysisNodesService
  ]
})
export class JobAnalysisModule {}
