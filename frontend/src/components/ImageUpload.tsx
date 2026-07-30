import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";

interface ImageUploadProps {
  onFileSelect: (file: File | null) => void;
}

const ImageUpload = ({ onFileSelect }: ImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setPreview(URL.createObjectURL(file));
      onFileSelect(file);
    }
  };

  const clear = () => {
    setPreview(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      {preview ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <img src={preview} alt="Preview" className="h-48 w-full object-cover" />
          <button onClick={clear} className="absolute right-2 top-2 rounded-full bg-foreground/70 p-1 text-background hover:bg-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
        >
          <Upload className="h-8 w-8" />
          <span className="text-sm font-medium">Click to upload an image</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
    </div>
  );
};

export default ImageUpload;
