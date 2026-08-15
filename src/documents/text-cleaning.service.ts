import { Injectable } from '@nestjs/common';

@Injectable()
export class TextCleaningService {
    
    clean( text: string): string{
        
        return text
            // Remove PDF page markers
            .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')

            // Normalize line endings
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')

            // Remove excessive spaces at the end of lines
            .replace(/[ \t]+\n/g, '\n')

            // Avoid excessive empty lines
            .replace(/\n{3,}/g, '\n\n')

            .trim();

    }
}
