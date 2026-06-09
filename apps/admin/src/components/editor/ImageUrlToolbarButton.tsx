'use client';

import * as React from 'react';

import { ImageIcon, LinkIcon } from 'lucide-react';
import { isUrl, KEYS } from 'platejs';
import { useEditorRef } from 'platejs/react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { ToolbarButton } from '@/components/ui/toolbar';

export function ImageUrlToolbarButton() {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <>
      <ToolbarButton tooltip="Insert image by URL" onClick={() => setDialogOpen(true)}>
        <ImageIcon className="size-4" />
      </ToolbarButton>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="gap-6">
          <ImageUrlDialog onClose={() => setDialogOpen(false)} />
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ImageUrlDialog({ onClose }: { onClose: () => void }) {
  const editor = useEditorRef();
  const [url, setUrl] = React.useState('');

  const insertImage = React.useCallback(() => {
    if (!isUrl(url)) {
      toast.error('Enter a valid image URL');
      return;
    }

    onClose();
    editor.tf.insertNodes({
      children: [{ text: '' }],
      type: KEYS.img,
      url,
    });
  }, [url, editor, onClose]);

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <LinkIcon className="size-4" />
          Insert image URL
        </AlertDialogTitle>
      </AlertDialogHeader>

      <AlertDialogDescription asChild>
        <div className="space-y-2">
          <label htmlFor="rich-text-image-url" className="text-sm font-medium text-foreground">
            Image URL
          </label>
          <Input
            id="rich-text-image-url"
            className="w-full"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') insertImage();
            }}
            placeholder="https://example.com/photo.jpg"
            type="url"
            autoFocus
          />
        </div>
      </AlertDialogDescription>

      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={e => {
            e.preventDefault();
            insertImage();
          }}
        >
          Insert
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
