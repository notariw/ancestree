import { createClient } from '@supabase/supabase-js';
import { Node, Edge } from '@xyflow/react';

export type AppNode = Node;
export type AppEdge = Edge;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
