import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, X, File, Loader2 } from "lucide-react";

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
}

export function FileUpload({ onUpload, accept = "*/*", maxSizeMB = 10, disabled = false }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (selected.size > maxSizeMB * 1024 * 1024) {
        setError(`File size exceeds ${maxSizeMB}MB limit.`);
        setFile(null);
        return;
      }
      setFile(selected);
    }
  };

  const handleUploadClick = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      await onUpload(file);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e: any) {
      setError(e.message || "Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center bg-card text-center relative hover:bg-muted/50 transition-colors">
      <input 
        type="file" 
        accept={accept} 
        onChange={handleFileChange} 
        className="hidden" 
        ref={inputRef}
        disabled={disabled || isUploading}
      />
      
      {!file ? (
        <>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <UploadCloud className="h-6 w-6 text-primary" />
          </div>
          <h4 className="text-sm font-semibold mb-1">Click to upload</h4>
          <p className="text-xs text-muted-foreground mb-4">
            Maximum file size: {maxSizeMB}MB
          </p>
          <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled}>
            Select File
          </Button>
        </>
      ) : (
        <div className="w-full flex flex-col items-center">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg w-full max-w-sm mb-4 relative">
            <File className="h-8 w-8 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            {!isUploading && (
              <button 
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }} 
                className="p-1 hover:bg-background rounded absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          
          {error && <p className="text-sm text-destructive mb-4">{error}</p>}
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setFile(null);
              setError(null);
              if (inputRef.current) inputRef.current.value = "";
            }} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUploadClick} disabled={isUploading}>
              {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : 'Upload File'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
