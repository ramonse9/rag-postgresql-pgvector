import { Injectable } from '@nestjs/common';

export interface Chunk {
    index: number;
    content: string;
    start: number;
    end: number;
}

@Injectable()
export class ChunkingService {

    private readonly chunkSize = 1000;
    private readonly chunkOverlap = 200;

    split(text: string): Chunk[] {

        const chunks: Chunk[] = [];

        let start = 0;
        let index = 0;

        while (start < text.length) {

            const maxEnd = Math.min(
                start + this.chunkSize,
                text.length,
            );

            const end = this.findBestCutPosition(
                text,
                start,
                maxEnd,
            );

            const content = text
                .slice(start, end)
                .trim();

            if (content) {
                chunks.push({
                    index,
                    content,
                    start,
                    end,
                });

                index++;
            }

            if (end >= text.length) {
                break;
            }

            const desiredStart =
                end - this.chunkOverlap;

            start = this.findOverlapStart(
                text,
                desiredStart,
            );
        }

        return chunks;
    }

    private findBestCutPosition(
        text: string,
        start: number,
        maxEnd: number,
    ): number {

        if (maxEnd >= text.length) {
            return text.length;
        }

        const searchWindow = 200;

        const searchStart = Math.max(
            start,
            maxEnd - searchWindow,
        );

        // Prefer a line break
        const lastNewLine = text.lastIndexOf(
            '\n',
            maxEnd,
        );

        if (lastNewLine >= searchStart) {
            return lastNewLine;
        }

        // Otherwise prefer a space
        const lastSpace = text.lastIndexOf(
            ' ',
            maxEnd,
        );

        if (lastSpace >= searchStart) {
            return lastSpace;
        }

        // Fallback: hard cut
        return maxEnd;
    }

    private findOverlapStart(
        text: string,
        desiredStart: number,
    ): number {

        if (desiredStart <= 0) {
            return 0;
        }

        if (desiredStart >= text.length) {
            return text.length;
        }

        // If we're already at whitespace, move to
        // the next non-whitespace character.
        if (/\s/.test(text[desiredStart])) {
            return desiredStart + 1;
        }

        // Search backwards for a word boundary.
        for (let i = desiredStart; i >= 0; i--) {

            if (/\s/.test(text[i])) {
                return i + 1;
            }
        }

        return desiredStart;
    }
}
