import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Auto-close lessons that were scheduled more than 7 days ago
 * but never had an attendance session conducted.
 * Creates a 'completed' lesson and marks all expected students as 'absent'.
 */
export async function autoClosePastLessons(supabase: SupabaseClient) {
    try {
        const now = new Date()
        const oneWeekAgo = new Date(now)
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

        // Get all schedule entries with their assigned students
        const { data: schedules, error: schedErr } = await supabase
            .from('schedule')
            .select('id, group_id, subject_id, teacher_id, day_of_week, start_time, start_date, end_date')

        if (schedErr || !schedules || schedules.length === 0) return

        // For each schedule, check up to 4 weeks back for missing lessons
        const datesToCheck: { scheduleId: string; date: string; groupId: string; subjectId: string; teacherId: string }[] = []

        for (const sch of schedules) {
            // Generate past dates for this day_of_week (up to 4 weeks back)
            for (let weeksBack = 1; weeksBack <= 4; weeksBack++) {
                const d = new Date(now)
                // Go back to the correct day_of_week
                const currentDow = d.getDay()
                const targetDow = sch.day_of_week
                let daysBack = currentDow - targetDow
                if (daysBack <= 0) daysBack += 7
                daysBack += (weeksBack - 1) * 7

                const pastDate = new Date(now)
                pastDate.setDate(pastDate.getDate() - daysBack)
                pastDate.setHours(0, 0, 0, 0)

                // Only process dates older than 7 days
                if (pastDate > oneWeekAgo) continue
                // Don't go further back than 4 weeks
                const fourWeeksAgo = new Date(now)
                fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
                if (pastDate < fourWeeksAgo) continue

                // Skip if outside the schedule's active period
                const dateStr2 = pastDate.toISOString().split('T')[0]
                if (sch.start_date && dateStr2 < sch.start_date) continue
                if (sch.end_date && dateStr2 > sch.end_date) continue

                const dateStr = pastDate.toISOString().split('T')[0]
                datesToCheck.push({
                    scheduleId: sch.id,
                    date: dateStr,
                    groupId: sch.group_id,
                    subjectId: sch.subject_id,
                    teacherId: sch.teacher_id,
                })
            }
        }

        if (datesToCheck.length === 0) return

        // Get all existing lessons for these schedule+date combos to avoid duplicates
        const scheduleIds = [...new Set(datesToCheck.map(d => d.scheduleId))]
        const dates = [...new Set(datesToCheck.map(d => d.date))]

        const { data: existingLessons } = await supabase
            .from('lessons')
            .select('schedule_id, date')
            .in('schedule_id', scheduleIds)
            .in('date', dates)

        const existingSet = new Set(
            (existingLessons || []).map(l => `${l.schedule_id}_${l.date}`)
        )

        // Filter to only missing lessons
        const missing = datesToCheck.filter(
            d => !existingSet.has(`${d.scheduleId}_${d.date}`)
        )

        if (missing.length === 0) return

        // Fetch schedule_students for all relevant schedules
        const missingScheduleIds = [...new Set(missing.map(m => m.scheduleId))]

        const { data: scheduleStudents } = await supabase
            .from('schedule_students')
            .select('schedule_id, student_id')
            .in('schedule_id', missingScheduleIds)

        // Also fetch group-based students as fallback
        const missingGroupIds = [...new Set(missing.map(m => m.groupId).filter(Boolean))]
        let groupStudents: { id: string; group_id: string }[] = []
        if (missingGroupIds.length > 0) {
            const { data } = await supabase
                .from('users')
                .select('id, group_id')
                .eq('role', 'student')
                .in('group_id', missingGroupIds)
            groupStudents = data || []
        }

        // Create lessons and attendance records
        for (const m of missing) {
            // Create the lesson
            const { data: lesson, error: lessonErr } = await supabase
                .from('lessons')
                .insert({
                    schedule_id: m.scheduleId,
                    date: m.date,
                    status: 'completed',
                    group_id: m.groupId,
                    subject_id: m.subjectId,
                    teacher_id: m.teacherId,
                })
                .select('id')
                .single()

            if (lessonErr || !lesson) continue

            // Get students for this schedule
            const assigned = (scheduleStudents || [])
                .filter(ss => ss.schedule_id === m.scheduleId)
                .map(ss => ss.student_id)

            let studentIds = assigned
            if (studentIds.length === 0 && m.groupId) {
                // Fallback to group students
                studentIds = groupStudents
                    .filter(s => s.group_id === m.groupId)
                    .map(s => s.id)
            }

            if (studentIds.length === 0) continue

            // Mark all as absent
            const absentRecords = studentIds.map(sid => ({
                lesson_id: lesson.id,
                student_id: sid,
                status: 'absent',
                timestamp: new Date(m.date + 'T' + '23:59:00').toISOString(),
            }))

            await supabase.from('attendance').insert(absentRecords)
        }
    } catch (err) {
        console.error('autoClosePastLessons error:', err)
    }
}
