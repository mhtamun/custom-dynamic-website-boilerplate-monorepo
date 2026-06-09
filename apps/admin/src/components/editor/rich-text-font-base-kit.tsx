import type { SlatePluginConfig } from 'platejs';

import {
  BaseFontBackgroundColorPlugin,
  BaseFontColorPlugin,
  BaseFontSizePlugin,
} from '@platejs/basic-styles';
import { KEYS } from 'platejs';

const options = {
  inject: { targetPlugins: [...KEYS.heading, KEYS.p, KEYS.blockquote] },
} satisfies SlatePluginConfig;

export const RichTextFontBaseKit = [
  BaseFontColorPlugin.configure(options),
  BaseFontBackgroundColorPlugin.configure(options),
  BaseFontSizePlugin.configure(options),
];
