import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Document } from './entities/document.entity';
import { DocumentChunk } from './entities/document-chunk.entity';
import { DocumentsService } from './documents.service';
import { PdfService } from './pdf.service';
import { ChunkingService } from './chunking.service';
import { DocumentsController } from './documents.controller';
import { OpenaiModule } from '../openai/openai.module';
import { TextCleaningService } from './text-cleaning.service';
import { LangchainDocumentsService } from './langchain-documents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      DocumentChunk,
    ]),
    OpenaiModule
  ],
  providers: [
    DocumentsService, 
    PdfService, 
    ChunkingService, 
    TextCleaningService, 
    LangchainDocumentsService,
  ],
  controllers: [
    DocumentsController
  ],
  exports: [
    DocumentsService
  ]
})
export class DocumentsModule {}