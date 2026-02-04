import { Injectable } from '@angular/core';
import { FileAttachment } from '../core/types';
import { FILE_LIMITS, ERROR_MESSAGES } from '../core/constants';

@Injectable({
  providedIn: 'root'
})
export class FileService {

  validateFile(file: File): { valid: boolean; error?: string } {
    const isImage = FILE_LIMITS.SUPPORTED_IMAGE_TYPES.includes(file.type as any);
    const isPdf = FILE_LIMITS.SUPPORTED_PDF_TYPES.includes(file.type as any);

    if (!isImage && !isPdf) {
      return { valid: false, error: ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE };
    }

    const maxSize = isImage ? FILE_LIMITS.MAX_IMAGE_SIZE : FILE_LIMITS.MAX_PDF_SIZE;
    if (file.size > maxSize) {
      return { valid: false, error: ERROR_MESSAGES.FILE_TOO_LARGE };
    }

    return { valid: true };
  }

  async processFile(file: File): Promise<FileAttachment> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const isImage = FILE_LIMITS.SUPPORTED_IMAGE_TYPES.includes(file.type as any);
    const base64 = await this.fileToBase64(file);

    const attachment: FileAttachment = {
      id: this.generateId(),
      type: isImage ? 'image' : 'pdf',
      mimeType: file.type,
      name: file.name,
      size: file.size,
      data: base64
    };

    if (isImage) {
      attachment.thumbnail = await this.generateThumbnail(file);
    }

    return attachment;
  }

  async generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 100;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  getAcceptedTypes(): string {
    return [...FILE_LIMITS.SUPPORTED_IMAGE_TYPES, ...FILE_LIMITS.SUPPORTED_PDF_TYPES].join(',');
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private generateId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getAttachmentPlaceholder(attachment: FileAttachment): string {
    return attachment.type === 'image'
      ? `[Image: ${attachment.name}]`
      : `[PDF: ${attachment.name}]`;
  }
}
