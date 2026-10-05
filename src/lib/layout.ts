import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';

const nodeWidth = 140;
const nodeHeight = 220;

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  dagreGraph.setGraph({ 
    rankdir: direction, 
    nodesep: 80, // Jarak menyamping antar saudara
    edgesep: 30, 
    ranksep: 120  // Jarak vertikal diperbesar agar garis horizontal anak tidak menabrak kartu orang tua
  });

  // Identify blood nodes, spouse nodes, and union nodes
  const unionNodes = nodes.filter(n => n.type === 'union');
  const mergedSpouses = new Map<string, string>(); // spouseId -> bloodNodeId
  const unionToBlood = new Map<string, string>(); // unionId -> bloodNodeId
  
  unionNodes.forEach(union => {
    const parentEdges = edges.filter(e => e.target === union.id);
    if (parentEdges.length === 2) {
      const p1 = nodes.find(n => n.id === parentEdges[0].source);
      const p2 = nodes.find(n => n.id === parentEdges[1].source);
      
      if (p1 && p2) {
        const p1HasParents = edges.some(e => e.target === p1.id && e.source !== union.id);
        const p2HasParents = edges.some(e => e.target === p2.id && e.source !== union.id);
        
        let blood = p1;
        let spouse = p2;
        
        // P1 tidak punya orang tua, tapi P2 punya -> P2 adalah blood, P1 adalah spouse pendatang
        if (!p1HasParents && p2HasParents) {
          blood = p2;
          spouse = p1;
        }
        
        mergedSpouses.set(spouse.id, blood.id);
        unionToBlood.set(union.id, blood.id);
      }
    }
  });

  // Insert nodes to Dagre
  nodes.forEach((node) => {
    if (mergedSpouses.has(node.id)) return; // Sembunyikan spouse dari Dagre
    if (unionToBlood.has(node.id)) return;  // Sembunyikan union dari Dagre
    
    // Jika node ini punya spouse, perlebar ukurannya jadi 2x lipat + nodesep
    const isBloodWithSpouse = Array.from(mergedSpouses.values()).includes(node.id);
    
    dagreGraph.setNode(node.id, { 
      width: isBloodWithSpouse ? (nodeWidth * 2 + 80) : nodeWidth, 
      height: nodeHeight 
    });
  });

  // Insert edges to Dagre
  edges.forEach((edge) => {
    let source = edge.source;
    let target = edge.target;
    
    // Alihkan koneksi dari/ke spouse/union menuju ke node utamanya (Blood Node)
    if (mergedSpouses.has(source)) source = mergedSpouses.get(source)!;
    if (unionToBlood.has(source)) source = unionToBlood.get(source)!;
    
    if (mergedSpouses.has(target)) target = mergedSpouses.get(target)!;
    if (unionToBlood.has(target)) target = unionToBlood.get(target)!;
    
    // Hindari loop ke diri sendiri (misal dari blood ke union yang sekarang jadi blood ke blood)
    if (source !== target) {
      dagreGraph.setEdge(source, target, { minlen: 1 });
    }
  });

  dagre.layout(dagreGraph);

  // Post-processing: Kembalikan spouse dan union ke posisi sebenarnya
  const layoutedNodes = nodes.map((node) => {
    // Jika node adalah Spouse
    if (mergedSpouses.has(node.id)) {
      const bloodId = mergedSpouses.get(node.id)!;
      const bloodPos = dagreGraph.node(bloodId);
      return {
        ...node,
        position: {
          x: bloodPos.x + 40, // Letakkan di sebelah kanan (180 - 140 = 40)
          y: bloodPos.y - (nodeHeight / 2)
        }
      };
    }
    
    // Jika node adalah Union
    if (unionToBlood.has(node.id)) {
      const bloodId = unionToBlood.get(node.id)!;
      const bloodPos = dagreGraph.node(bloodId);
      return {
        ...node,
        position: {
          x: bloodPos.x - 16, // Persis di tengah-tengah blok gabungan
          y: bloodPos.y - 16
        }
      };
    }

    // Jika node normal atau Blood Node
    const nodeWithPosition = dagreGraph.node(node.id);
    const isBloodWithSpouse = Array.from(mergedSpouses.values()).includes(node.id);
    
    return {
      ...node,
      position: {
        // Jika dia adalah Blood Node, geser ke kiri blok gabungan
        x: nodeWithPosition.x - (isBloodWithSpouse ? (nodeWidth + 40) : (nodeWidth / 2)),
        y: nodeWithPosition.y - (nodeHeight / 2),
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};
