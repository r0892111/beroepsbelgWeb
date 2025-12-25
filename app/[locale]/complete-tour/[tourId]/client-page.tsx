'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Upload, CheckCircle2, XCircle, Image as ImageIcon, AlertTriangle } from 'lucide-react';

interface Booking {
  id: number;
  tour_id: string | null;
  city: string | null;
  tour_datetime: string | null;
  status: string;
  picturesUploaded?: boolean | null;
  tour?: {
    id: string;
    title: string;
  } | null;
}

export default function CompleteTourClientPage() {
  const params = useParams();
  const tourId = params.tourId as string;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [webhookSuccess, setWebhookSuccess] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBooking() {
      try {
        const response = await fetch(`/api/complete-tour/${tourId}`);
        if (!response.ok) {
          throw new Error('Booking not found');
        }
        const data = await response.json();
        setBooking(data.booking);
        setWebhookSuccess(data.webhookSuccess);
        setIsCompleted(data.booking.status === 'completed');
      } catch (error) {
        console.error('Error loading booking:', error);
      } finally {
        setLoading(false);
      }
    }

    void loadBooking();
  }, [tourId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Filter to only image files
      const imageFiles = files.filter(file => 
        file.type.startsWith('image/')
      );
      setSelectedFiles(imageFiles);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (isCompleted) {
      setUploadError('Tour is already completed. No more photos can be uploaded.');
      return;
    }

    if (selectedFiles.length === 0) {
      setUploadError('Please select at least one file');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('bookingId', tourId);
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload-tour-photos', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadSuccess(true);
      setSelectedFiles([]);
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleCompleteTour = async () => {
    setCompleting(true);
    setCompleteError(null);

    try {
      const response = await fetch(`/api/complete-tour/${tourId}/complete`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete tour');
      }

      setIsCompleted(true);
      setWebhookSuccess(true);
      setSelectedFiles([]);
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error('Complete tour error:', error);
      setCompleteError(error instanceof Error ? error.message : 'Failed to complete tour');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-600" />
          <p className="mt-4 text-gray-600">Loading booking...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <XCircle className="mx-auto h-16 w-16 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Booking Not Found</h1>
          <p className="mt-2 text-gray-600">The booking ID could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg">
        {webhookSuccess ? (
          <>
            <div className="mb-6 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h1 className="mb-4 text-center text-2xl font-bold text-gray-900">
              Tour Completed Successfully
            </h1>
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                <XCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <h1 className="mb-4 text-center text-2xl font-bold text-gray-900">
              Tour Found
            </h1>
          </>
        )}

        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-600">Booking ID:</p>
          <p className="text-lg font-semibold text-gray-900">#{booking.id}</p>
          {booking.tour?.title && (
            <>
              <p className="mt-2 text-sm font-medium text-gray-600">Tour:</p>
              <p className="text-base font-semibold text-gray-900">{booking.tour.title}</p>
            </>
          )}
          {booking.city && (
            <p className="mt-2 text-sm text-gray-500">City: {booking.city}</p>
          )}
          {booking.tour_datetime && (
            <p className="mt-1 text-sm text-gray-500">
              Date: {new Date(booking.tour_datetime).toLocaleDateString()}
            </p>
          )}
        </div>

        {isCompleted && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-800">
                Tour completed successfully. No more photos can be uploaded.
              </p>
            </div>
          </div>
        )}

        {!isCompleted && webhookSuccess && (
          <p className="mb-6 text-center text-gray-600">
            The guide has successfully completed this tour. The completion has been recorded.
          </p>
        )}

        {/* File Upload Section */}
        <div className="mt-8 border-t pt-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Upload Tour Photos</h2>
          
          {isCompleted && (
            <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  This tour has been completed. Photo uploads are disabled.
                </p>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
                Select photos to upload
              </label>
              <div className="flex items-center gap-4">
                <Input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  disabled={isCompleted}
                />
                <Button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || uploading || isCompleted}
                  className="flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
              {selectedFiles.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedFiles.length} file(s) selected
                </p>
              )}
            </div>

            {uploadSuccess && (
              <div className="rounded-lg bg-green-50 p-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-800">Photos uploaded successfully!</p>
              </div>
            )}

            {uploadError && (
              <div className="rounded-lg bg-red-50 p-4 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800">{uploadError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Complete Tour Button */}
        {!isCompleted && (
          <div className="mt-8 border-t pt-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={completing}
                >
                  {completing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing Tour...
                    </>
                  ) : (
                    'Complete Tour'
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Complete Tour?</AlertDialogTitle>
                  <AlertDialogDescription>
                    <div className="space-y-2">
                      <p>
                        Are you sure you want to complete this tour? This action will:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Mark the tour as completed</li>
                        <li className="font-semibold text-red-600">
                          Disable all future photo uploads for this tour
                        </li>
                      </ul>
                      <p className="mt-2 font-medium">
                        Make sure you have uploaded all photos before completing the tour.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCompleteTour}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Yes, Complete Tour
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {completeError && (
              <div className="mt-4 rounded-lg bg-red-50 p-4 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800">{completeError}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

