'use client';

import { UploadFileResponse, deleteFileFromStorage, uploadFileToStorage } from '@/apis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AlertTriangle, File as FileIcon, Image as ImageIcon, Upload, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface FileItem {
  id: string;
  file: File | null;
  preview: string | null;
  url?: string;
  progress?: number;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'deleting';
  error?: string;
}

interface FileSelectFieldProps {
  name: string;
  title: string;
  value?: string[] | string | File[] | File | null;
  placeholder?: string;
  setFieldValue: (field: string, value: any) => void;
  setFieldTouched: (field: string, touched: boolean) => void;
  setFieldError: (field: string, value: string) => void;
  isDisabled?: boolean;
  acceptType?: 'image/*' | 'video/*' | 'application/*' | '*/*';
  maxFileSize?: number;
  errorMessage?: string;
  multiple?: boolean;
  allowedExtensions?: string[];
}

const FileSelectField = ({
  name,
  title,
  value,
  placeholder,
  setFieldValue,
  setFieldTouched,
  setFieldError,
  isDisabled = false,
  acceptType = '*/*',
  maxFileSize = 5242880,
  errorMessage = '',
  multiple = true,
  allowedExtensions,
}: FileSelectFieldProps) => {
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortControllers = useRef<Map<string, AbortController>>(new Map());
  const initialUrlsRef = useRef<string[]>([]); // Track initial URLs from edit mode

  // Initialize from value prop
  React.useEffect(() => {
    if (!value) {
      setSelectedFiles([]);
      initialUrlsRef.current = [];
      return;
    }

    const files: FileItem[] = [];
    const initialUrls: string[] = [];

    // Handle array of URLs
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string' && item.startsWith('http')) {
          initialUrls.push(item);
          files.push({
            id: `url-${index}-${Date.now()}`,
            file: null,
            preview:
              item.startsWith('http') && item.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? item : null,
            url: item,
            status: 'success',
          });
        } else if (item instanceof File) {
          const preview = item.type.startsWith('image/') ? URL.createObjectURL(item) : null;
          files.push({
            id: `file-${index}-${Date.now()}`,
            file: item,
            preview,
            status: 'pending',
          });
        }
      });
    } else if (typeof value === 'string' && value.startsWith('http')) {
      // Single URL
      initialUrls.push(value);
      files.push({
        id: `url-${Date.now()}`,
        file: null,
        preview: value.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? value : null,
        url: value,
        status: 'success',
      });
    } else if (value instanceof File) {
      // Single File
      const preview = value.type.startsWith('image/') ? URL.createObjectURL(value) : null;
      files.push({
        id: `file-${Date.now()}`,
        file: value,
        preview,
        status: 'pending',
      });
    }

    // Store initial URLs for edit mode tracking
    initialUrlsRef.current = initialUrls;
    setSelectedFiles(files);
  }, [value]);

  const selectedFilesRef = useRef(selectedFiles);

  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  // Cleanup object URLs on unmount
  React.useEffect(() => {
    return () => {
      selectedFilesRef.current.forEach(fileItem => {
        if (fileItem.preview && fileItem.preview.startsWith('blob:')) {
          URL.revokeObjectURL(fileItem.preview);
        }
      });
    };
  }, []);

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds maximum of ${(maxFileSize / 1024 / 1024).toFixed(2)} MB`;
    }

    if (allowedExtensions && allowedExtensions.length > 0) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        return `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`;
      }
    }

    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: FileItem[] = [];

    Array.from(files).forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        setFieldError(name, validationError);
        return;
      }

      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      newFiles.push({
        id: `file-${Date.now()}-${Math.random()}`,
        file,
        preview,
        status: 'pending',
      });
    });

    // Update state
    setSelectedFiles(prev => (multiple ? [...prev, ...newFiles] : newFiles));

    setFieldTouched(name, true);
    setFieldError(name, '');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = useCallback(
    async (fileId: string) => {
      let fileToRemove: FileItem | undefined;

      setSelectedFiles(prev => {
        fileToRemove = prev.find(item => item.id === fileId);
        return prev;
      });

      if (!fileToRemove || fileToRemove.status === 'uploading') {
        return;
      }

      if (fileToRemove.url && !fileToRemove.file) {
        setSelectedFiles(prev =>
          prev.map(item =>
            item.id === fileId ? { ...item, status: 'deleting' as const, error: undefined } : item,
          ),
        );

        try {
          await deleteFileFromStorage(fileToRemove.url);
        } catch (error: any) {
          setSelectedFiles(prev =>
            prev.map(item =>
              item.id === fileId
                ? {
                    ...item,
                    status: 'success' as const,
                    error: error?.message || 'Failed to delete file from storage',
                  }
                : item,
            ),
          );
          return;
        }
      }

      setSelectedFiles(prev => {
        const updated = prev.filter(item => item.id !== fileId);
        const urlValues = updated.map(item => item.url).filter(Boolean);

        setTimeout(() => {
          setFieldValue(name, multiple ? urlValues : urlValues[0] || null);
        }, 0);

        return updated;
      });
    },
    [multiple, name, setFieldValue],
  );

  const handleUpload = useCallback(async () => {
    const filesToUpload = selectedFilesRef.current.filter(
      item => item.file && item.status === 'pending',
    );

    if (filesToUpload.length === 0) {
      return;
    }

    // Get existing URLs from already uploaded files
    const existingUrls = selectedFilesRef.current
      .filter(item => item.url && !item.file)
      .map(item => item.url!)
      .filter(Boolean);

    const uploadPromises = filesToUpload.map(async fileItem => {
      if (!fileItem.file) return null;

      const abortController = new AbortController();
      uploadAbortControllers.current.set(fileItem.id, abortController);

      // Update status to uploading
      setSelectedFiles(prev =>
        prev.map(item =>
          item.id === fileItem.id ? { ...item, status: 'uploading' as const, progress: 0 } : item,
        ),
      );

      try {
        const response: UploadFileResponse = await uploadFileToStorage({
          file: fileItem.file,
          onUploadProgress: progress => {
            setSelectedFiles(prev =>
              prev.map(item => (item.id === fileItem.id ? { ...item, progress } : item)),
            );
          },
        });

        // Update with uploaded URL
        setSelectedFiles(prev =>
          prev.map(item =>
            item.id === fileItem.id
              ? {
                  ...item,
                  status: 'success' as const,
                  url: response.url,
                  progress: 100,
                  file: null, // Clear file object after upload
                }
              : item,
          ),
        );

        uploadAbortControllers.current.delete(fileItem.id);
        return response.url;
      } catch (error: any) {
        setSelectedFiles(prev =>
          prev.map(item =>
            item.id === fileItem.id
              ? {
                  ...item,
                  status: 'error' as const,
                  error: error.message || 'Upload failed',
                }
              : item,
          ),
        );
        uploadAbortControllers.current.delete(fileItem.id);
        throw error;
      }
    });

    try {
      const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];

      // Combine existing URLs with newly uploaded URLs
      const allUrls = [...existingUrls, ...uploadedUrls];

      // Update formik with URLs after upload completes
      setFieldValue(name, multiple ? allUrls : allUrls[0] || null);
      setFieldTouched(name, true);
      setFieldError(name, '');
    } catch (error: any) {
      setFieldError(name, error.message || 'Failed to upload files');
    }
  }, [selectedFiles, name, setFieldValue, setFieldTouched, setFieldError, multiple]);

  const hasPendingUploads = selectedFiles.some(item => item.file && item.status === 'pending');
  const isUploading = selectedFiles.some(item => item.status === 'uploading');

  // Check if files were removed in edit mode without replacement
  const currentUrls = selectedFiles.filter(item => item.url && !item.file).map(item => item.url!);
  const hasRemovedFiles =
    initialUrlsRef.current.length > 0 &&
    currentUrls.length < initialUrlsRef.current.length &&
    !hasPendingUploads;

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const getFileIcon = (fileItem: FileItem) => {
    if (fileItem.preview) {
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={fileItem.preview}
          alt="Preview"
          className="h-20 w-20 object-cover rounded"
          onError={e => {
            // Fallback to file icon if image fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    return (
      <div className="h-20 w-20 bg-muted rounded flex items-center justify-center">
        <FileIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{title}</Label>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6',
          errorMessage && 'border-destructive',
          isDisabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {/* Move the hidden input OUTSIDE the conditional */}
        <Input
          ref={fileInputRef}
          id={name}
          type="file"
          accept={acceptType}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={isDisabled}
          className="hidden"
        />

        {selectedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              {placeholder || 'Click to upload or drag and drop'}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled}
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose {multiple ? 'Files' : 'File'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedFiles.map(fileItem => (
              <div key={fileItem.id} className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {getFileIcon(fileItem)}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium truncate">
                        {fileItem.file?.name || 'File URL'}
                      </span>
                      {fileItem.file && (
                        <span className="text-sm text-muted-foreground">
                          {formatFileSize(fileItem.file.size)}
                        </span>
                      )}
                      {fileItem.url && (
                        <span className="text-xs text-muted-foreground truncate">
                          {fileItem.url}
                        </span>
                      )}
                      {fileItem.error && (
                        <span className="text-xs text-destructive">{fileItem.error}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      void removeFile(fileItem.id);
                    }}
                    disabled={
                      isDisabled ||
                      fileItem.status === 'uploading' ||
                      fileItem.status === 'deleting'
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {fileItem.status === 'uploading' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Uploading...</span>
                      <span className="text-muted-foreground">{fileItem.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fileItem.progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}
                {fileItem.status === 'error' && (
                  <div className="text-xs text-destructive">
                    Upload failed: {fileItem.error || 'Unknown error'}
                  </div>
                )}
                {fileItem.status === 'deleting' && (
                  <div className="text-xs text-muted-foreground">Deleting file...</div>
                )}
                {fileItem.status === 'success' && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <span>✓ Uploaded successfully</span>
                  </div>
                )}
              </div>
            ))}
            {!isDisabled && multiple && (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Add More Files
              </Button>
            )}
            {hasPendingUploads && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={isDisabled || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload {multiple ? 'Files' : 'File'} to Storage
                    </>
                  )}
                </Button>
                {hasPendingUploads && !isUploading && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Please upload files before submitting the form
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {errorMessage && (
        <p id={`${name}-help`} className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}
      {hasRemovedFiles && (
        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                ⚠️ Warning: Files have been deleted from storage
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                You have removed {initialUrlsRef.current.length - currentUrls.length} file(s) that
                were previously uploaded. These files have already been deleted from the server. If
                you close this form without uploading replacement files, the deletion will be
                permanent and cannot be undone. Please upload new files to replace the removed ones
                before closing the form.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileSelectField;
