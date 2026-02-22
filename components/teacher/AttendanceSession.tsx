'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Camera, UserCheck, UserX } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Types
interface Student {
    id: string
    full_name: string
    descriptors: Float32Array[]
}

interface AttendanceRecord {
    studentId: string
    name: string
    timestamp: Date
}

export function AttendanceSession() {
    const [loading, setLoading] = useState(true)
    const [initializing, setInitializing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [students, setStudents] = useState<Student[]>([])
    const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([])
    // const [modelsLoaded, setModelsLoaded] = useState(false) // Unused

    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null)
    const supabase = createClient()
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // 1. Load Models and Student Data
    useEffect(() => {
        const setup = async () => {
            try {
                setInitializing(true)
                const MODEL_URL = '/models'

                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ])

                // setModelsLoaded(true)

                // Fetch students and descriptors
                // For MVP, fetching ALL students. In production, filter by group.
                const { data: usersData, error: usersError } = await supabase
                    .from('users')
                    .select('id, full_name, role')
                    .eq('role', 'student')

                if (usersError) throw usersError

                const { data: descriptorsData, error: descError } = await supabase
                    .from('face_descriptors')
                    .select('user_id, descriptor')

                if (descError) throw descError

                // Process descriptors
                const labeledDescriptors: faceapi.LabeledFaceDescriptors[] = []
                const studentMap: Student[] = []

                if (usersData) {
                    for (const user of usersData) {
                        const userDescriptors = descriptorsData
                            ?.filter((d) => d.user_id === user.id)
                            .map((d) => new Float32Array(d.descriptor)) || []

                        if (userDescriptors.length > 0) {
                            labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(user.id, userDescriptors))
                            studentMap.push({
                                id: user.id,
                                full_name: user.full_name,
                                descriptors: userDescriptors
                            })
                        }
                    }
                }

                setStudents(studentMap)

                if (labeledDescriptors.length > 0) {
                    // Using a higher threshold for better accuracy
                    setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.6))
                }

                setInitializing(false)
                setLoading(false)

            } catch (err: unknown) {
                console.error(err)
                const errorMessage = err instanceof Error ? err.message : String(err)
                setError('Failed to initialize session: ' + errorMessage)
                setInitializing(false)
                setLoading(false)
            }
        }

        setup()

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [supabase])

    const [isStreamActive, setIsStreamActive] = useState(false)

    // 2. Start Video
    const startVideo = () => {
        navigator.mediaDevices
            .getUserMedia({ video: {} })
            .then((stream) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.play().catch(e => console.error("Play error:", e))
                    setIsStreamActive(true)
                }
            })
            .catch((err) => setError("Camera access denied: " + err))
    }

    const stopVideo = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream
            stream.getTracks().forEach(track => track.stop())
            videoRef.current.srcObject = null
            setIsStreamActive(false)
        }
    }

    // 3. Handlers
    const handleVideoOnPlay = () => {
        // Just trigger detection loop
        const displaySize = {
            width: videoRef.current?.videoWidth || 640,
            height: videoRef.current?.videoHeight || 480
        }

        if (canvasRef.current && videoRef.current) {
            faceapi.matchDimensions(canvasRef.current, displaySize)
        }

        startDetectionLoop()
    }

    const startDetectionLoop = () => {
        intervalRef.current = setInterval(async () => {
            if (!videoRef.current || !canvasRef.current || !faceMatcher || videoRef.current.paused || videoRef.current.ended) return

            const displaySize = {
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight
            }

            try {
                const detections = await faceapi.detectAllFaces(videoRef.current)
                    .withFaceLandmarks()
                    .withFaceDescriptors()

                const resizedDetections = faceapi.resizeResults(detections, displaySize)

                // Clear canvas
                const canvas = canvasRef.current
                if (!canvas) return
                const ctx = canvas.getContext('2d')
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)

                // Match faces
                resizedDetections.forEach(({ descriptor, detection }) => {
                    const bestMatch = faceMatcher.findBestMatch(descriptor)

                    if (bestMatch.label !== 'unknown') {
                        const student = students.find(s => s.id === bestMatch.label)
                        if (student) {
                            markAttendance(student)
                            const box = detection.box
                            const drawBox = new faceapi.draw.DrawBox(box, { label: student.full_name })
                            drawBox.draw(canvas)
                        }
                    } else {
                        const box = detection.box
                        const drawBox = new faceapi.draw.DrawBox(box, { label: "Unknown" })
                        drawBox.draw(canvas)
                    }
                })
            } catch (e: unknown) {
                console.error("Detection error:", e)
            }

        }, 500)
    }


    const markAttendance = (student: Student) => {
        setAttendanceList(prev => {
            if (prev.find(p => p.studentId === student.id)) return prev
            return [...prev, { studentId: student.id, name: student.full_name, timestamp: new Date() }]
        })
    }

    // 4. Finish Class
    const finishClass = async () => {
        if (attendanceList.length === 0) {
            if (!confirm("No students marked present. Are you sure you want to finish?")) return;
        }

        setLoading(true)

        try {
            // Get current user (teacher)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated as teacher")

            // 1. Create a Lesson Record (Mocking subject/group for now)
            // In production, these IDs would come from the selected schedule/class
            const { data: lesson, error: lessonError } = await supabase
                .from('lessons')
                .insert({
                    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                    status: 'completed',
                    teacher_id: user.id
                    // group_id, subject_id would go here
                })
                .select()
                .single()

            if (lessonError) throw lessonError

            // 2. Create Attendance Records
            if (attendanceList.length > 0) {
                const records = attendanceList.map(record => ({
                    lesson_id: lesson.id,
                    student_id: record.studentId,
                    status: 'present',
                    timestamp: record.timestamp.toISOString()
                }))

                const { error: attError } = await supabase
                    .from('attendance')
                    .insert(records)

                if (attError) throw attError
            }

            alert(`Class finished successfully! Saved ${attendanceList.length} records.`)
            setAttendanceList([])

            // Stop camera
            stopVideo()

        } catch (err: unknown) {
            console.error(err)
            const errorMessage = err instanceof Error ? err.message : String(err)
            alert("Failed to save attendance: " + errorMessage)
        } finally {
            setLoading(false)
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }

    // Cleanup
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
            stopVideo()
        }
    }, [])


    return (
        <div className="flex flex-col gap-6">
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {loading || initializing ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p>Loading Face Recognition Models & Student Data...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <CardContent className="p-4 bg-black rounded-lg overflow-hidden relative min-h-[480px] flex items-center justify-center">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                onPlay={handleVideoOnPlay}
                                className="bg-black w-full h-full object-contain"
                            />
                            <canvas
                                ref={canvasRef}
                                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                            />

                            {!isStreamActive && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 z-10">
                                    <Button onClick={startVideo} size="lg">
                                        <Camera className="mr-2 h-6 w-6" /> Start Class Camera
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                        <div className="p-4 flex justify-end gap-4">
                            <Button variant="destructive" onClick={stopVideo} disabled={!isStreamActive}>
                                Stop Camera
                            </Button>
                            <Button onClick={finishClass} className="bg-green-600 hover:bg-green-700">Finish Class</Button>
                        </div>
                    </Card>

                    <Card className="h-full flex flex-col">
                        <div className="p-4 border-b bg-gray-50 dark:bg-gray-900 rounded-t-lg">
                            <h3 className="font-semibold flex items-center">
                                <UserCheck className="mr-2 h-5 w-5 text-green-600" />
                                Attendance List ({attendanceList.length})
                            </h3>
                        </div>
                        <CardContent className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[500px]">
                            {attendanceList.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <UserX className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                    <p>No students detected yet.</p>
                                </div>
                            ) : (
                                attendanceList.map(record => (
                                    <div key={record.studentId} className="flex items-center justify-between p-3 bg-white border rounded shadow-sm">
                                        <span className="font-medium">{record.name}</span>
                                        <span className="text-xs text-gray-500 font-mono">
                                            {record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
