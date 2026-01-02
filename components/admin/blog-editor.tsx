'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Plus, Image as ImageIcon, Eye, Link as LinkIcon, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import MarkdownRenderer from '@/components/blog/markdown-renderer';

interface BlogEditorProps {
  content: string;
  onChange: (content: string) => void;
  blogId?: string;
}

type Block = {
  id: string;
  type: 'markdown' | 'image';
  content?: string; // For markdown blocks
  imageUrl?: string; // For image blocks
  altText?: string; // For image blocks
  width?: string; // For image blocks
};

const STORAGE_BUCKET = 'airbnb-images';
const STORAGE_FOLDER = 'blog-images';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function BlogEditor({ content, onChange, blogId }: BlogEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  
  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<string>('100');
  const [altText, setAltText] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Parse markdown content into blocks
  const parseContentToBlocks = (markdownContent: string): Block[] => {
    if (!markdownContent) {
      return [{
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'markdown',
        content: '',
      }];
    }

    const lines = markdownContent.split('\n');
    const parsedBlocks: Block[] = [];
    let currentMarkdown = '';
    
    for (const line of lines) {
      // Check if line is an image markdown
      const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)(?:\{width="(\d+)%"\})?$/);
      if (imageMatch) {
        // Save previous markdown block if any
        if (currentMarkdown.trim()) {
          parsedBlocks.push({
            id: `block-${Date.now()}-${Math.random()}`,
            type: 'markdown',
            content: currentMarkdown.trim(),
          });
          currentMarkdown = '';
        }
        // Add image block
        parsedBlocks.push({
          id: `block-${Date.now()}-${Math.random()}`,
          type: 'image',
          imageUrl: imageMatch[2],
          altText: imageMatch[1] || '',
          width: imageMatch[3] || '100',
        });
      } else {
        currentMarkdown += line + '\n';
      }
    }
    
    // Add remaining markdown
    if (currentMarkdown.trim()) {
      parsedBlocks.push({
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'markdown',
        content: currentMarkdown.trim(),
      });
    }
    
    // If no blocks, create one empty markdown block
    if (parsedBlocks.length === 0) {
      parsedBlocks.push({
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'markdown',
        content: '',
      });
    }
    
    return parsedBlocks;
  };

  // Initialize blocks from content on mount
  useEffect(() => {
    if (blocks.length === 0) {
      const initialBlocks = parseContentToBlocks(content);
      setBlocks(initialBlocks);
    }
  }, []); // Only run on mount

  // Convert blocks to markdown string
  const blocksToMarkdown = (blocksArray: Block[]): string => {
    return blocksArray.map(block => {
      if (block.type === 'markdown') {
        return block.content || '';
      } else {
        // Image block
        const widthAttr = block.width && block.width !== '100' ? `{width="${block.width}%"}` : '';
        return `![${block.altText || 'image'}](${block.imageUrl})${widthAttr}`;
      }
    }).join('\n\n');
  };

  // Update content when blocks change
  const updateBlocks = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    onChange(blocksToMarkdown(newBlocks));
  };

  const addMarkdownBlock = (afterIndex?: number) => {
    const newBlock: Block = {
      id: `block-${Date.now()}-${Math.random()}`,
      type: 'markdown',
      content: '',
    };
    
    const newBlocks = [...blocks];
    if (afterIndex !== undefined) {
      newBlocks.splice(afterIndex + 1, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }
    updateBlocks(newBlocks);
  };

  const openImageDialog = (afterIndex?: number) => {
    setSelectedBlockIndex(afterIndex ?? null);
    setShowImageDialog(true);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    // Check if we're editing an existing image block
    const isEditing = selectedBlockIndex !== null && blocks[selectedBlockIndex]?.type === 'image';
    
    if (isEditing) {
      // Just update the existing block properties
      const newBlocks = [...blocks];
      const block = newBlocks[selectedBlockIndex];
      if (block.type === 'image') {
        block.altText = altText || '';
        block.width = imageSize;
        // Only update URL if a new file was uploaded
        if (imageFile && blogId) {
          setUploadingImage(true);
          try {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${blogId}/${Date.now()}.${fileExt}`;
            const filePath = `${STORAGE_FOLDER}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from(STORAGE_BUCKET)
              .upload(filePath, imageFile, {
                cacheControl: '3600',
                upsert: false,
              });

            if (uploadError) {
              console.error('Error uploading image:', uploadError);
              toast.error('Failed to upload image');
              setUploadingImage(false);
              return;
            }

            const { data: { publicUrl } } = supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(filePath);
            
            block.imageUrl = publicUrl;
          } catch (err) {
            console.error('Exception uploading image:', err);
            toast.error('Failed to upload image');
            setUploadingImage(false);
            return;
          } finally {
            setUploadingImage(false);
          }
        }
      }
      updateBlocks(newBlocks);
      toast.success('Image updated');
    } else {
      // Inserting new image
      if (!imageFile || !blogId) {
        toast.error('Please select an image and save the blog first');
        return;
      }

      setUploadingImage(true);

      try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${blogId}/${Date.now()}.${fileExt}`;
        const filePath = `${STORAGE_FOLDER}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          toast.error('Failed to upload image');
          setUploadingImage(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(filePath);

        // Add image block
        const newImageBlock: Block = {
          id: `block-${Date.now()}-${Math.random()}`,
          type: 'image',
          imageUrl: publicUrl,
          altText: altText || '',
          width: imageSize,
        };

        const newBlocks = [...blocks];
        if (selectedBlockIndex !== null) {
          newBlocks.splice(selectedBlockIndex + 1, 0, newImageBlock);
        } else {
          newBlocks.push(newImageBlock);
        }
        
        updateBlocks(newBlocks);
        toast.success('Image uploaded and inserted');
      } catch (err) {
        console.error('Exception uploading image:', err);
        toast.error('Failed to upload image');
      } finally {
        setUploadingImage(false);
      }
    }

    setShowImageDialog(false);
    setImageFile(null);
    setImagePreview(null);
    setAltText('');
    setImageSize('100');
    setSelectedBlockIndex(null);
  };

  const deleteBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    if (newBlocks.length === 0) {
      // Always keep at least one block
      newBlocks.push({
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'markdown',
        content: '',
      });
    }
    updateBlocks(newBlocks);
  };

  const updateBlockContent = (index: number, content: string) => {
    const newBlocks = [...blocks];
    if (newBlocks[index].type === 'markdown') {
      newBlocks[index].content = content;
      updateBlocks(newBlocks);
    }
  };

  const openLinkDialog = (blockIndex: number) => {
    setSelectedBlockIndex(blockIndex);
    setLinkText('');
    setLinkUrl('');
    setShowLinkDialog(true);
  };

  const insertLink = () => {
    if (!linkUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    if (selectedBlockIndex === null) return;
    const block = blocks[selectedBlockIndex];
    if (block.type !== 'markdown') return;

    const linkMarkdown = `[${linkText || linkUrl}](${linkUrl})`;
    const newContent = (block.content || '') + linkMarkdown;
    
    updateBlockContent(selectedBlockIndex, newContent);
    setShowLinkDialog(false);
    setLinkText('');
    setLinkUrl('');
    setSelectedBlockIndex(null);
    toast.success('Link inserted');
  };

  const renderPreview = () => {
    return <MarkdownRenderer content={blocksToMarkdown(blocks)} />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <Label>Content Editor</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(true)}
        >
          <Eye className="h-4 w-4 mr-1" />
          Preview
        </Button>
      </div>

      <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
        {blocks.map((block, index) => (
          <div key={block.id} className="border-b pb-4 last:border-b-0 last:pb-0">
            {block.type === 'markdown' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-600">Markdown Block</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openLinkDialog(index)}
                      className="h-7"
                    >
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Insert Link
                    </Button>
                    {blocks.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteBlock(index)}
                        className="h-7 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <Textarea
                  value={block.content || ''}
                  onChange={(e) => updateBlockContent(index, e.target.value)}
                  placeholder="Write your markdown content here..."
                  rows={8}
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addMarkdownBlock(index)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Markdown Block
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openImageDialog(index)}
                  >
                    <ImageIcon className="h-3 w-3 mr-1" />
                    Insert Image
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-600">Image Block</Label>
                  {blocks.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteBlock(index)}
                      className="h-7 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {block.imageUrl && (
                  <div className="space-y-2">
                    <div className="relative w-full mx-auto" style={{ width: `${block.width || '100'}%`, maxWidth: '100%' }}>
                      <div className="relative w-full rounded-lg overflow-hidden border">
                        <img
                          src={block.imageUrl}
                          alt={block.altText || ''}
                          className="w-full h-auto object-contain rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Size: {block.width || '100'}%</span>
                      {block.altText && <span>• Alt: {block.altText}</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBlockIndex(index);
                          setImagePreview(block.imageUrl || null);
                          setAltText(block.altText || '');
                          setImageSize(block.width || '100');
                          setImageFile(null); // We're editing, not uploading new
                          setShowImageDialog(true);
                        }}
                        className="h-7"
                      >
                        Edit Image
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addMarkdownBlock(index)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Markdown Block
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openImageDialog(index)}
                  >
                    <ImageIcon className="h-3 w-3 mr-1" />
                    Insert Image
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Preview Dialog - Fullscreen Style */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full m-4 p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>
              Preview of how your blog post will appear
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-[#F9F9F7]">
            <div className="max-w-4xl mx-auto prose prose-lg max-w-none">
              {renderPreview()}
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Upload Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
            <DialogDescription>
              Upload an image and choose its display size
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {imagePreview ? (
              <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <span className="text-sm text-gray-600">Click to upload image</span>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </Label>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="alt-text">Alt Text</Label>
              <Input
                id="alt-text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Image description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-size">Image Size</Label>
              <Select value={imageSize} onValueChange={setImageSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">Small (25%)</SelectItem>
                  <SelectItem value="50">Medium (50%)</SelectItem>
                  <SelectItem value="75">Large (75%)</SelectItem>
                  <SelectItem value="100">Full (100%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!blogId && selectedBlockIndex === null && (
              <p className="text-xs text-amber-600">
                Note: Save the blog first to enable image uploads
              </p>
            )}
            {selectedBlockIndex !== null && blocks[selectedBlockIndex]?.type === 'image' && (
              <p className="text-xs text-blue-600">
                Editing existing image. Upload a new file to replace it, or just change size/alt text.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImageDialog(false);
              setImageFile(null);
              setImagePreview(null);
              setAltText('');
              setImageSize('100');
              setSelectedBlockIndex(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleImageUpload}
              disabled={
                (selectedBlockIndex === null && (!imageFile || !blogId)) || 
                uploadingImage
              }
            >
              {uploadingImage ? 'Uploading...' : 
               (selectedBlockIndex !== null && blocks[selectedBlockIndex]?.type === 'image') ? 'Update Image' : 'Insert Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Insert Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>
              Add a link to your markdown content
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-text">Link Text (optional)</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Click here"
              />
              <p className="text-xs text-gray-500">
                If empty, the URL will be used as the link text
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link-url">URL *</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={insertLink} disabled={!linkUrl.trim()}>
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
