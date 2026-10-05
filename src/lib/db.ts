import { createClient } from '@supabase/supabase-js';
import { Node, Edge } from '@xyflow/react';

export type AppNode = Node;
export type AppEdge = Edge;

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy').trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
