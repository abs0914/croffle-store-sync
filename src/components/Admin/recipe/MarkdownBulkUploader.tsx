import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  Eye,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  parseMultipleMarkdownFiles, 
  validateParsedRecipes, 
  getParsedRecipesSummary,
  ParsedRecipeFile 
} from '@/services/recipeUpload/markdownRecipeParser';
import { 
  MarkdownBulkUploadService, 
  UploadProgress, 
  UploadOptions 
} from '@/services/recipeUpload/markdownBulkUploadService';

interface MarkdownBulkUploaderProps {
  onUploadComplete?: (recipeIds: string[]) => void;
}

export const MarkdownBulkUploader: React.FC<MarkdownBulkUploaderProps> = ({
  onUploadComplete
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [parsedFiles, setParsedFiles] = useState<ParsedRecipeFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Upload options
  const [uploadOptions, setUploadOptions] = useState<UploadOptions>({
    createMissingCommissaryItems: true,
    updateExistingRecipes: false,
    defaultStockLevel: 100
  });

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const markdownFiles = files.filter(file => 
      file.name.endsWith('.md') || file.type === 'text/markdown'
    );

    if (markdownFiles.length === 0) {
      toast.error('Please select markdown (.md) files');
      return;
    }

    setSelectedFiles(markdownFiles);
    
    try {
      toast.info('Parsing markdown files...');
      const parsed = await parseMultipleMarkdownFiles(markdownFiles);
      setParsedFiles(parsed);
      setShowPreview(true);
      
      const validation = validateParsedRecipes(parsed);
      if (validation.errors.length > 0) {
        toast.warning(`Found ${validation.errors.length} errors in the files`);
      } else {
        toast.success(`Successfully parsed ${validation.totalRecipes} recipes`);
      }
    } catch (error) {
      toast.error('Failed to parse markdown files');
      console.error('Parse error:', error);
    }
  }, []);

  const handleUpload = async () => {
    if (parsedFiles.length === 0) {
      toast.error('No files to upload');
      return;
    }

    const validation = validateParsedRecipes(parsedFiles);
    if (!validation.isValid) {
      toast.error('Please fix validation errors before uploading');
      return;
    }

    setIsUploading(true);
    setUploadProgress(null);

    try {
      const uploadService = new MarkdownBulkUploadService();
      
      const result = await uploadService.uploadRecipes(parsedFiles, {
        ...uploadOptions,
        onProgress: (progress) => {
          setUploadProgress(progress);
        }
      });

      if (result.success) {
        toast.success(
          `Upload completed! ${result.successfulRecipes}/${result.totalRecipes} recipes uploaded successfully`
        );
        
        if (result.warnings.length > 0) {
          console.warn('Upload warnings:', result.warnings);
        }

        if (onUploadComplete && result.recipeIds.length > 0) {
          onUploadComplete(result.recipeIds);
        }

        // Reset state
        setSelectedFiles([]);
        setParsedFiles([]);
        setShowPreview(false);
      } else {
        toast.error(`Upload failed: ${result.errors.join(', ')}`);
      }

    } catch (error) {
      toast.error('Upload failed');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const summary = parsedFiles.length > 0 ? getParsedRecipesSummary(parsedFiles) : null;
  const validation = parsedFiles.length > 0 ? validateParsedRecipes(parsedFiles) : null;

  return (
    <div className="space-y-6">
      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Markdown Recipe Upload
          </CardTitle>
          <CardDescription>
            Upload recipe data from markdown files. Supports multiple files with table format.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Select Markdown Files</Label>
            <Input
              id="file-upload"
              type="file"
              multiple
              accept=".md,.markdown"
              onChange={handleFileSelect}
              className="mt-1"
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files:</Label>
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {file.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Settings */}
      {parsedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-5 w-5" />
              Upload Settings
            </CardTitle>
          </CardHeader>
          
          {showSettings && (
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create-commissary"
                  checked={uploadOptions.createMissingCommissaryItems}
                  onCheckedChange={(checked) => 
                    setUploadOptions(prev => ({ ...prev, createMissingCommissaryItems: !!checked }))
                  }
                />
                <Label htmlFor="create-commissary">
                  Create missing commissary inventory items
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="update-existing"
                  checked={uploadOptions.updateExistingRecipes}
                  onCheckedChange={(checked) => 
                    setUploadOptions(prev => ({ ...prev, updateExistingRecipes: !!checked }))
                  }
                />
                <Label htmlFor="update-existing">
                  Update existing recipe templates
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-stock">Default Stock Level for New Items</Label>
                <Input
                  id="default-stock"
                  type="number"
                  min="1"
                  value={uploadOptions.defaultStockLevel}
                  onChange={(e) => 
                    setUploadOptions(prev => ({ ...prev, defaultStockLevel: parseInt(e.target.value) || 100 }))
                  }
                  className="w-32"
                />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Preview and Validation */}
      {parsedFiles.length > 0 && summary && validation && (
        <Card>
          <CardHeader>
            <CardTitle 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-5 w-5" />
              Preview & Validation
              {validation.isValid ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </CardTitle>
          </CardHeader>
          
          {showPreview && (
            <CardContent className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{summary.totalFiles}</div>
                  <div className="text-sm text-muted-foreground">Files</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{summary.totalRecipes}</div>
                  <div className="text-sm text-muted-foreground">Recipes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{summary.totalIngredients}</div>
                  <div className="text-sm text-muted-foreground">Ingredients</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{summary.recipesByCategory.size}</div>
                  <div className="text-sm text-muted-foreground">Categories</div>
                </div>
              </div>

              <Separator />

              {/* Validation Results */}
              {validation.errors.length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <div className="font-medium text-red-800 mb-2">
                      {validation.errors.length} Error(s) Found:
                    </div>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validation.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {validation.errors.length > 5 && (
                        <li>• ... and {validation.errors.length - 5} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {validation.warnings.length > 0 && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription>
                    <div className="font-medium text-amber-800 mb-2">
                      {validation.warnings.length} Warning(s):
                    </div>
                    <ul className="text-sm text-amber-700 space-y-1">
                      {validation.warnings.slice(0, 3).map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                      {validation.warnings.length > 3 && (
                        <li>• ... and {validation.warnings.length - 3} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* File Details */}
              <div className="space-y-2">
                <Label>File Details:</Label>
                {summary.filesSummary.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{file.filename}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{file.recipeCount} recipes</span>
                      <span>{file.ingredientCount} ingredients</span>
                      {file.hasErrors && <XCircle className="h-4 w-4 text-red-500" />}
                      {file.hasWarnings && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Upload Progress */}
      {isUploading && uploadProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Upload Progress
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{uploadProgress.recipesProcessed}/{uploadProgress.totalRecipes} recipes</span>
              </div>
              <Progress 
                value={(uploadProgress.recipesProcessed / uploadProgress.totalRecipes) * 100} 
                className="w-full"
              />
            </div>

            <div className="text-sm space-y-1">
              <div><strong>Phase:</strong> {uploadProgress.phase}</div>
              <div><strong>Current File:</strong> {uploadProgress.currentFile}</div>
              <div><strong>Current Recipe:</strong> {uploadProgress.currentRecipe}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Button */}
      {parsedFiles.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={isUploading || !validation?.isValid}
            size="lg"
            className="min-w-32"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Recipes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MarkdownBulkUploader;
