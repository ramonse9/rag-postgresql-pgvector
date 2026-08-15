import { Injectable } from '@nestjs/common';
import { PDFParse} from 'pdf-parse';

@Injectable()
export class PdfService {
    async extractText(buffer: Buffer): Promise<string>{
        //const data = await pdf(buffer)
        const parser = new PDFParse({
            data: buffer
        })

        try{
            const result = await parser.getText()

            return result.text;

        }finally{

            await parser.destroy()

        }

    }
}
