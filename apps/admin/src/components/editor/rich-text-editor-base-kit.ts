import { BaseAlignKit } from '@/components/editor/plugins/align-base-kit';
import { BaseBasicBlocksKit } from '@/components/editor/plugins/basic-blocks-base-kit';
import { BaseBasicMarksKit } from '@/components/editor/plugins/basic-marks-base-kit';
import { BaseListKit } from '@/components/editor/plugins/list-base-kit';
import { RichTextFontBaseKit } from '@/components/editor/rich-text-font-base-kit';
import { RichTextMediaBaseKit } from '@/components/editor/rich-text-media-base-kit';

export const RichTextEditorBaseKit = [
  ...BaseBasicBlocksKit,
  ...BaseBasicMarksKit,
  ...BaseListKit,
  ...BaseAlignKit,
  ...RichTextFontBaseKit,
  ...RichTextMediaBaseKit,
];
