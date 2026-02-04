export interface FileAttachment {
  id: string;
  type: 'image' | 'pdf';
  mimeType: string;
  name: string;
  size: number;
  data: string;  // base64
  thumbnail?: string;
}

export interface Message {
  text: string;
  isUser: boolean;
  date: Date;
  attachments?: FileAttachment[];
}
