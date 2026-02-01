
export type FontType = 'Helvetica' | 'Times-Roman' | 'Courier';

export interface TextOverlay {
  id: string;
  pageNumber: number;
  text: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  fontSize: number;
  fontFamily: FontType;
  color: string;
  isNew?: boolean; // Flag to trigger immediate edit mode on creation
}

export interface PdfDocumentInfo {
  name: string;
  url: string;
  numPages: number;
  bytes: Uint8Array;
}
