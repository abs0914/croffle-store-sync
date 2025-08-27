/**
 * File Upload Utilities
 * 
 * Provides robust file reading and upload functionality with error handling
 * for common browser file access issues.
 */

export interface FileReadResult {
  success: boolean;
  content?: string;
  error?: string;
  fileName?: string;
  fileSize?: number;
}

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
}

/**
 * Safely read file content with retry logic and error handling
 */
export const safeReadFile = async (
  file: File,
  options: { retries?: number; delay?: number } = {}
): Promise<FileReadResult> => {
  const { retries = 3, delay = 500 } = options;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📖 Reading file attempt ${attempt}/${retries}:`, file.name);
      
      // Check if file is still accessible
      if (!file || file.size === 0) {
        throw new Error('File is empty or not accessible');
      }
      
      // Try multiple reading methods
      let content: string;
      
      try {
        // Method 1: Use file.text() (modern browsers)
        content = await file.text();
      } catch (textError) {
        console.log('file.text() failed, trying FileReader...', textError);
        
        // Method 2: Use FileReader as fallback
        content = await readFileWithFileReader(file);
      }
      
      if (!content && content !== '') {
        throw new Error('File content is empty or could not be read');
      }
      
      console.log('✅ File read successfully:', {
        fileName: file.name,
        size: file.size,
        contentLength: content.length
      });
      
      return {
        success: true,
        content,
        fileName: file.name,
        fileSize: file.size
      };
      
    } catch (error: any) {
      console.error(`❌ File read attempt ${attempt} failed:`, error);
      
      if (attempt === retries) {
        // Last attempt failed
        return {
          success: false,
          error: getFileReadErrorMessage(error),
          fileName: file.name,
          fileSize: file.size
        };
      }
      
      // Wait before retry
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return {
    success: false,
    error: 'Failed to read file after all retry attempts',
    fileName: file.name
  };
};

/**
 * Read file using FileReader (fallback method)
 */
const readFileWithFileReader = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('FileReader returned non-string result'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('FileReader error: ' + reader.error?.message));
    };
    
    reader.onabort = () => {
      reject(new Error('FileReader was aborted'));
    };
    
    // Use readAsText for text files
    reader.readAsText(file);
  });
};

/**
 * Validate file before reading
 */
export const validateFile = (
  file: File,
  options: FileValidationOptions = {}
): { isValid: boolean; error?: string } => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedExtensions = ['.csv', '.json', '.txt'],
    allowedMimeTypes = ['text/csv', 'application/json', 'text/plain', 'application/vnd.ms-excel']
  } = options;
  
  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `File size (${Math.round(file.size / (1024 * 1024))}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
    };
  }
  
  // Check file extension
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`
    };
  }
  
  // Check MIME type (if available)
  if (file.type && !allowedMimeTypes.includes(file.type)) {
    console.warn('MIME type not in allowed list, but proceeding based on extension:', file.type);
  }
  
  return { isValid: true };
};

/**
 * Get user-friendly error message for file read errors
 */
const getFileReadErrorMessage = (error: any): string => {
  const errorName = error?.name || '';
  const errorMessage = error?.message || '';
  
  switch (errorName) {
    case 'NotReadableError':
      return 'File could not be read. Please try selecting the file again, or check if another application is using it.';
    
    case 'NotAllowedError':
      return 'File access was denied. Please check your browser permissions and try again.';
    
    case 'SecurityError':
      return 'Security error reading file. Please try uploading from a different location.';
    
    case 'AbortError':
      return 'File reading was cancelled. Please try again.';
    
    default:
      if (errorMessage.includes('permission')) {
        return 'Permission denied. Please check file permissions and try again.';
      }
      
      if (errorMessage.includes('network')) {
        return 'Network error while reading file. Please check your connection and try again.';
      }
      
      return `File reading failed: ${errorMessage || 'Unknown error'}. Please try selecting the file again.`;
  }
};

/**
 * Create a file input element with proper event handling
 */
export const createFileInput = (
  options: {
    accept?: string;
    multiple?: boolean;
    onFileSelect?: (files: FileList) => void;
    onError?: (error: string) => void;
  } = {}
): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = options.accept || '.csv,.json';
  input.multiple = options.multiple || false;
  
  input.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    
    if (files && files.length > 0) {
      options.onFileSelect?.(files);
    } else {
      options.onError?.('No files selected');
    }
  });
  
  input.addEventListener('error', () => {
    options.onError?.('Error accessing file input');
  });
  
  return input;
};

/**
 * Reset file input to allow selecting the same file again
 */
export const resetFileInput = (input: HTMLInputElement): void => {
  input.value = '';
};

/**
 * Check if file reading is supported in current browser
 */
export const isFileReadingSupported = (): boolean => {
  return !!(window.File && window.FileReader && window.FileList && window.Blob);
};

/**
 * Get file info without reading content
 */
export const getFileInfo = (file: File) => {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    extension: file.name.split('.').pop()?.toLowerCase(),
    sizeFormatted: formatFileSize(file.size)
  };
};

/**
 * Format file size in human readable format
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
