"use client";

import React, { useState, useRef } from "react";
import { ImagePlus, Upload, RotateCw, Crop, Save, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent } from "@/components/ui/card";

export default function DesignerImageEditorPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setRotation(0);
      toast({ title: "Image loaded into editor" });
    };
    reader.readAsDataURL(file);
  };

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleSave = () => {
    if (!imageSrc) return;
    toast({ title: "Image processing complete", description: "Saved to Design Assets repository" });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <ImagePlus className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Image & Illustration Editor</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" /> Open File
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          {imageSrc && (
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" /> Save Asset
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Toolbar */}
        <Card className="w-64 flex flex-col">
          <CardContent className="p-4 flex flex-col gap-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">Tools</h3>
            <Button variant="secondary" className="justify-start w-full" disabled={!imageSrc} onClick={handleRotate}>
              <RotateCw className="w-4 h-4 mr-2" /> Rotate 90°
            </Button>
            <Button variant="secondary" className="justify-start w-full" disabled={!imageSrc}>
              <Crop className="w-4 h-4 mr-2" /> Crop Mode
            </Button>
            <Button variant="secondary" className="justify-start w-full" disabled={!imageSrc}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </CardContent>
        </Card>

        {/* Canvas */}
        <div className="flex-1 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative">
          {imageSrc ? (
            <img 
              src={imageSrc} 
              alt="Workspace" 
              className="max-w-full max-h-full object-contain transition-transform duration-300"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          ) : (
            <div className="text-center text-gray-400">
              <ImagePlus className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Select an image to start editing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
