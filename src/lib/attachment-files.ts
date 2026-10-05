export type AttachmentItem = {
  title?: string;
  text?: string;
  link?: string;
  file?: string;
};

export function resolveAttachments(
  attachments: AttachmentItem[] | undefined,
): AttachmentItem[] {
  return attachments ?? [];
}
