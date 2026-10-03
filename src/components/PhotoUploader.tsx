'use client';

import { useState, useRef } from 'react';
import { Upload, X, Check, Loader2, Image as ImageIcon } from 'lucide-react';

interface PhotoUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  folderLabel?: string;
}

export default function PhotoUploader({
  value,
  onChange,
  label = 'Official Profile Photo',
  folderLabel = 'ASTS/Profiles (Google Drive)',
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, JPEG, WEBP)');
      return;
    }
    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload photo');
      }

      onChange(data.url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">{label}</label>
        <span className="text-[10px] text-slate-400 font-medium">{folderLabel}</span>
      </div>

      {value ? (
        <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="w-14 h-14 rounded-lg bg-slate-200 overflow-hidden border border-slate-300 relative shrink-0">
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/assets/img/astslogo.png';
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Photo Attached</span>
            </p>
            <p className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">{value}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-semibold text-yale-700 hover:underline mt-1 inline-block"
            >
              Replace Photo
            </button>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
            title="Remove Photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-yale-600 bg-yale-50/50'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          {uploading ? (
            <div className="py-2 flex flex-col items-center justify-center gap-1.5 text-yale-700">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-xs font-semibold">Uploading to ASTS/Profiles...</p>
            </div>
          ) : (
            <div className="py-2 flex flex-col items-center justify-center gap-1 text-slate-500">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-700">
                Click or drag &amp; drop photo
              </p>
              <p className="text-[10px] text-slate-400">
                Saves directly to Google Drive <span className="font-semibold text-slate-600">ASTS/Profiles</span>
              </p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
        className="hidden"
      />
    </div>
  );
}
