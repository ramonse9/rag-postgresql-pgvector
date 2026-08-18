import { Module } from '@nestjs/common';
import { JobAnalysisController } from './job-analysis.controller';
import { JobAnalysisService } from './job-analysis.service';
import { DocumentsModule } from 'src/documents/documents.module';

@Module({
  imports: [DocumentsModule],
  controllers: [JobAnalysisController],
  providers: [JobAnalysisService]
})
export class JobAnalysisModule {}
