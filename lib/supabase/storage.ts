import { supabase } from './client';

export interface VideoFile {
  name: string;
  url: string;
  path: string;
}

export async function getHeroVideos(): Promise<VideoFile[]> {
  try {
    const { data: files, error } = await supabase.storage
      .from('Hero-droneshots')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      return [];
    }

    if (!files || files.length === 0) {
      return [];
    }

    const videoFiles: VideoFile[] = await Promise.all(
      files
        .filter(file => {
          const ext = file.name.toLowerCase();
          return ext.endsWith('.mp4') || ext.endsWith('.webm') || ext.endsWith('.mov');
        })
        .map(async (file) => {
          // Try public URL first
          const { data: publicData } = supabase.storage
            .from('Hero-droneshots')
            .getPublicUrl(file.name);

          let videoUrl = publicData.publicUrl;

          // If public URL fails, try signed URL (valid for 1 hour)
          // This handles cases where bucket might not be fully public
          try {
            const { data: signedData, error: signedError } = await supabase.storage
              .from('Hero-droneshots')
              .createSignedUrl(file.name, 3600);

            if (!signedError && signedData) {
              videoUrl = signedData.signedUrl;
            }
          } catch (err) {
            // Fallback to public URL
          }

          const videoFile = {
            name: file.name,
            url: videoUrl,
            path: file.name,
          };
          
          return videoFile;
        })
    );

    return videoFiles;
  } catch (error) {
    return [];
  }
}
