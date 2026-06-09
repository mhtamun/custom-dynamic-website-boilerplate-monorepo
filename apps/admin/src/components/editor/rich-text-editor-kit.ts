'use client';

import { HtmlPlugin } from 'platejs';

import { AlignKit } from '@/components/editor/plugins/align-kit';
import { BasicNodesKit } from '@/components/editor/plugins/basic-nodes-kit';
import { ListKit } from '@/components/editor/plugins/list-kit';
import { RichTextFontKit } from '@/components/editor/rich-text-font-kit';
import { RichTextMediaKit } from '@/components/editor/rich-text-media-kit';

export const RichTextEditorKit = [
  ...BasicNodesKit,
  ...ListKit,
  ...AlignKit,
  ...RichTextFontKit,
  ...RichTextMediaKit,
  HtmlPlugin,
];
