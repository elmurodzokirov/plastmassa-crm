import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, basename, join } from 'path';
import { BadRequestException } from '@nestjs/common';

export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const PRODUCT_IMAGES_DIR = join(UPLOADS_ROOT, 'products');
export const PRODUCT_IMAGES_PUBLIC_PREFIX = '/api/uploads/products';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

type UploadedProductImage = {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
};

function sanitizeFilenamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function getSafeExtension(originalname?: string) {
  const ext = extname(originalname || '').toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
    return ext;
  }

  return '.jpg';
}

export function validateProductImage(file?: UploadedProductImage | null) {
  if (!file) {
    return;
  }

  if (!file.buffer?.length) {
    throw new BadRequestException('Rasm fayli bo\'sh');
  }

  if (!file.mimetype || !ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException(
      'Rasm faqat JPG, PNG yoki WEBP formatida bo\'lishi mumkin',
    );
  }
}

export async function saveProductImage(
  file: UploadedProductImage,
  productName: string,
): Promise<string> {
  validateProductImage(file);

  await fs.mkdir(PRODUCT_IMAGES_DIR, { recursive: true });

  const namePart = sanitizeFilenamePart(productName) || 'product';
  const filename = `${namePart}-${randomUUID()}${getSafeExtension(file.originalname)}`;
  const absolutePath = join(PRODUCT_IMAGES_DIR, filename);

  await fs.writeFile(absolutePath, file.buffer);

  return `${PRODUCT_IMAGES_PUBLIC_PREFIX}/${filename}`;
}

export async function deleteProductImage(imageUrl?: string | null) {
  if (!imageUrl || !imageUrl.startsWith(PRODUCT_IMAGES_PUBLIC_PREFIX)) {
    return;
  }

  const filename = basename(imageUrl);
  if (!filename) {
    return;
  }

  const absolutePath = join(PRODUCT_IMAGES_DIR, filename);
  await fs.unlink(absolutePath).catch(() => undefined);
}
