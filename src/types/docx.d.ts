declare module 'docx' {
  interface DocumentOptions {
    title?: string;
    sections: Array<{
      properties?: {
        page?: {
          margin?: {
            top?: number;
            right?: number;
            bottom?: number;
            left?: number;
          };
        };
      };
      children: Array<Paragraph>;
    }>;
  }

  export class Document {
    constructor(options: DocumentOptions);
  }

  export class Packer {
    static toBlob(doc: Document): Promise<Blob>;
  }

  interface ParagraphOptions {
    children: Array<TextRun>;
    spacing?: {
      line?: number;
      before?: number;
      after?: number;
    };
    alignment?: string;
  }

  export class Paragraph {
    constructor(options: ParagraphOptions);
  }

  interface TextRunOptions {
    text: string;
    size?: number;
    bold?: boolean;
  }

  export class TextRun {
    constructor(options: TextRunOptions);
  }

  export function convertInchesToTwip(inches: number): number;

  export const AlignmentType: {
    LEFT: string;
    CENTER: string;
    RIGHT: string;
    JUSTIFIED: string;
  };
}
