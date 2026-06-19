import type { AttachmentAdapter, PendingAttachment, CompleteAttachment } from "@assistant-ui/core";

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export class EcoQAttachmentAdapter implements AttachmentAdapter {
  accept = "image/*,.csv,.geojson,.json,.txt";

  async *add({ file }: { file: File }): AsyncGenerator<PendingAttachment, void> {
    const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const isImage = file.type.startsWith("image/");

    yield {
      id,
      type: isImage ? "image" : "file",
      name: file.name,
      contentType: file.type || undefined,
      file,
      status: { type: "running", reason: "uploading", progress: 0 },
    };

    yield {
      id,
      type: isImage ? "image" : "file",
      name: file.name,
      contentType: file.type || undefined,
      file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  async remove(): Promise<void> {
    // Client-side only; nothing to clean up
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    const { file, id, name, contentType, type } = attachment;
    if (!file) {
      throw new Error("Missing file for attachment");
    }

    const isImage = file.type.startsWith("image/") || type === "image";

    if (isImage) {
      const dataUrl = await readFileAsDataURL(file);
      return {
        id,
        type: "image",
        name,
        contentType,
        status: { type: "complete" },
        content: [{ type: "image", image: dataUrl, filename: name }],
      };
    }

    const text = await readFileAsText(file);
    return {
      id,
      type: "file",
      name,
      contentType,
      status: { type: "complete" },
      content: [
        {
          type: "file",
          filename: name,
          data: text,
          mimeType: file.type || "text/plain",
        },
      ],
    };
  }
}
