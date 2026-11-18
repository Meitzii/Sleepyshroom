import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { uploadStoreAsset } from '../../utils/uploadHelper.ts';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  getToken: () => Promise<string | null>;
  folder?: string;
  aspectClass?: string;
  allowClear?: boolean;
  helperText?: string;
  placeholder?: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  getToken,
  folder = 'images',
  aspectClass = 'aspect-16/10',
  allowClear = false,
  helperText,
  placeholder = '/uploads/... or https://...',
}) => {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setImgBroken(false);
  }, [value]);

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)) {
      setErrorMsg('Please select an image file (PNG, JPG, WebP, GIF, or SVG).');
      return;
    }

    setErrorMsg(null);
    setUploading(true);
    try {
      const token = await getToken();
      const uploaded = await uploadStoreAsset(file, {
        token,
        folder,
        optimizeImage: true,
      });
      setImgBroken(false);
      onChange(uploaded.url);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not upload image.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="block text-xs font-bold text-[#1E1419]">
          {label}
        </label>
        {allowClear && value && (
          <button
            type="button"
            onClick={() => {
              setImgBroken(false);
              setErrorMsg(null);
              onChange('');
            }}
            className="text-[11px] font-bold text-[#8B6F7A] hover:text-red-700 inline-flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {helperText && (
        <p className="text-[11px] text-[#5C4952] font-medium leading-snug">{helperText}</p>
      )}

      <div
        onDragOver={e => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragLeave={e => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
        }}
        onDrop={handleDrop}
        className={`relative ${aspectClass} rounded-2xl overflow-hidden border transition-colors bg-white flex items-center justify-center ${
          dragActive
            ? 'border-[#A64B3C] ring-2 ring-[#A64B3C]/20 bg-[#FCF3E2]/40'
            : 'border-[#E8C9C1]'
        }`}
      >
        {value && !imgBroken ? (
          <img
            src={value}
            alt={label}
            onError={() => setImgBroken(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-4 space-y-1.5">
            {imgBroken ? (
              <>
                <AlertCircle className="w-6 h-6 text-amber-700 mx-auto" />
                <p className="text-[11px] font-bold text-amber-900">
                  Image could not be loaded from this path
                </p>
                <p className="text-[10px] text-[#777777]">
                  Drop or upload a picture below to replace it
                </p>
              </>
            ) : (
              <>
                <ImagePlus className="w-6 h-6 text-[#8B6F7A] mx-auto opacity-75" />
                <p className="text-[11px] font-bold text-[#8B6F7A]">
                  Drag &amp; drop a picture here, or click Upload below
                </p>
              </>
            )}
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-[#FFFCF7]/85 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 text-[#A64B3C]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[11px] font-bold">Uploading picture...</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <label className="cursor-pointer shrink-0">
          <span className="h-full py-2 px-3.5 bg-white hover:bg-[#F4EAE6] text-[#A64B3C] border border-[#E8C9C1] rounded-xl text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors w-full sm:w-auto">
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>{value ? 'Replace Picture' : 'Upload Picture'}</span>
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={e => void handleFile(e.target.files?.[0])}
            className="hidden"
          />
        </label>

        <input
          id={inputId}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-3 py-2 text-[11px] bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419] font-mono"
        />
      </div>

      {errorMsg && (
        <p className="text-[11px] font-bold text-red-700 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </p>
      )}
    </div>
  );
};
