import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const DEFAULT_UPLOADS_DIR_PROD = "/data/uploads";
const DEFAULT_UPLOADS_DIR_DEV = "./uploads";

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
] as const;

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export const MIME_TO_EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heif",
};

function getUploadsRoot(): string {
  const fromEnv = process.env.UPLOADS_DIR?.trim();
  if (fromEnv) return resolve(fromEnv);
  const fallback =
    process.env.NODE_ENV === "production"
      ? DEFAULT_UPLOADS_DIR_PROD
      : DEFAULT_UPLOADS_DIR_DEV;
  return resolve(fallback);
}

function buildRelativePath(userId: string, docId: string, ext: string): string {
  return join("documents", userId, `${docId}.${ext}`);
}

export async function saveDocumentFile(
  userId: string,
  docId: string,
  ext: string,
  buffer: Buffer
): Promise<string> {
  const relativePath = buildRelativePath(userId, docId, ext);
  const absolutePath = join(getUploadsRoot(), relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return relativePath;
}

export async function readDocumentFile(relativePath: string): Promise<Buffer> {
  const absolutePath = resolveStoragePath(relativePath);
  return readFile(absolutePath);
}

export async function deleteDocumentFile(relativePath: string): Promise<void> {
  const absolutePath = resolveStoragePath(relativePath);
  await unlink(absolutePath);
}

function resolveStoragePath(relativePath: string): string {
  const root = getUploadsRoot();
  const absolute = resolve(join(root, relativePath));
  if (!absolute.startsWith(root)) {
    throw new Error("Invalid storage path");
  }
  return absolute;
}

export function getExtensionForMime(mime: string): string | null {
  return MIME_TO_EXTENSION[mime] ?? null;
}

export function isAllowedMime(mime: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}
