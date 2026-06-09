'use client';

import type { PlatePluginConfig } from 'platejs/react';

import {
  FontBackgroundColorPlugin,
  FontColorPlugin,
  FontSizePlugin,
} from '@platejs/basic-styles/react';
import { KEYS } from 'platejs';

const options = {
  inject: { targetPlugins: [...KEYS.heading, KEYS.p, KEYS.blockquote] },
} satisfies PlatePluginConfig;

export const RichTextFontKit = [
  FontColorPlugin.configure({
    inject: {
      ...options.inject,
      nodeProps: {
        defaultNodeValue: 'black',
      },
    },
  }),
  FontBackgroundColorPlugin.configure(options),
  FontSizePlugin.configure(options),
];
