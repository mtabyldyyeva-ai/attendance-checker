'use client'

import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Upload, Camera } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface FaceUploadProps {
    userId: string
    onComplete?: () => void
}

export function FaceUpload({ userId, onComplete }: FaceUploadProps) {
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models'
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ])
                setModelsLoaded(true)
            } catch (err) {
                console.error('Failed to load face-api models', err)
                setError('Failed to load face recognition models. Ensure /public/models exists.')
            } finally {
                setLoading(false)
            }
        }
        loadModels()
    }, [])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            const imageUrl = URL.createObjectURL(file)
            setImagePreview(imageUrl)
            processImage(imageUrl)
        }
    }

    const processImage = async (imageUrl: string) => {
        setProcessing(true)
        setError(null)

        try {
            const img = await faceapi.fetchImage(imageUrl)
            const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()

            if (!detections) {
                setError('No face detected. Please try another photo.')
                setProcessing(false)
                return
            }

            const descriptor = Array.from(detections.descriptor)

            // Save to Supabase
            const { error: dbError } = await supabase
                .from('face_descriptors')
                .insert({
                    user_id: userId,
                    descriptor: descriptor
                })

            if (dbError) {
                throw dbError
            }

            alert('Face data saved successfully!')
            if (onComplete) onComplete()
            setImagePreview(null)

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error processing image')
        } finally {
            setProcessing(false)
        }
    }

    if (loading) return <div>Loading models...</div>

    return (
        <Card>
            <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-medium">Face Recognition Data</h3>

                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="flex flex-col items-center gap-4">
                    {imagePreview ? (
                        <div className="relative w-64 h-64 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                            <img src={imagePreview} alt="Preview" className="object-cover w-full h-full" />
                        </div>
                    ) : (
                        <div className="w-64 h-64 rounded-md border-2 border-dashed flex items-center justify-center bg-gray-50 text-gray-400">
                            <Camera className="w-12 h-12" />
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={processing}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Photo
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    {processing && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing face data...
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
