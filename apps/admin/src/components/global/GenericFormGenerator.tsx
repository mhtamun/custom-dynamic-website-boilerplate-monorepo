import { Button } from '@/components/ui/button';
import { FormikValues, useFormik } from 'formik';
import _ from 'lodash';
import { useEffect } from 'react';
import {
  ChipsField,
  FileSelectField,
  InputDateField,
  InputTextField,
  MultiSelectSyncField,
  RichTextPlateField,
  SelectAsyncField,
  SelectSyncField,
  TextareaField,
} from '../index';
import { ISelectOption } from './Dropdown';
import { IMultiSelectOption } from './multi-select';

export interface IField {
  type: string;
  name: string;
  title: string;
  placeholder: string;
  initialValue: string | number | boolean | null;
  options?: ISelectOption[] | IMultiSelectOption[];
  loadOptions?: (searchKey: string) => void; // only for async select
  isGroupOptions?: boolean; // only for multi select dropdowns
  isSearchable?: boolean;
  isClearable?: boolean;
  parentFieldName?: string;
  minDate?: Date; // only for date picker
  maxDate?: Date; // only for date picker
  enabledDates?: Date[]; // only for date picker
  notEnabledDateSelectionErrorMessage?: string;
  disabledDates?: Date[]; // only for date picker
  acceptType?: 'image/*' | 'video/*' | 'application/*' | '*/*'; // only for file select
  maxFileSize?: number; // only for file select
  multiple?: boolean; // only for file select (default: true)
  allowedExtensions?: string[]; // only for file select (e.g., ['jpg', 'png'] or ['pdf', 'docx'])
  isDisabled?: boolean;
  show?: (values: FormikValues) => boolean;
  validate?: (values: FormikValues) => string | null;
  onChange?: (
    name: string,
    value: any,
    setFormikFieldValue: (name: string, value: any) => void,
  ) => void;
  col?: number;
}

/**
 * Maps number of columns to Tailwind grid column span classes
 * @param numberOfColumn - Number of columns (1-12)
 * @returns Tailwind classes for responsive column spans
 */
const getColumnClasses = (numberOfColumn: number): string => {
  const colSpan = 12 / numberOfColumn;

  // Map to Tailwind col-span classes - covers all common cases
  const colSpanMap: Record<number, string> = {
    1: 'md:col-span-12 xl:col-span-12',
    2: 'md:col-span-6 xl:col-span-6',
    3: 'md:col-span-4 xl:col-span-4',
    4: 'md:col-span-3 xl:col-span-3',
    6: 'md:col-span-2 xl:col-span-2',
    12: 'md:col-span-1 xl:col-span-1',
  };

  // Return mapped classes or default to full width if not found
  if (colSpanMap[colSpan]) {
    return `sm:col-span-12 ${colSpanMap[colSpan]}`;
  }

  // Fallback: full width on all breakpoints for edge cases
  return 'sm:col-span-12 md:col-span-12 xl:col-span-12';
};

export default function GenericFormGenerator({
  datum = null,
  fields,
  nonEdibleFields = [],
  callback,
  onValueModify,
  submitButtonShow = true,
  submitButtonText,
  resetButtonShow = false,
  resetButtonText,
  enableReinitialize = false,
}: {
  datum?: any;
  fields: IField[];
  nonEdibleFields?: string[];
  callback?: (values: any, resetForm?: () => void) => void;
  onValueModify?: (values: FormikValues) => void;
  submitButtonShow?: boolean;
  submitButtonText?: string;
  resetButtonShow?: boolean;
  resetButtonText?: string;
  enableReinitialize?: boolean;
}) {
  // console.debug({ datum });
  // console.debug({ fields });

  const formik = useFormik({
    enableReinitialize,

    initialValues: !datum
      ? _.reduce(
          fields,
          (result, field, index) => {
            //   console.debug({ result, field, index });

            const temp: any = result;
            if (field.type === 'file-select' && field.multiple !== false) {
              // For multiple file-select, initialize as empty array
              temp[field.name] =
                field.initialValue === undefined || field.initialValue === null
                  ? []
                  : Array.isArray(field.initialValue)
                    ? field.initialValue
                    : [field.initialValue];
            } else if (field.type === 'chips') {
              temp[field.name] =
                field.initialValue === undefined || field.initialValue === null
                  ? []
                  : Array.isArray(field.initialValue)
                    ? field.initialValue
                    : [field.initialValue];
            } else {
              temp[field.name] =
                field.initialValue === undefined || field.initialValue === null
                  ? null
                  : field.initialValue;
            }

            return temp;
          },
          {},
        )
      : (() => {
          const picked = _.pick(
            datum,
            _.map(fields, field => field.name),
          );
          // Normalize file-select values to arrays if multiple
          fields.forEach(field => {
            if (field.type === 'file-select' && field.multiple !== false) {
              const value = picked[field.name];
              if (value !== undefined && value !== null) {
                picked[field.name] = Array.isArray(value) ? value : [value];
              } else {
                picked[field.name] = [];
              }
            }
            if (field.type === 'chips') {
              const value = picked[field.name];
              if (value === undefined || value === null) {
                picked[field.name] = [];
              } else if (!Array.isArray(value)) {
                picked[field.name] = [value];
              }
            }
            if (field.type === 'multi-select-sync') {
              const value = picked[field.name];
              if (value === undefined || value === null) {
                picked[field.name] = [];
              } else if (Array.isArray(value)) {
                picked[field.name] = value.map(String);
              } else {
                picked[field.name] = [String(value)];
              }
            }
          });
          return picked;
        })(),

    validate: values => {
      return _.reduce(
        fields,
        (errors, field) => {
          let result = null;

          if (!_.isUndefined(field.validate) && !_.isNull(field.validate)) {
            result = field.validate(values);
          }

          if (field.show && !field.show(values)) {
            result = null;
          }

          if (!_.isNull(result))
            return {
              ...errors,
              [field.name]: result,
            };

          return { ...errors };
        },
        {},
      );
    },

    onSubmit: async (values: FormikValues, { setSubmitting }) => {
      // console.debug({ values });

      setSubmitting(true);

      const hiddenFields: string[] = [];

      // Check false value not to submit in the form
      values = _.mapValues(values, (value: any, key: string) => {
        // console.debug({ value, key });
        console.debug({ datum });

        if (_.isUndefined(value) || _.isNull(value) || _.isNaN(value)) {
          if (_.isNull(datum) || _.isEmpty(datum)) hiddenFields.push(key); // This executes when create

          return null;
        }

        if (
          (_.isString(value) && _.isEqual(value, '')) ||
          (_.isString(value) && _.isEqual(value, '0')) ||
          (_.isNumber(value) && _.isEqual(value, 0)) ||
          (_.isArray(value) && _.size(value) === 0)
        ) {
          const field = _.find(fields, field => field.name === key);
          // console.debug({ value, key, field });

          if (!field) return null;

          // if (
          //     field.type === 'hidden' ||
          //     field.type === 'date' ||
          //     field.type === 'date' ||
          //     field.type === 'date-multiple' ||
          //     field.type === 'date-range' ||
          //     field.type === 'richtext' ||
          //     field.type === 'select-async' ||
          //     field.type === 'select-sync' ||
          //     field.type === 'file-select'
          // ) {
          //     return null;
          // }

          // if (
          //     field.type === 'email' ||
          //     field.type === 'password' ||
          //     field.type === 'tel' ||
          //     field.type === 'text' ||
          //     field.type === 'textarea'
          // ) {
          //     return '';
          // }

          if (field.type === 'number') {
            return 0;
          }

          if (field.type === 'multi-select-sync' || field.type === 'chips') {
            return [];
          }

          return null;
        }

        return value;
      });
      // console.debug({ values });

      // Check information type value or not showing value not to submit in the form
      _.map(
        _.filter(
          fields,
          field => field.type === 'information' || (field.show && field.show(values) === false),
        ) as IField[],
        field => {
          hiddenFields.push(field.name);
        },
      );
      // console.debug({ hiddenFields });

      const filteredValues = _.omit(values, [...hiddenFields, ...nonEdibleFields]);
      // console.debug({ filteredValues });

      setSubmitting(false);

      if (submitButtonShow && callback) {
        callback(filteredValues, () => {
          formik.resetForm();
        });
      }
    },

    onReset: (values: FormikValues) => {
      // console.debug({ values });
      // if (submitButtonShow && callback) {
      //     callback(null);
      // }
      // toto: Fix
    },
  });

  // function onKeyDown(keyEvent) {
  //     if ((keyEvent.charCode || keyEvent.keyCode) === 13) {
  //         keyEvent.preventDefault();
  //     }
  // }

  function getField(field: IField) {
    // console.debug({
    //     field,
    // });

    const errorMessage: string =
      // @ts-ignore
      !formik.touched[field.name] && !formik.errors[field.name] ? '' : formik.errors[field.name];

    if (
      field.type === 'hidden' ||
      field.type === 'email' ||
      field.type === 'number' ||
      field.type === 'password' ||
      field.type === 'tel' ||
      field.type === 'text'
    )
      return (
        <InputTextField
          key={field.name}
          type={field.type}
          name={field.name}
          title={field.title}
          placeholder={field.placeholder}
          // @ts-ignore
          value={formik.values[field.name] ?? ''}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          isDisabled={field.isDisabled}
          errorMessage={errorMessage}
        />
      );

    if (field.type === 'textarea')
      return (
        <TextareaField
          key={field.name}
          name={field.name}
          title={field.title}
          placeholder={field.placeholder}
          // @ts-ignore
          value={formik.values[field.name] ?? ''}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          isDisabled={field.isDisabled}
          errorMessage={errorMessage}
        />
      );

    if (field.type === 'date')
      return (
        <InputDateField
          key={field.name}
          name={field.name}
          title={field.title}
          placeholder={field.placeholder}
          // @ts-ignore
          value={formik.values[field.name] ?? ''}
          setFieldValue={formik.setFieldValue}
          setFieldTouched={formik.setFieldTouched}
          setFieldError={formik.setFieldError}
          minDate={field.minDate}
          maxDate={field.maxDate}
          enabledDates={field.enabledDates}
          notEnabledDateSelectionErrorMessage={field.notEnabledDateSelectionErrorMessage}
          disabledDates={field.disabledDates}
          isDisabled={field.isDisabled}
          errorMessage={errorMessage}
        />
      );

    if (field.type === 'date-multiple')
      return (
        <InputDateField
          key={field.name}
          name={field.name}
          title={field.title}
          placeholder={field.placeholder}
          // @ts-ignore
          value={formik.values[field.name] ?? ''}
          setFieldValue={formik.setFieldValue}
          setFieldTouched={formik.setFieldTouched}
          setFieldError={formik.setFieldError}
          isRange={false}
          isMultiple={true}
          minDate={field.minDate}
          maxDate={field.maxDate}
          enabledDates={field.enabledDates}
          notEnabledDateSelectionErrorMessage={field.notEnabledDateSelectionErrorMessage}
          disabledDates={field.disabledDates}
          isDisabled={field.isDisabled}
          errorMessage={errorMessage}
        />
      );

    if (field.type === 'date-range')
      return (
        <InputDateField
          key={field.name}
          name={field.name}
          title={field.title}
          placeholder={field.placeholder}
          // @ts-ignore
          value={formik.values[field.name] ?? ''}
          setFieldValue={formik.setFieldValue}
          setFieldTouched={formik.setFieldTouched}
          setFieldError={formik.setFieldError}
          isRange={true}
          isMultiple={false}
          minDate={field.minDate}
          maxDate={field.maxDate}
          enabledDates={field.enabledDates}
          notEnabledDateSelectionErrorMessage={field.notEnabledDateSelectionErrorMessage}
          disabledDates={field.disabledDates}
          isDisabled={field.isDisabled}
          errorMessage={errorMessage}
        />
      );

    if (field.type === 'richtext') {
      return (
        <RichTextPlateField
          key={field.name}
          name={field.name}
          title={field.title}
          // @ts-ignore
          value={formik.values[field.name] ?? ''}
          setFieldValue={formik.setFieldValue}
          setFieldTouched={formik.setFieldTouched}
          isDisabled={field.isDisabled}
          errorMessage={errorMessage}
          placeholder={field.placeholder}
        />
      );
    }

    if (field.type === 'select-async' && field.loadOptions)
      return (
        <SelectAsyncField
          key={field.name}
          name={field.name}
          title={field.title}
          placeholder={field.placeholder}
          // @ts-ignore
          value={formik.values[field.name] ?? ''}
          options={field.options ?? []}
          loadOptions={field.loadOptions}
          isSearchable={field.isSearchable}
          isClearable={field.isClearable}
          isDisabled={field.isDisabled}
          setFieldValue={(name: string, value: any) => {
            formik.setFieldValue(name, value, true);

            if (field.onChange) field.onChange(name, value, formik.setFieldValue);
          }}
          errorMessage={errorMessage}
        />
      );

    if (field.type === 'select-sync')
      return (
        <SelectSyncField
          key={field.name}
          name={field.name}
          title={field.title}
          placeholder={field.placeholder}
          // @ts-ignore
          value={formik.values[field.name] ?? ''}
          options={field.options ?? []}
          isGroupOptions={field.isGroupOptions}
          isSearchable={field.isSearchable}
          isClearable={field.isClearable}
          isDisabled={field.isDisabled}
          // @ts-ignore
          parentValue={formik.values[field.parentFieldName]}
          setFieldValue={(name: string, value: any) => {
            formik.setFieldValue(name, value, true);

            if (field.onChange) field.onChange(name, value, formik.setFieldValue);
          }}
          errorMessage={errorMessage}
        />
      );

    if (field.type === 'multi-select-sync')
      return (
        <MultiSelectSyncField
          key={field.name}
          name={field.name}
          title={field.title}
          placeholder={field.placeholder}
          // @ts-ignore
          value={formik.values[field.name] ?? ''}
          options={field.options ?? []}
          isGroupOptions={field.isGroupOptions}
          isDisabled={field.isDisabled}
          setFieldValue={formik.setFieldValue}
          errorMessage={errorMessage}
        />
      );

    if (field.type === 'chips') {
      const rawChips = (formik.values as Record<string, unknown>)[field.name];
      const chipValue = Array.isArray(rawChips)
        ? rawChips
        : rawChips === undefined || rawChips === null || rawChips === ''
          ? []
          : [String(rawChips)];

      return (
        <ChipsField
          key={field.name}
          name={field.name}
          title={field.title}
          placeholder={field.placeholder}
          value={chipValue}
          setFieldValue={formik.setFieldValue}
          isDisabled={field.isDisabled}
          errorMessage={errorMessage}
        />
      );
    }

    if (field.type === 'file-select') {
      // Handle value as array for multiple files
      const fieldValue = (formik.values as Record<string, any>)[field.name];
      let normalizedValue: string[] | string | null = null;

      if (Array.isArray(fieldValue)) {
        normalizedValue = fieldValue;
      } else if (fieldValue) {
        normalizedValue = field.multiple !== false ? [fieldValue] : fieldValue;
      }

      return (
        <FileSelectField
          key={field.name}
          name={field.name}
          title={field.title}
          placeholder={field.placeholder}
          value={normalizedValue}
          setFieldValue={formik.setFieldValue}
          setFieldTouched={formik.setFieldTouched}
          setFieldError={formik.setFieldError}
          isDisabled={field.isDisabled}
          acceptType={field.acceptType}
          maxFileSize={field.maxFileSize}
          errorMessage={errorMessage}
          multiple={field.multiple ?? true}
          allowedExtensions={field.allowedExtensions}
        />
      );
    }
  }

  let count = 0;
  const formFields = [];
  while (count < _.size(fields)) {
    const currentField = fields[count];
    if (!currentField) {
      count++;
      continue;
    }

    const isNotShow =
      _.isUndefined(currentField.show) || _.isNull(currentField.show)
        ? false
        : currentField.show?.(formik.values) === false
          ? true
          : false;

    const isHidden = currentField.type === 'hidden';

    if (isNotShow || isHidden) {
      count++;

      continue;
    }

    const numberOfColumn = currentField.col ?? 1;

    if (numberOfColumn > 1) {
      const insideItems = [];

      /* Hidden field count check */
      let numberOfHiddenColumns = 0;
      let tempCount = count;
      for (let i = 0; i < numberOfColumn; i++) {
        const tempField = fields[tempCount];
        if (tempField && tempField.type === 'hidden') numberOfHiddenColumns++;

        tempCount++;
      }
      /* Hidden field count check */

      for (let i = 0; i < numberOfColumn; i++) {
        const fieldToRender = fields[count];
        if (fieldToRender) {
          insideItems.push(
            <div key={'inside-' + (i + 1) + '-column'} className={getColumnClasses(numberOfColumn)}>
              {getField(fieldToRender)}
            </div>,
          );
        }

        // console.debug({ count, field: fields[count]?.name });
        count++;
      }

      formFields.push(
        <div
          key={'outside-' + (count + 1) + '-row-group'}
          className="grid grid-cols-1 md:grid-cols-12 gap-4"
        >
          {_.map(insideItems, insideItem => insideItem)}
        </div>,
      );
    } else {
      formFields.push(
        <div key={'outside-' + (count + 1) + '-row'} className="w-full mb-4">
          {getField(currentField)}
        </div>,
      );

      // console.debug({ count, field: currentField.name });
      count++;
    }
  }

  const submitButton = !submitButtonShow ? null : (
    <Button
      type="button"
      onClick={e => {
        formik.submitForm();
      }}
    >
      {!submitButtonText ? 'Submit' : submitButtonText}
    </Button>
  );

  const resetButton = !resetButtonShow ? null : (
    <Button
      type="button"
      variant="outline"
      onClick={e => {
        formik.resetForm();
      }}
      className="ml-3"
    >
      {!resetButtonText ? 'Reset' : resetButtonText}
    </Button>
  );

  // Handle data change instantly
  useEffect(() => {
    if (
      onValueModify !== undefined &&
      onValueModify !== null &&
      typeof onValueModify === 'function'
    ) {
      onValueModify(formik.values);
    }
  }, [formik.values, onValueModify]);

  return (
    <form onSubmit={formik.handleSubmit}>
      {_.map(formFields, formFieldElement => {
        return formFieldElement;
      })}
      {submitButton}
      {resetButton}
    </form>
  );
}
