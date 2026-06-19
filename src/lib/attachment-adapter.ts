import type { AttachmentAdapter, PendingAttachment, CompleteAttachment } from "@assistant-ui/core";

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

const ACCEPTED_EXTENSIONS = [".csv", ".tsv", ".geojson", ".json", ".txt", ".xml"];

export class EcoQAttachmentAdapter implements AttachmentAdapter {
  accept = ACCEPTED_EXTENSIONS.join(",");

  async *add({ file }: { file: File }): AsyncGenerator<PendingAttachment, void> {
    const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const isImage = file.type.startsWith("image/");

    if (isImage) {
      yield {
        id,
        type: "file",
        name: file.name,
        contentType: file.type || undefined,
        file,
        status: { type: "incomplete", reason: "error" },
      };
      return;
    }

    yield {
      id,
      type: "file",
      name: file.name,
      contentType: file.type || undefined,
      file,
      status: { type: "running", reason: "uploading", progress: 0 },
    };

    yield {
      id,
      type: "file",
      name: file.name,
      contentType: file.type || undefined,
      file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  async remove(): Promise<void> {}

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    const { file, id, name, contentType } = attachment;
    if (!file) {
      throw new Error("Missing file for attachment");
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
