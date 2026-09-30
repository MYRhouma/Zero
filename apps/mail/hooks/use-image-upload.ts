import { useTRPC } from '@/providers/query-provider';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

const MAX_BYTES = 10 * 1024 * 1024;

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('The picture could not be read.'));
    reader.readAsDataURL(file);
  });

/** Upload a picture and get a permanent public address usable in emails. */
export function useImageUpload() {
  const trpc = useTRPC();
  const { mutateAsync, isPending } = useMutation(trpc.workspaceTemplates.uploadImage.mutationOptions());

  const upload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) throw new Error('Choose a picture (JPG, PNG, WebP, GIF or AVIF).');
      if (file.size > MAX_BYTES) throw new Error('Pictures must be smaller than 10 MB.');
      const { url } = await mutateAsync({ filename: file.name, data: await toBase64(file) });
      return url;
    },
    [mutateAsync],
  );

  return { upload, isUploading: isPending };
}
