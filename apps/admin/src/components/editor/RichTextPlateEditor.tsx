'use client';

import { useCallback, useEffect, useRef } from 'react';

import type { Value } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';
import { createStaticEditor, serializeHtml } from 'platejs/static';

import { ImageUrlToolbarButton } from '@/components/editor/ImageUrlToolbarButton';
import { RichTextEditorBaseKit } from '@/components/editor/rich-text-editor-base-kit';
import { RichTextEditorKit } from '@/components/editor/rich-text-editor-kit';
import { AlignToolbarButton } from '@/components/ui/align-toolbar-button';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { EditorStatic } from '@/components/ui/editor-static';
import { FixedToolbar } from '@/components/ui/fixed-toolbar';
import { FontColorToolbarButton } from '@/components/ui/font-color-toolbar-button';
import { FontSizeToolbarButton } from '@/components/ui/font-size-toolbar-button';
import {
  BulletedListToolbarButton,
  NumberedListToolbarButton,
} from '@/components/ui/list-toolbar-button';
import { MarkToolbarButton } from '@/components/ui/mark-toolbar-button';
import { ToolbarButton } from '@/components/ui/toolbar';
import { emptyEditorValue, isHtmlContent, plainTextToValue } from '@/lib/rich-text';
import { cn } from '@/lib/utils';

const SERIALIZE_DEBOUNCE_MS = 400;

type Props = {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
  className?: string;
};

async function valueToHtml(plateValue: Value): Promise<string> {
  const staticEditor = createStaticEditor({
    plugins: RichTextEditorBaseKit,
    value: plateValue,
  });

  return serializeHtml(staticEditor, {
    editorComponent: EditorStatic,
    props: { variant: 'none' },
  });
}

export default function RichTextPlateEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Write content…',
  minHeight = 'min-h-[420px]',
  readOnly = false,
  className,
}: Props) {
  const editor = usePlateEditor({
    plugins: RichTextEditorKit,
    value: emptyEditorValue,
  });

  const loadedSourceRef = useRef<string | null>(null);
  const lastSyncedHtmlRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serializeGenerationRef = useRef(0);

  const syncHtml = useCallback(
    async (plateValue: Value) => {
      const generation = ++serializeGenerationRef.current;

      try {
        const html = await valueToHtml(plateValue);
        if (generation !== serializeGenerationRef.current) return;
        lastSyncedHtmlRef.current = html;
        onChange(html);
      } catch (error) {
        console.error('Failed to serialize rich text to HTML', error);
      }
    },
    [onChange],
  );

  useEffect(() => {
    if (!editor) return;

    const source = value ?? '';
    if (lastSyncedHtmlRef.current === source) return;
    if (loadedSourceRef.current === source) return;

    loadedSourceRef.current = source;

    try {
      if (!source.trim()) {
        editor.tf.setValue(emptyEditorValue);
        return;
      }

      const slateValue = (
        isHtmlContent(source)
          ? editor.api.html.deserialize({ element: source })
          : plainTextToValue(source)
      ) as Value;

      editor.tf.setValue(slateValue);
    } catch (error) {
      console.error('Failed to deserialize rich text', error);
      editor.tf.setValue(plainTextToValue(source));
    }
  }, [editor, value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const scheduleSync = useCallback(
    (plateValue: Value) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void syncHtml(plateValue);
      }, SERIALIZE_DEBOUNCE_MS);
    },
    [syncHtml],
  );

  const handleBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void syncHtml(editor.children);
    onBlur?.();
  }, [editor, syncHtml, onBlur]);

  return (
    <div className={cn('rounded-md border border-input bg-background', className)}>
      <Plate
        editor={editor}
        onChange={({ value: plateValue }) => {
          scheduleSync(plateValue);
        }}
      >
        <FixedToolbar className="flex flex-wrap justify-start gap-1">
          <ToolbarButton onClick={() => editor.tf.h1?.toggle()} tooltip="Heading 1">
            H1
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.tf.h2?.toggle()} tooltip="Heading 2">
            H2
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.tf.h3?.toggle()} tooltip="Heading 3">
            H3
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.tf.blockquote?.toggle()} tooltip="Quote">
            Quote
          </ToolbarButton>
          <MarkToolbarButton nodeType="bold" tooltip="Bold">
            B
          </MarkToolbarButton>
          <MarkToolbarButton nodeType="italic" tooltip="Italic">
            I
          </MarkToolbarButton>
          <MarkToolbarButton nodeType="underline" tooltip="Underline">
            U
          </MarkToolbarButton>
          <MarkToolbarButton nodeType="strikethrough" tooltip="Strikethrough">
            S
          </MarkToolbarButton>
          <BulletedListToolbarButton />
          <NumberedListToolbarButton />
          <AlignToolbarButton />
          <FontSizeToolbarButton />
          <FontColorToolbarButton nodeType="color" tooltip="Text color">
            A
          </FontColorToolbarButton>
          <FontColorToolbarButton nodeType="backgroundColor" tooltip="Highlight">
            HL
          </FontColorToolbarButton>
          <ImageUrlToolbarButton />
        </FixedToolbar>
        <EditorContainer className={minHeight}>
          <Editor
            variant="fullWidth"
            placeholder={placeholder}
            readOnly={readOnly}
            onBlur={handleBlur}
          />
        </EditorContainer>
      </Plate>
    </div>
  );
}
