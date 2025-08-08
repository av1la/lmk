"use client"

import { useState, useEffect } from 'react';
import { WorkspaceRole } from '@/domains/workspace/WorkspaceDomain';

export interface Member {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  name: string;
  email: string;
  avatar?: string;
  joinedAt?: string;
  invitedAt?: string;
  lastActiveAt?: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemberStats {
  total: number;
  active: number;
  pending: number;
  inactive: number;
  owners: number;
  admins: number;
  editors: number;
  viewers: number;
}

export function useMembers(workspaceId?: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<MemberStats>({ 
    total: 0, active: 0, pending: 0, inactive: 0,
    owners: 0, admins: 0, editors: 0, viewers: 0 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!workspaceId) {
      setMembers([]);
      setStats({ total: 0, active: 0, pending: 0, inactive: 0, owners: 0, admins: 0, editors: 0, viewers: 0 });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/workspace/${workspaceId}/members`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Não autorizado. Faça login novamente.');
        }
        throw new Error('Erro ao carregar membros');
      }
      
      const data = await response.json();
      setMembers(data.members || []);
      
      // Map API stats to frontend format
      const apiStats = data.stats || {};
      setStats({
        total: apiStats.total || 0,
        active: data.members?.length || 0, // All current members are active
        pending: 0, // TODO: implement invites/pending logic
        inactive: 0, // No inactive members for now
        owners: apiStats.owners || 0,
        admins: apiStats.admins || 0,
        editors: apiStats.editors || 0,
        viewers: apiStats.viewers || 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setMembers([]);
      setStats({ total: 0, active: 0, pending: 0, inactive: 0, owners: 0, admins: 0, editors: 0, viewers: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [workspaceId]);

  return {
    members,
    stats,
    loading,
    error,
    refetch: fetchMembers
  };
}