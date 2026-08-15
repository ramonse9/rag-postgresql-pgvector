import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { DocumentsService } from './documents.service';
import { PdfService } from './pdf.service';
import { SearchDocumentsDto } from './dto/search-documents.dto';
import { AskDocumentsDto } from './dto/ask-documents.dto';

@Controller('documents')
export class DocumentsController {


    constructor(
        private readonly documentsService: DocumentsService,
        private readonly pdfService: PdfService
    ){}

    @Post('ingest')
    @UseInterceptors(FileInterceptor('file'))
    async ingest(
        @UploadedFile() file: Express.Multer.File,
    ){

        if(!file){
            throw new BadRequestException('PDF file is required')
        }

        if(file.mimetype !== 'application/pdf'){
            throw new BadRequestException('Only PDF files are supported')
        }

        const text = await this.pdfService.extractText( file.buffer )

        if(!text.trim()){
            throw new BadRequestException(
                'Could not extract text from PDF'
            )
        }

        return this.documentsService.ingest(
            file.originalname,
            text
        )

    }

    @Post('search')
    async search(
        @Body() dto: SearchDocumentsDto
    ){

        return this.documentsService.search(
            dto.query,
            dto.topK
        )

    }

    @Post('ask')
    async ask(
        @Body() dto: AskDocumentsDto
    ){
        return this.documentsService.ask(
            dto.question,
            dto.topK
        )

    }
}
