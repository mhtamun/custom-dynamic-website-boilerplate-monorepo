'use client';

import RichTextPlateEditor from '@/components/editor/RichTextPlateEditor';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
  name: string;
  title: string;
  value: string;
  setFieldValue: (name: string, value: string) => void;
  setFieldTouched: (name: string, touched?: boolean) => void;
  isDisabled?: boolean;
  errorMessage?: string;
  placeholder?: string;
};

export default function RichTextPlateField({
  name,
  title,
  value,
  setFieldValue,
  setFieldTouched,
  isDisabled = false,
  errorMessage = '',
  placeholder,
}: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{title}</Label>
      <RichTextPlateEditor
        value={value ?? ''}
        onChange={html => setFieldValue(name, html)}
        onBlur={() => setFieldTouched(name, true)}
        readOnly={isDisabled}
        placeholder={placeholder}
        className={cn(errorMessage && 'border-destructive')}
      />
      {errorMessage && (
        <p id={`${name}-help`} className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
