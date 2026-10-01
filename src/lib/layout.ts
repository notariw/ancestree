import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';

const nodeWidth = 220;
const nodeHeight = 90;

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, edgesep: 50, ranksep: 100 });

  nodes.forEach((node) => {
    const isUnion = node.type === 'union';
    dagreGraph.setNode(node.id, { 
      width: isUnion ? 32 : nodeWidth, 
      height: isUnion ? 32 : nodeHeight 
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isUnion = node.type === 'union';
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (isUnion ? 16 : nodeWidth / 2),
        y: nodeWithPosition.y - (isUnion ? 16 : nodeHeight / 2),
      },
    };
  });

  // Post-process to align union nodes perfectly horizontally and vertically with their parents
  layoutedNodes.forEach(node => {
    if (node.type === 'union') {
      // Find incoming edges to this union node
      const parentEdges = edges.filter(e => e.target === node.id);
      if (parentEdges.length > 0) {
        // Find the parent nodes
        const parentNodes = layoutedNodes.filter(n => parentEdges.some(e => e.source === n.id));
        
        if (parentNodes.length === 2) {
          // If there are exactly 2 parents, put the union node exactly in the middle of them
          const p1 = parentNodes[0];
          const p2 = parentNodes[1];
          
          const centerX = (p1.position.x + p2.position.x) / 2;
          const centerY = (p1.position.y + p2.position.y) / 2;
          
          node.position.x = centerX + (nodeWidth / 2) - 16;
          node.position.y = centerY + (nodeHeight / 2) - 16;
        } else if (parentNodes.length > 0) {
          // Fallback if there's somehow only 1 or >2 parents
          const avgCenterX = parentNodes.reduce((sum, p) => sum + (p.position.x + nodeWidth / 2), 0) / parentNodes.length;
          const avgCenterY = parentNodes.reduce((sum, p) => sum + (p.position.y + nodeHeight / 2), 0) / parentNodes.length;
          node.position.x = avgCenterX - 16;
          node.position.y = avgCenterY - 16;
        }
      }
    }
  });

  return { nodes: layoutedNodes, edges };
};
