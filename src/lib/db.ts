import { createClient } from '@supabase/supabase-js';
import { Node, Edge } from '@xyflow/react';

export type AppNode = Node<{
  label: string;
  title?: string | null;
  avatarUrl?: string | null;
  contact?: string | null;
  address?: string | null;
  orderIndex?: number;
}, string>;
export type AppEdge = Edge;

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const cleanUrl = rawUrl.replace(/['"]/g, '').trim();
const supabaseUrl = cleanUrl.startsWith('http') ? cleanUrl : 'https://pmsscpcbdeswuvfjqxrh.supabase.co';

const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const cleanKey = rawKey.replace(/['"]/g, '').trim();
const supabaseAnonKey = cleanKey.length > 10 ? cleanKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtc3NjcGNiZGVzd3V2ZmpxeHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MTM5MTgsImV4cCI6MjEwNjM4OTkxOH0.hAAALKWCZFNG_NMLKjEgcrtz5gos_Pl8H-Bau4pOZ18';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
