'use client';

import { useState } from 'react';

import RichTextPlateEditor from '@/components/editor/RichTextPlateEditor';
import { Button } from '@/components/ui/button';
import { isEmptyHtml } from '@/lib/rich-text';

export default function EditorPage() {
  const [html, setHtml] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const handleValidate = () => {
    if (isEmptyHtml(html)) {
      setValidationMessage('Content is empty (isEmptyHtml returned true)');
      return;
    }
    setValidationMessage('Content is valid (isEmptyHtml returned false)');
  };

  const handleReloadSample = () => {
    setHtml(
      '<h2>Sample heading</h2><p>This is <strong>bold</strong> and <em>italic</em> text.</p><ul><li>Item one</li><li>Item two</li></ul>',
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Rich Text Editor Test</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          HTML round-trip test for Plate.js rich text editing.
        </p>
      </div>

      <RichTextPlateEditor
        value={html}
        onChange={setHtml}
        placeholder="Write content…"
        minHeight="min-h-[420px]"
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleValidate}>
          Validate
        </Button>
        <Button type="button" variant="outline" onClick={handleReloadSample}>
          Load sample HTML
        </Button>
        <Button type="button" variant="outline" onClick={() => setHtml('')}>
          Clear
        </Button>
      </div>

      {validationMessage && <p className="text-sm font-medium">{validationMessage}</p>}

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Serialized HTML</h2>
        <pre className="bg-muted max-h-64 overflow-auto rounded-md border p-4 text-xs whitespace-pre-wrap">
          {html || '(empty)'}
        </pre>
      </div>
    </div>
  );
}
