'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { supabase, AppNode, AppEdge } from '@/lib/db';
import { getLayoutedElements } from '@/lib/layout';
import CustomNode from './CustomNode';
import UnionNode from './UnionNode';
import SearchableSelect from './SearchableSelect';
import { Plus, Users, Upload, X, Edit2, Trash2, AlertTriangle, Lock, LogOut, Phone, MapPin, Info, ChevronLeft, ChevronRight, GripHorizontal } from 'lucide-react';

const nodeTypes = {
  custom: CustomNode,
  union: UnionNode,
};

import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';

export default function TreeCanvas() {
  const [role, setRole] = useState<'guest' | 'family' | 'admin'>('guest');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    const savedRole = localStorage.getItem('ancestree_role');
    if (savedRole === 'family' || savedRole === 'admin') {
      setRole(savedRole as 'family' | 'admin');
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === 'keluarga') {
      setRole('family');
      localStorage.setItem('ancestree_role', 'family');
      setIsLoginModalOpen(false);
      setPinInput('');
    } else if (pinInput === 'rahasiaadmin') {
      setRole('admin');
      localStorage.setItem('ancestree_role', 'admin');
      setIsLoginModalOpen(false);
      setPinInput('');
    } else {
      setPinError(true);
    }
  };

  const handleLogout = () => {
    setRole('guest');
    localStorage.removeItem('ancestree_role');
  };
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>([]);
  const [dbNodes, setDbNodes] = useState<AppNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isDeleteFormOpen, setIsDeleteFormOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const [newContact, setNewContact] = useState('');
  const [newAddress, setNewAddress] = useState('');
  
  // Edit state additions
  const [editContact, setEditContact] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Profile Modal State
  const [selectedProfile, setSelectedProfile] = useState<AppNode | null>(null);

  // Inline Edit State
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineEditName, setInlineEditName] = useState('');
  const [inlineEditContact, setInlineEditContact] = useState('');
  const [inlineEditAddress, setInlineEditAddress] = useState('');

  // Move child states
  const [profileChildren, setProfileChildren] = useState<AppNode[]>([]);

  useEffect(() => {
    if (selectedProfile && dbNodes && edges) {
      // Cari union di mana selectedProfile menjadi parent
      const unions = edges.filter(e => e.source === selectedProfile.id && dbNodes.find(n => n.id === e.target)?.type === 'union').map(e => e.target);
      // Cari anak dari union tersebut
      const childrenViaUnion = edges.filter(e => unions.includes(e.source)).map(e => dbNodes.find(n => n.id === e.target)).filter(Boolean) as AppNode[];
      // Cari anak langsung (tanpa union / single parent)
      const directChildren = edges.filter(e => e.source === selectedProfile.id && dbNodes.find(n => n.id === e.target)?.type !== 'union').map(e => dbNodes.find(n => n.id === e.target)).filter(Boolean) as AppNode[];
      
      // Gabungkan dan filter unik
      let children = [...childrenViaUnion, ...directChildren];
      const uniqueChildrenIds = new Set();
      children = children.filter(c => {
        if (uniqueChildrenIds.has(c.id)) return false;
        uniqueChildrenIds.add(c.id);
        return true;
      });

      // Urutkan
      children = children.sort((a, b) => ((a.data.orderIndex as number) || 0) - ((b.data.orderIndex as number) || 0));
      setProfileChildren(children);
    } else {
      setProfileChildren([]);
    }
  }, [selectedProfile, dbNodes, edges]);

  const [draggedChildId, setDraggedChildId] = useState<string | null>(null);
  const [dragOverChildId, setDragOverChildId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (role === 'guest') {
      e.preventDefault();
      return;
    }
    setDraggedChildId(id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.4';
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedChildId(null);
    setDragOverChildId(null);
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedChildId !== id) {
      setDragOverChildId(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent, id: string) => {
    if (dragOverChildId === id) {
      setDragOverChildId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverChildId(null);
    
    if (!draggedChildId || draggedChildId === targetId) {
      setDraggedChildId(null);
      return;
    }

    const draggedIdx = profileChildren.findIndex(c => c.id === draggedChildId);
    const targetIdx = profileChildren.findIndex(c => c.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const newArr = [...profileChildren];
    const [draggedItem] = newArr.splice(draggedIdx, 1);
    newArr.splice(targetIdx, 0, draggedItem);

    setProfileChildren(newArr);
    setDraggedChildId(null);

    const updates = newArr.map((child, index) => 
      supabase.from('nodes').update({ order_index: index }).eq('id', child.id)
    );
    await Promise.all(updates);
    loadAndLayout();
  };

  const handleMoveChild = async (childId: string, direction: -1 | 1) => {
    const currentIndex = profileChildren.findIndex(c => c.id === childId);
    const swapIndex = currentIndex + direction;
    if (swapIndex < 0 || swapIndex >= profileChildren.length) return;

    const newArr = [...profileChildren];
    [newArr[currentIndex], newArr[swapIndex]] = [newArr[swapIndex], newArr[currentIndex]];

    // Optimistic UI update
    setProfileChildren(newArr);

    // Save to DB
    const updates = newArr.map((child, index) => 
      supabase.from('nodes').update({ order_index: index }).eq('id', child.id)
    );
    await Promise.all(updates);

    loadAndLayout();
  };


  const handleInlineSave = async () => {
    if (!selectedProfile) return;
    setIsSubmitting(true);
    await supabase.from('nodes').update({
      label: inlineEditName,
      contact: inlineEditContact,
      address: inlineEditAddress
    }).eq('id', selectedProfile.id);
    
    // Update local state instantly
    setSelectedProfile({
      ...selectedProfile,
      data: {
        ...selectedProfile.data,
        label: inlineEditName,
        contact: inlineEditContact,
        address: inlineEditAddress
      }
    });
    
    setIsInlineEditing(false);
    setIsSubmitting(false);
  };


  const [relationship, setRelationship] = useState<'child' | 'parent' | 'spouse'>('child');
  const [selectedRelativeId, setSelectedRelativeId] = useState('');
  const [secondaryRelativeId, setSecondaryRelativeId] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingNode, setEditingNode] = useState<{ id: string, name: string, avatarUrl: string | null } | null>(null);
  const [editSelectedId, setEditSelectedId] = useState('');
  const [editName, setEditName] = useState('');
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deleteSelectedId, setDeleteSelectedId] = useState('');

  useEffect(() => {
    if (editSelectedId) {
      const node = dbNodes.find(n => n.id === editSelectedId);
      if (node) {
        setEditingNode({ id: node.id, name: node.data.label as string, avatarUrl: node.data.avatarUrl as string | null });
        setEditName(node.data.label as string);
        setEditContact((node.data.contact as string) || '');
        setEditAddress((node.data.address as string) || '');
        setEditAvatarPreview(node.data.avatarUrl as string | null);
        setEditAvatarFile(null);
      }
    } else {
      setEditingNode(null);
      setEditName('');
      setEditContact('');
      setEditAddress('');
      setEditAvatarPreview(null);
      setEditAvatarFile(null);
    }
  }, [editSelectedId, dbNodes]);

  // Crop state
  const [rawAvatarUrl, setRawAvatarUrl] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Load data and apply layout
  const loadAndLayout = async () => {
    const [{ data: rawNodes }, { data: rawEdges }] = await Promise.all([
      supabase.from('nodes').select('*'),
      supabase.from('edges').select('*'),
    ]);

    const fetchedNodes: AppNode[] = (rawNodes || []).map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: n.position_x, y: n.position_y },
      data: { label: n.label, avatarUrl: n.avatar_url || null, contact: n.contact || null, address: n.address || null, orderIndex: n.order_index || 0 },
    }));

    fetchedNodes.sort((a, b) => (a.data.orderIndex as number) - (b.data.orderIndex as number));

    const fetchedEdges: AppEdge[] = (rawEdges || []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.source_handle || undefined,
      targetHandle: e.target_handle || undefined,
      type: 'step',
    }));

    setDbNodes(fetchedNodes);

    if (fetchedNodes.length === 0) {
      const rootId = uuidv4();
      await supabase.from('nodes').insert({
        id: rootId,
        type: 'custom',
        position_x: 0,
        position_y: 0,
        label: 'Leluhur Pertama',
      });
      return;
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(fetchedNodes, fetchedEdges);
    setNodes(layoutedNodes as AppNode[]);
    setEdges(layoutedEdges as Edge[]);
    setIsLoading(false);
  };

  const customNodeTypes = useMemo(() => ({
    custom: CustomNode,
    union: UnionNode
  }), []);

  useEffect(() => {
    loadAndLayout();

    const channel = supabase
      .channel('tree-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nodes' }, () => loadAndLayout())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'edges' }, () => loadAndLayout())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onConnect = useCallback(
    async (params: Connection | Edge) => {
      await supabase.from('edges').insert({
        id: uuidv4(),
        source: params.source,
        target: params.target,
        source_handle: (params as Connection).sourceHandle || null,
        target_handle: (params as Connection).targetHandle || null,
      });
    },
    []
  );

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validasi ukuran maksimal 5MB (5 * 1024 * 1024 bytes)
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran gambar maksimal adalah 5 MB. Silakan pilih gambar yang lebih kecil.');
      e.target.value = '';
      return;
    }

    console.log('[FileInput] onChange fired, file:', file.name, file.size);
    setRawAvatarUrl(URL.createObjectURL(file));
    setShowCropper(true);
    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const saveCrop = async () => {
    try {
      const croppedImageFile = await getCroppedImg(rawAvatarUrl!, croppedAreaPixels);
      if (croppedImageFile) {
        if (editingNode) {
          setEditAvatarFile(croppedImageFile);
          setEditAvatarPreview(URL.createObjectURL(croppedImageFile));
        } else {
          setAvatarFile(croppedImageFile);
          setAvatarPreview(URL.createObjectURL(croppedImageFile));
        }
      }
      setShowCropper(false);
    } catch (e) {
      console.error(e);
    }
  };

  const cancelCrop = () => {
    setShowCropper(false);
    setRawAvatarUrl(null);
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRawAvatarUrl(null);
  };

  const handleAddRelative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !selectedRelativeId) return;
    setIsSubmitting(true);

    const newNodeId = uuidv4();

    // Upload avatar if provided
    let avatarUrl: string | null = null;
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const filePath = `${newNodeId}.${fileExt}`;
      console.log('[Upload] Starting upload for', filePath, avatarFile.size, 'bytes');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });

      console.log('[Upload] Result:', uploadData, 'Error:', uploadError);

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = urlData.publicUrl;
        console.log('[Upload] Public URL:', avatarUrl);
      }
    }

    // Insert the new person
    await supabase.from('nodes').insert({
      id: newNodeId,
      type: 'custom',
      position_x: 0,
      position_y: 0,
      label: newName,
      avatar_url: avatarUrl,
      contact: newContact,
      address: newAddress,
    });

    const edgesToInsert: object[] = [];

    if (relationship === 'child' && secondaryRelativeId) {
      const p1 = selectedRelativeId;
      const p2 = secondaryRelativeId;
      const unionId = `union-${[p1, p2].sort().join('-')}`;

      const unionExists = dbNodes.find((n) => n.id === unionId);

      if (!unionExists) {
        await supabase.from('nodes').insert({
          id: unionId,
          type: 'union',
          position_x: 0,
          position_y: 0,
          label: 'Union',
        });

        edgesToInsert.push(
          { id: uuidv4(), source: p1, target: unionId, source_handle: 'union-source', target_handle: 'union-target', type: 'straight' },
          { id: uuidv4(), source: p2, target: unionId, source_handle: 'union-source', target_handle: 'union-target', type: 'straight' }
        );
      }

      edgesToInsert.push({ id: uuidv4(), source: unionId, target: newNodeId });

    } else if (relationship === 'spouse') {
      const p1 = selectedRelativeId;
      const p2 = newNodeId;
      const unionId = `union-${[p1, p2].sort().join('-')}`;

      await supabase.from('nodes').insert({
        id: unionId,
        type: 'union',
        position_x: 0,
        position_y: 0,
        label: 'Union',
      });

      edgesToInsert.push(
        { id: uuidv4(), source: p1, target: unionId, source_handle: 'union-source', target_handle: 'union-target', type: 'straight' },
        { id: uuidv4(), source: p2, target: unionId, source_handle: 'union-source', target_handle: 'union-target', type: 'straight' }
      );

    } else if (relationship === 'child') {
      edgesToInsert.push({
        id: uuidv4(),
        source: selectedRelativeId,
        target: newNodeId,
      });
    } else if (relationship === 'parent') {
      const existingParentEdges = edges.filter(e => e.target === selectedRelativeId);
      
      if (existingParentEdges.length === 0) {
        edgesToInsert.push({
          id: uuidv4(),
          source: newNodeId,
          target: selectedRelativeId,
        });
      } else {
        const parentEdge = existingParentEdges[0];
        const parentSourceId = parentEdge.source;
        const parentSourceNode = dbNodes.find(n => n.id === parentSourceId);

        if (parentSourceNode?.type === 'union') {
          alert("Anak ini sudah memiliki sepasang orang tua. Tidak bisa menambahkan orang tua ketiga.");
          setIsSubmitting(false);
          return;
        } else {
          const p1 = parentSourceId;
          const p2 = newNodeId;
          const unionId = `union-${[p1, p2].sort().join('-')}`;

          await supabase.from('nodes').insert({
            id: unionId,
            type: 'union',
            position_x: 0,
            position_y: 0,
            label: 'Union',
          });

          edgesToInsert.push(
            { id: uuidv4(), source: p1, target: unionId, source_handle: 'union-source', target_handle: 'union-target', type: 'straight' },
            { id: uuidv4(), source: p2, target: unionId, source_handle: 'union-source', target_handle: 'union-target', type: 'straight' }
          );

          await supabase.from('edges').delete().eq('id', parentEdge.id);
          edgesToInsert.push({
            id: uuidv4(),
            source: unionId,
            target: selectedRelativeId,
          });
        }
      }
    }

    if (edgesToInsert.length > 0) {
      await supabase.from('edges').insert(edgesToInsert);
    }

    setNewName('');
    setNewContact('');
    setNewAddress('');
    setSelectedRelativeId('');
    setSecondaryRelativeId('');
    clearAvatar();
    setIsSubmitting(false);
    setIsFormOpen(false);
  };

  const handleEditRelative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode || !editName) return;
    setIsSubmitting(true);

    let avatarUrl = editingNode.avatarUrl;
    
    // If a new avatar was uploaded via cropper
    if (editAvatarFile) {
      const fileExt = editAvatarFile.name.split('.').pop();
      const filePath = `${editingNode.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, editAvatarFile, { upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = urlData.publicUrl;
      }
    }

    await supabase.from('nodes').update({
      label: editName,
      avatar_url: avatarUrl,
      contact: editContact,
      address: editAddress
    }).eq('id', editingNode.id);

    setEditingNode(null);
    setEditSelectedId('');
    setEditName('');
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setIsSubmitting(false);
    setIsEditFormOpen(false);
  };

  const handleDeleteRelative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteSelectedId) return;
    setIsSubmitting(true);

    const id = deleteSelectedId;

    await supabase.from('edges').delete().or(`source.eq.${id},target.eq.${id}`);
    await supabase.from('nodes').delete().eq('id', id);

    // Cleanup orphaned union nodes
    const { data: allUnionNodes } = await supabase.from('nodes').select('id').eq('type', 'union');
    const { data: allEdges } = await supabase.from('edges').select('id, source, target');

    if (allUnionNodes && allEdges) {
      const orphanedUnionIds = allUnionNodes
        .filter(union => {
          const connections = allEdges.filter(e => e.source === union.id || e.target === union.id);
          return connections.length < 2;
        })
        .map(u => u.id);

      if (orphanedUnionIds.length > 0) {
        await supabase.from('edges').delete().in('source', orphanedUnionIds);
        await supabase.from('edges').delete().in('target', orphanedUnionIds);
        await supabase.from('nodes').delete().in('id', orphanedUnionIds);
      }
    }

    setDeleteSelectedId('');
    setIsDeleteFormOpen(false);
    setIsSubmitting(false);
  };

  return (
    <div className="w-screen h-[100dvh] bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => {
          if (node.type !== 'union') {
            setSelectedProfile(node as AppNode);
            setIsInlineEditing(false);
          }
        }}
        nodeTypes={customNodeTypes}
        defaultEdgeOptions={{
          type: 'step', // Membuat garis patah-patah 90 derajat
          style: { strokeWidth: 3, stroke: '#94a3b8' }, // Abu-abu cerah
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        className="bg-slate-50"
        minZoom={0.1}
      >
        <Background color="#cbd5e1" gap={24} size={2} />
        <Controls className="bg-white border-slate-200 fill-slate-700 [&>button]:bg-white [&>button]:border-slate-200 [&>button]:text-slate-700 hover:[&>button]:bg-slate-50" />

        <Panel position="top-left" className="m-4 mt-8 sm:m-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200 overflow-hidden bg-white border border-slate-100">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Ancestree</h1>
          </div>
        </Panel>


        <Panel position="top-right" className="m-4 mt-8 sm:m-6">
          {role === 'guest' ? (
            <button onClick={() => {setIsLoginModalOpen(true); setPinError(false);}} className="p-3 bg-white/90 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-full shadow-lg backdrop-blur-md transition-all border border-slate-100" title="Buka Edit">
              <Lock className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg border border-slate-100">
              <span className="text-sm font-semibold text-slate-700">
                Mode {role === 'admin' ? 'Admin' : 'Keluarga'}
              </span>
              <div className="w-px h-5 bg-slate-200" />
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-1 transition-colors" title="Keluar">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </Panel>

        {/* Bottom Navbar */}
        {role !== 'guest' && (
          <Panel position="bottom-center" className="mb-6 z-50">
            <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-4 bg-white/90 backdrop-blur-md rounded-full shadow-2xl border border-slate-200">
              {isLoading ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm px-4">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  Memuat...
                </div>
              ) : (
                <>
                  <button
                    onClick={() => { setIsFormOpen(true); setIsEditFormOpen(false); setIsDeleteFormOpen(false); }}
                    className="p-1.5 sm:p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full transition-all active:scale-95 group"
                    title="Tambah Kerabat"
                  >
                    <Plus className="w-4 h-4 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform" />
                  </button>
                  <div className="w-px h-5 sm:h-8 bg-slate-200" />
                  <button
                    onClick={() => { setIsEditFormOpen(true); setIsFormOpen(false); setIsDeleteFormOpen(false); }}
                    className="p-1.5 sm:p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-full transition-all active:scale-95"
                    title="Edit Data"
                  >
                    <Edit2 className="w-4 h-4 sm:w-6 sm:h-6" />
                  </button>
                  {role === 'admin' && (
                    <>
                      <div className="w-px h-5 sm:h-8 bg-slate-200" />
                      <button
                        onClick={() => { setIsDeleteFormOpen(true); setIsFormOpen(false); setIsEditFormOpen(false); }}
                        className="p-1.5 sm:p-3 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-500 rounded-full transition-all active:scale-95"
                        title="Hapus Data"
                      >
                        <Trash2 className="w-4 h-4 sm:w-6 sm:h-6" />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Modals */}

      {/* Profile Modal */}
      {selectedProfile && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in p-4" onClick={() => { if(!isInlineEditing) setSelectedProfile(null) }}>
          <div className="bg-white/95 border border-slate-200 rounded-3xl shadow-2xl w-full max-w-sm animate-bounce-in p-8 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-500 to-purple-600 animate-fade-in" />
            
            {role !== 'guest' && !isInlineEditing && (
              <button 
                onClick={() => {
                  setInlineEditName(selectedProfile.data.label as string);
                  setInlineEditContact((selectedProfile.data.contact as string) || '');
                  setInlineEditAddress((selectedProfile.data.address as string) || '');
                  setIsInlineEditing(true);
                }} 
                className="absolute top-4 left-4 w-9 h-9 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all hover:-rotate-12 z-10 flex items-center justify-center"
                title="Edit Profil Ini"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            <div className="relative mt-8 mb-6 flex flex-col items-center animate-bounce-in delay-200 fill-mode-both">
              <div className="w-32 h-32 bg-white rounded-full p-1.5 shadow-xl mb-4 transition-transform hover:scale-105 duration-300">
                {selectedProfile.data.avatarUrl ? (
                  <img src={selectedProfile.data.avatarUrl as string} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center">
                    <Users className="w-12 h-12 text-slate-400" />
                  </div>
                )}
              </div>
              
              {isInlineEditing ? (
                <input 
                  type="text" 
                  value={inlineEditName} 
                  onChange={e => setInlineEditName(e.target.value)} 
                  className="text-2xl font-bold text-slate-800 text-center w-full border-b-2 border-indigo-500 bg-transparent focus:outline-none px-2 py-1"
                  placeholder="Nama Lengkap"
                  autoFocus
                />
              ) : (
                <h2 className="text-2xl font-bold text-slate-800 text-center leading-tight">{selectedProfile.data.label as string}</h2>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-right-8 fade-in duration-500 delay-300 fill-mode-both hover:-translate-y-1 transition-transform cursor-default shadow-sm hover:shadow-md">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Nomor Handphone / WhatsApp</p>
                  {isInlineEditing ? (
                    <input 
                      type="text" 
                      value={inlineEditContact} 
                      onChange={e => setInlineEditContact(e.target.value)} 
                      className="text-sm font-semibold text-slate-800 w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500"
                      placeholder="Contoh: 08123456789"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedProfile.data.contact ? (
                        <a href={`https://wa.me/${(selectedProfile.data.contact as string).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:text-indigo-600 hover:underline">
                          {selectedProfile.data.contact as string}
                        </a>
                      ) : (
                        <span className="text-slate-400 font-normal italic">Belum ditambahkan</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-right-8 fade-in duration-500 delay-500 fill-mode-both hover:-translate-y-1 transition-transform cursor-default shadow-sm hover:shadow-md">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Alamat / Domisili</p>
                  {isInlineEditing ? (
                    <input 
                      type="text" 
                      value={inlineEditAddress} 
                      onChange={e => setInlineEditAddress(e.target.value)} 
                      className="text-sm font-semibold text-slate-800 w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500"
                      placeholder="Contoh: Jakarta"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedProfile.data.address ? (selectedProfile.data.address as string) : <span className="text-slate-400 font-normal italic">Belum ditambahkan</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {profileChildren.length > 0 && isInlineEditing && (
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in duration-500 delay-500">
                <p className="text-xs font-medium text-slate-500 mb-2">Urutan Anak (Geser & Lepas):</p>
                <div className="flex flex-wrap gap-2">
                  {profileChildren.map((child, idx) => (
                    <div 
                      key={child.id} 
                      draggable={role !== 'guest'}
                      onDragStart={(e) => handleDragStart(e, child.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, child.id)}
                      onDragLeave={(e) => handleDragLeave(e, child.id)}
                      onDrop={(e) => handleDrop(e, child.id)}
                      className={`flex items-center bg-white border ${
                        draggedChildId === child.id 
                          ? 'border-indigo-200 opacity-40' 
                          : dragOverChildId === child.id 
                            ? 'border-indigo-500 border-dashed border-2 bg-indigo-50 scale-105' 
                            : 'border-slate-200'
                      } rounded-full shadow-sm px-3 py-1.5 cursor-grab active:cursor-grabbing transition-all hover:border-indigo-300`}
                    >
                      <GripHorizontal className="w-3.5 h-3.5 text-slate-400 mr-2" />
                      <span className="text-xs font-semibold text-slate-700 max-w-[100px] truncate">{child.data.label as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {isInlineEditing ? (
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setIsInlineEditing(false)} 
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all active:scale-95"
                >
                  Batal
                </button>
                <button 
                  onClick={handleInlineSave} 
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all active:scale-95 flex justify-center items-center"
                >
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Simpan'}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setSelectedProfile(null)} 
                className="w-full mt-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all active:scale-95 animate-fade-in delay-700 fill-mode-both"
              >
                Tutup
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Login Modal */}
      {isLoginModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4" onClick={() => setIsLoginModalOpen(false)}>
          <div className="bg-white/95 border border-slate-200 rounded-3xl shadow-2xl w-full max-w-sm animate-bounce-in p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsLoginModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Lock className="w-7 h-7 text-indigo-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">Buka Kunci Edit</h2>
            <p className="text-sm text-slate-500 text-center mb-6">Masukkan PIN keluarga atau PIN admin untuk mengubah data silsilah.</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {setPinInput(e.target.value); setPinError(false);}}
                  className={`w-full px-4 py-3 bg-slate-50 border ${pinError ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-xl text-center text-lg tracking-widest text-slate-800 focus:outline-none focus:ring-2 transition-all`}
                  placeholder="••••••••"
                  required
                  autoFocus
                />
                {pinError && <p className="text-red-500 text-xs text-center mt-2">PIN salah, silakan coba lagi.</p>}
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Masuk
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {isFormOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4" onClick={() => setIsFormOpen(false)}>
          <div className="bg-white/95 border border-slate-200 rounded-3xl shadow-2xl w-full max-w-sm animate-bounce-in p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Anggota Keluarga Baru</h2>
            <form onSubmit={handleAddRelative} className="space-y-4">
              {/* Avatar Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5 text-center">Foto (Opsional)</label>
                {avatarPreview ? (
                  <div className="relative w-24 h-24 mx-auto">
                    <img src={avatarPreview} alt="Preview" className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-500 shadow-md" />
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); clearAvatar(); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="avatar-upload"
                    className="w-24 h-24 mx-auto flex flex-col items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-indigo-500 text-slate-500 hover:text-indigo-500 rounded-2xl transition-all text-sm cursor-pointer hover:bg-indigo-50/50"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-xs font-medium">Pilih Foto</span>
                  </label>
                )}
                <input
                  id="avatar-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="misal: Budi Santoso"
                  required
                />
              </div>

              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">No. HP / WA (Opsional)</label>
                  <input
                    type="text"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                    placeholder="misal: 08123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Domisili (Opsional)</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                    placeholder="misal: Jakarta Selatan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Hubungan</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value as 'child' | 'parent' | 'spouse')}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                  >
                    <option value="child">Anak</option>
                    <option value="parent">Orang Tua</option>
                    <option value="spouse">Pasangan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Dari</label>
                  <SearchableSelect
                    value={selectedRelativeId}
                    onChange={setSelectedRelativeId}
                    placeholder="Pilih kerabat..."
                    options={dbNodes.filter(n => n.type !== 'union').map(node => ({ value: node.id, label: node.data.label as string }))}
                  />
                </div>
              </div>

              {relationship === 'child' && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Orang Tua 2 (Opsional)</label>
                  <SearchableSelect
                    value={secondaryRelativeId}
                    onChange={setSecondaryRelativeId}
                    placeholder="Tidak ada"
                    options={[{value: '', label: 'Tidak ada'}, ...dbNodes.filter(node => node.id !== selectedRelativeId && node.type !== 'union').map(node => ({ value: node.id, label: node.data.label as string }))]}
                  />
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : 'Simpan Kerabat'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {isEditFormOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4" onClick={() => setIsEditFormOpen(false)}>
          <div className="bg-white/95 border border-slate-200 rounded-3xl shadow-2xl w-full max-w-sm animate-bounce-in p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsEditFormOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Edit Data Kerabat</h2>
            <form onSubmit={handleEditRelative} className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Pilih Kerabat</label>
                <SearchableSelect
                  value={editSelectedId}
                  onChange={setEditSelectedId}
                  placeholder="Pilih kerabat untuk diedit..."
                  options={dbNodes.filter(n => n.type !== 'union').map(node => ({ value: node.id, label: node.data.label as string }))}
                />
              </div>

              {editingNode && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2 text-center">Ubah Foto</label>
                    {editAvatarPreview ? (
                      <div className="relative w-24 h-24 mx-auto group">
                        <img src={editAvatarPreview} alt="Preview" className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-500 shadow-md" />
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setEditAvatarPreview(null); setEditAvatarFile(null); }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="edit-avatar-upload"
                        className="w-24 h-24 mx-auto flex flex-col items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-indigo-500 text-slate-500 hover:text-indigo-500 rounded-2xl transition-all cursor-pointer group hover:bg-indigo-50/50"
                      >
                        <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">Ganti Foto</span>
                      </label>
                    )}
                    <input
                      id="edit-avatar-upload"
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Nama Baru</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">No. HP / WA (Opsional)</label>
                      <input
                        type="text"
                        value={editContact}
                        onChange={(e) => setEditContact(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                        placeholder="misal: 08123456789"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Domisili (Opsional)</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                        placeholder="misal: Jakarta Selatan"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : 'Simpan Perubahan'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>,
        document.body
      )}

      {isDeleteFormOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4" onClick={() => setIsDeleteFormOpen(false)}>
          <div className="bg-white/95 border border-slate-200 rounded-3xl shadow-2xl w-full max-w-sm animate-bounce-in p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsDeleteFormOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Hapus Kerabat</h2>
            
            <form onSubmit={handleDeleteRelative} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5 text-center">Pilih Kerabat yang akan Dihapus</label>
                <SearchableSelect
                  value={deleteSelectedId}
                  onChange={setDeleteSelectedId}
                  placeholder="Pilih nama kerabat..."
                  options={dbNodes.filter(n => n.type !== 'union').map(node => ({ value: node.id, label: node.data.label as string }))}
                />
              </div>

              {deleteSelectedId && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm text-center">
                  Tindakan ini tidak dapat dibatalkan. Menghapus kerabat akan menghapus hubungan yang berkaitan dengannya dari silsilah.
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !deleteSelectedId}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-red-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : 'Hapus Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Crop Modal */}
      {showCropper && rawAvatarUrl && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={cancelCrop}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[500px]" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-slate-800 font-semibold">Atur Posisi Foto</h3>
              <button onClick={cancelCrop} className="p-1 text-slate-400 hover:text-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative flex-1 bg-black w-full h-full">
              <Cropper
                image={rawAvatarUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-4 bg-white border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-slate-500 text-xs">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancelCrop}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={saveCrop}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg transition-all"
                >
                  Simpan Foto
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
