'use client'

import { createClient } from '@/utils/supabase/client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileDown, Calendar } from "lucide-react"
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function ReportsPage() {
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const downloadReport = async () => {
        setLoading(true)
        try {
            // Fetch all attendance data joined with user and lesson info
            const { data, error } = await supabase
                .from('attendance')
                .select(`
                status,
                timestamp,
                users (full_name, email),
                lessons (date)
            `)

            if (error) throw error

            if (!data || data.length === 0) {
                alert("No attendance data found.")
                return
            }

            // Convert to CSV
            const csvRows = []
            const headers = ["Student Name", "Email", "Date", "Time", "Status"]
            csvRows.push(headers.join(','))

            for (const row of data) {
                const values = [
                    // @ts-ignore
                    row.users?.full_name || 'Unknown',
                    // @ts-ignore
                    row.users?.email || 'Unknown',
                    // @ts-ignore
                    new Date(row.lessons?.date).toLocaleDateString(),
                    new Date(row.timestamp).toLocaleTimeString(),
                    row.status
                ]
                // Escape quotes
                const escapedValues = values.map(v => `"${v}"`)
                csvRows.push(escapedValues.join(','))
            }

            const csvString = csvRows.join('\n')
            const blob = new Blob([csvString], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.setAttribute('hidden', '')
            a.setAttribute('href', url)
            a.setAttribute('download', 'attendance_report.csv')
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)

        } catch (err: any) {
            console.error(err)
            alert("Failed to generate report: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Attendance Export</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-500 mb-4">
                            Download full attendance history as a CSV file compatible with Excel.
                        </p>
                        <Button onClick={downloadReport} disabled={loading} className="w-full">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Download CSV
                        </Button>
                    </CardContent>
                </Card>

                {/* Placeholder for more reports */}
                <Card className="opacity-50">
                    <CardHeader>
                        <CardTitle>Weekly Summary (PDF)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-500 mb-4">
                            Generate a PDF summary of weekly attendance statistics.
                        </p>
                        <Button disabled className="w-full" variant="secondary">
                            Coming Soon
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
