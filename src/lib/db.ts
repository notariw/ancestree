import Dexie, { type EntityTable } from 'dexie';
import { Node, Edge } from '@xyflow/react';

export type AppNode = Node;
export type AppEdge = Edge;

const db = new Dexie('AncestreeDB') as Dexie & {
  nodes: EntityTable<AppNode, 'id'>;
  edges: EntityTable<AppEdge, 'id'>;
};

db.version(1).stores({
  nodes: 'id',
  edges: 'id'
});

export { db };
