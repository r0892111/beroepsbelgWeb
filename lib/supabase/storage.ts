import { supabase } from './client';

export interface VideoFile {
  name: string;
  url: string;
  path: string;
}

export async function getHeroVideos(): Promise<VideoFile[]> {
  try {
    console.log('[Storage] Fetching videos from Hero-droneshots bucket...');
    const { data: files, error } = await supabase.storage
      .from('Hero-droneshots')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      console.error('[Storage] Error fetching videos from storage:', error);
      return [];
    }

    console.log('[Storage] Files found:', files?.length || 0);

    if (!files || files.length === 0) {
      console.log('[Storage] No files found in bucket');
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
              console.log(`[Storage] Using signed URL for ${file.name}`);
            } else {
              console.log(`[Storage] Using public URL for ${file.name}:`, videoUrl);
            }
          } catch (err) {
            console.warn(`[Storage] Could not create signed URL for ${file.name}, using public URL`);
          }

          const videoFile = {
            name: file.name,
            url: videoUrl,
            path: file.name,
          };
          
          console.log(`[Storage] Video file: ${file.name} -> ${videoUrl.substring(0, 100)}...`);
          return videoFile;
        })
    );

    console.log('[Storage] Total video files:', videoFiles.length);
    return videoFiles;
  } catch (error) {
    console.error('[Storage] Error in getHeroVideos:', error);
    return [];
  }
}
