export const FILE_UPLOADED_ROUTING_KEY = 'files.uploaded';

export type FileUploadedEvent = {
  fileId: string;
  status: 'UPLOADED';
};
