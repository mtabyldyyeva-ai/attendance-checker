const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://elinbqqqjczygagqpwnw.supabase.co',
  'sb_publishable__XfTdI8TeOn38PIAQP4Iag_dq_yMJAd'
);

async function check() {
  const { data, error } = await supabase
    .from('schedule')
    .select(`
        id, day_of_week, start_time, end_time,
        groups (name),
        subjects (name),
        users!schedule_teacher_id_fkey (full_name)
    `)
    .limit(1)
  console.log("Schedule Data:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
}

check();
