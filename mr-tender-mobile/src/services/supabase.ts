import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dysvpqdgqpidieshwrgv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5c3ZwcWRncXBpZGllc2h3cmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NTkzOTksImV4cCI6MjEwMjIzNTM5OX0.PU41_9Q5BcHyvS3Eb5uBjZ7e57yTq3HWjK9rP6tVYMc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
