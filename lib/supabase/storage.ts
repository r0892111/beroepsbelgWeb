import { supabase } from './client';

export interface VideoFile {
  name: string;
  url: string;
  path: string;
}

export async function getHeroVideos(): Promise<VideoFile[]> {
  try {
    const { data: files, error } = await supabase.storage
      .from('drone-footage')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      console.error('Error fetching videos from storage:', error);
      return [];
    }

    if (!files || files.length === 0) {
      return [];
    }

    const videoFiles: VideoFile[] = files
      .filter(file => {
        const ext = file.name.toLowerCase();
        return ext.endsWith('.mp4') || ext.endsWith('.webm') || ext.endsWith('.mov');
      })
      .map(file => {
        const { data } = supabase.storage
          .from('drone-footage')
          .getPublicUrl(file.name);

        return {
          name: file.name,
          url: data.publicUrl,
          path: file.name,
        };
      });

    return videoFiles;
  } catch (error) {
    console.error('Error in getHeroVideos:', error);
    return [];
  }
}
