import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, File, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { safeReadFile, validateFile, getFileInfo, FileValidationOptions } from '@/utils/fileUploadUtils';

interface EnhancedFileUploadProps {
  onFileRead: (content: string, fileName: string) => void;
  onError?: (error: string) => void;
  accept?: string;
  validationOptions?: FileValidationOptions;
  title?: string;
  description?: string;
  className?: string;
}

export const EnhancedFileUpload: React.FC<EnhancedFileUploadProps> = ({
  onFileRead,
  onError,
  accept = '.csv,.json',
  validationOptions,
  title = 'Upload File',
  description = 'Select a file to upload',
  className = ''
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [readProgress, setReadProgress] = useState<string>('');

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 File selected:', getFileInfo(file));

    // Validate file
    const validation = validateFile(file, validationOptions);
    if (!validation.isValid) {
      toast.error(validation.error);
      onError?.(validation.error || 'File validation failed');
      return;
    }

    setSelectedFile(file);
    setIsReading(true);
    setReadProgress('Preparing to read file...');

    try {
      // Read file with retry logic
      const result = await safeReadFile(file, {
        retries: 3,
        delay: 500
      });

      if (result.success && result.content) {
        setReadProgress('File read successfully!');
        toast.success(`File "${file.name}" loaded successfully`);
        onFileRead(result.content, file.name);
      } else {
        throw new Error(result.error || 'Failed to read file');
      }
    } catch (error: any) {
      console.error('❌ File reading failed:', error);
      const errorMessage = error.message || 'Failed to read file';
      toast.error(errorMessage);
      onError?.(errorMessage);
      setSelectedFile(null);
    } finally {
      setIsReading(false);
      setReadProgress('');
    }
  }, [onFileRead, onError, validationOptions]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setIsReading(false);
    setReadProgress('');
  }, []);

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {!selectedFile ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Click to select a file or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  Supported formats: {accept.replace(/\./g, '').toUpperCase()}
                </p>
              </div>
              <input
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isReading}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <File className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  disabled={isReading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isReading && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-700">{readProgress}</span>
                </div>
              )}

              {!isReading && (
                <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">File ready for processing</span>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p>💡 <strong>Tips for successful file upload:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Make sure the file is not open in another application</li>
              <li>Try refreshing the page if you encounter permission errors</li>
              <li>For large files, please be patient during the upload process</li>
              <li>Supported file types: CSV, JSON</li>
            </ul>
          </div>

          {validationOptions && (
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <p><strong>File Requirements:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                {validationOptions.maxSize && (
                  <li>Maximum size: {Math.round(validationOptions.maxSize / (1024 * 1024))}MB</li>
                )}
                {validationOptions.allowedExtensions && (
                  <li>Allowed types: {validationOptions.allowedExtensions.join(', ')}</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
