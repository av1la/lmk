import { 
  Project, 
  ProjectId, 
  ProjectStatus, 
  ProjectVisibility,
  ProjectRepository,
  ProjectMember
} from './ProjectDomain';
import { UserId } from '@/domains/user/UserDomain';
import { WorkspaceId, WorkspaceRole } from '@/domains/workspace/WorkspaceDomain';
import { createWorkspaceService } from '@/domains/workspace/WorkspaceService';
import { createLogger } from '@/shared/logger';
import { MongoProjectRepository } from '@/adapters/mongodb/repositories/MongoProjectRepository';

const logger = createLogger('project-service');

export interface CreateProjectData {
  name: string;
  description?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  workspaceId: string;
  userId: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  customDomain?: string;
}

export interface ProjectServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: 'NOT_FOUND' | 'ACCESS_DENIED' | 'SLUG_EXISTS' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR';
    message: string;
  };
}

export class ProjectService {
  private workspaceService = createWorkspaceService();
  
  constructor(private projectRepository: ProjectRepository) {}

  async createProject(data: CreateProjectData): Promise<ProjectServiceResult<Project>> {
    try {
      logger.info('Creating new project', { name: data.name, userId: data.userId });

      // Validar dados
      if (!data.name || data.name.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Nome do projeto é obrigatório'
          }
        };
      }

      // Gerar slug único
      const baseSlug = this.generateSlug(data.name);
      const slug = await this.generateUniqueSlug(baseSlug);

      // Criar projeto
      const project = new Project({
        name: data.name.trim(),
        slug,
        description: data.description?.trim(),
        status: ProjectStatus.DRAFT,
        visibility: data.visibility === 'PUBLIC' ? ProjectVisibility.PUBLIC : ProjectVisibility.PRIVATE,
        workspaceId: new WorkspaceId(data.workspaceId),
        createdBy: new UserId(data.userId),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Salvar no repositório
      const savedProject = await this.projectRepository.save(project);

      logger.info('Project created successfully', { projectId: savedProject.id?.getValue() });

      return {
        success: true,
        data: savedProject
      };
    } catch (error) {
      logger.error('Error creating project', { error: error instanceof Error ? error.message : error });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      };
    }
  }

  async getProject(projectId: string, userId: string): Promise<ProjectServiceResult<Project>> {
    try {
      logger.info('Getting project', { projectId, userId });

      const project = await this.projectRepository.findById(new ProjectId(projectId));

      if (!project) {
        logger.warn('Project not found', { projectId });
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Projeto não encontrado'
          }
        };
      }

      // Verificar se o usuário tem acesso ao projeto
      if (project.createdBy.getValue() !== userId) {
        logger.warn('User does not have access to project', { projectId, userId, projectCreatedBy: project.createdBy.getValue() });
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Você não tem acesso a este projeto'
          }
        };
      }

      logger.info('Project retrieved successfully', { projectId });

      return {
        success: true,
        data: project
      };
    } catch (error) {
      logger.error('Error getting project', { error: error instanceof Error ? error.message : error, projectId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      };
    }
  }

  async updateProject(projectId: string, userId: string, data: UpdateProjectData): Promise<ProjectServiceResult<Project>> {
    try {
      logger.info('Updating project', { projectId, userId, data });

      // Buscar projeto existente
      const existingProject = await this.projectRepository.findById(new ProjectId(projectId));

      if (!existingProject) {
        logger.warn('Project not found for update', { projectId });
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Projeto não encontrado'
          }
        };
      }

      // Verificar acesso
      if (existingProject.createdBy.getValue() !== userId) {
        logger.warn('User does not have access to update project', { projectId, userId });
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Você não tem permissão para editar este projeto'
          }
        };
      }

      // Validar slug se foi alterado
      if (data.slug && data.slug !== existingProject.slug) {
        const isSlugAvailable = await this.isSlugAvailable(data.slug, projectId);
        if (!isSlugAvailable) {
          logger.warn('Slug already exists', { slug: data.slug });
          return {
            success: false,
            error: {
              code: 'SLUG_EXISTS',
              message: 'Já existe um projeto com este slug'
            }
          };
        }
      }

      // Preparar dados para atualização
      const updateData: Partial<Project> = {};

      if (data.name !== undefined) {
        if (!data.name.trim()) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Nome do projeto é obrigatório'
            }
          };
        }
        updateData.name = data.name.trim();
      }

      if (data.description !== undefined) {
        updateData.description = data.description.trim() || undefined;
      }

      if (data.visibility) {
        updateData.visibility = data.visibility === 'PUBLIC' ? ProjectVisibility.PUBLIC : ProjectVisibility.PRIVATE;
      }

      if (data.slug) {
        updateData.slug = data.slug;
      }

      updateData.updatedAt = new Date();

      // Salvar alterações
      const updatedProject = await this.projectRepository.update(new ProjectId(projectId), updateData);

      if (!updatedProject) {
        logger.error('Failed to update project', { projectId });
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erro ao atualizar projeto'
          }
        };
      }

      logger.info('Project updated successfully', { projectId });

      return {
        success: true,
        data: updatedProject
      };
    } catch (error) {
      logger.error('Error updating project', { error: error instanceof Error ? error.message : error, projectId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      };
    }
  }

  async deleteProject(projectId: string, userId: string): Promise<ProjectServiceResult<void>> {
    try {
      logger.info('Deleting project', { projectId, userId });

      // Buscar projeto existente
      const existingProject = await this.projectRepository.findById(new ProjectId(projectId));

      if (!existingProject) {
        logger.warn('Project not found for deletion', { projectId });
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Projeto não encontrado'
          }
        };
      }

      // Verificar acesso
      if (existingProject.createdBy.getValue() !== userId) {
        logger.warn('User does not have access to delete project', { projectId, userId });
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Você não tem permissão para excluir este projeto'
          }
        };
      }

      // Executar exclusão
      await this.projectRepository.delete(new ProjectId(projectId));

      logger.info('Project deleted successfully', { projectId });

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error deleting project', { error: error instanceof Error ? error.message : error, projectId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      };
    }
  }

  async getUserProjects(userId: string): Promise<ProjectServiceResult<Project[]>> {
    try {
      logger.info('Getting user projects', { userId });

      const projects = await this.projectRepository.findByUserId(new UserId(userId));

      logger.info('User projects retrieved', { userId, count: projects.length });

      return {
        success: true,
        data: projects
      };
    } catch (error) {
      logger.error('Error getting user projects', { error: error instanceof Error ? error.message : error, userId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      };
    }
  }

  async getWorkspaceProjects(workspaceId: string, userId: string): Promise<ProjectServiceResult<Project[]>> {
    try {
      logger.info('Getting workspace projects', { workspaceId, userId });
      
      // TODO: Verificar se o usuário tem acesso ao workspace
      // Por enquanto, assumindo que o usuário tem acesso
      
      const projects = await this.projectRepository.findByWorkspaceId(new WorkspaceId(workspaceId));
      logger.info('Workspace projects retrieved', { workspaceId, userId, count: projects.length });
      
      return {
        success: true,
        data: projects
      };
    } catch (error) {
      logger.error('Error getting workspace projects', { error: error instanceof Error ? error.message : error, workspaceId, userId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      };
    }
  }

  // Member management methods
  async getEffectiveMembers(projectId: string): Promise<ProjectServiceResult<ProjectMember[]>> {
    try {
      logger.info('Getting effective members for project', { projectId });

      const project = await this.projectRepository.findById(new ProjectId(projectId));
      if (!project) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Projeto não encontrado'
          }
        };
      }

      let members: ProjectMember[] = [];

      if (project.visibility === ProjectVisibility.PRIVATE) {
        // For private projects, return stored members
        members = project.members || [];
      } else {
        // For public projects, inherit all workspace members dynamically
        const workspace = await this.workspaceService.findById(project.workspaceId);
        if (workspace) {
          // Convert workspace members to project members format
          members = workspace.members.map(workspaceMember => ({
            userId: workspaceMember.userId,
            role: workspaceMember.role,
            addedAt: workspaceMember.joinedAt,
            addedBy: workspace.ownerId // Assume workspace owner added them
          }));

          // Add workspace owner if not already in members
          const ownerInMembers = members.find(m => m.userId.value === workspace.ownerId.value);
          if (!ownerInMembers) {
            members.unshift({
              userId: workspace.ownerId,
              role: WorkspaceRole.OWNER,
              addedAt: workspace.createdAt || new Date(),
              addedBy: workspace.ownerId
            });
          }
        }
      }

      logger.info('Effective members retrieved', { projectId, count: members.length, isPrivate: project.visibility === ProjectVisibility.PRIVATE });

      return {
        success: true,
        data: members
      };
    } catch (error) {
      logger.error('Error getting effective members', { error: error instanceof Error ? error.message : error, projectId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      };
    }
  }

  async addMemberToProject(projectId: string, userId: string, role: WorkspaceRole, addedBy: string): Promise<ProjectServiceResult<Project>> {
    try {
      logger.info('Adding member to project', { projectId, userId, role, addedBy });

      const project = await this.projectRepository.findById(new ProjectId(projectId));
      if (!project) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Projeto não encontrado'
          }
        };
      }

      if (project.visibility === ProjectVisibility.PUBLIC) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Não é possível adicionar membros específicos a projetos públicos. Todos os membros do workspace têm acesso automaticamente.'
          }
        };
      }

      // Add member using domain method
      project.addMember(new UserId(userId), role, new UserId(addedBy));

      // Save updated project
      const updatedProject = await this.projectRepository.update(new ProjectId(projectId), {
        members: project.members,
        updatedAt: new Date()
      });

      if (!updatedProject) {
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erro ao adicionar membro ao projeto'
          }
        };
      }

      logger.info('Member added to project successfully', { projectId, userId });

      return {
        success: true,
        data: updatedProject
      };
    } catch (error) {
      logger.error('Error adding member to project', { error: error instanceof Error ? error.message : error, projectId, userId });
      
      // Handle domain-specific errors
      if (error instanceof Error && error.message.includes('already a member')) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Usuário já é membro deste projeto'
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      };
    }
  }

  async removeMemberFromProject(projectId: string, userId: string): Promise<ProjectServiceResult<Project>> {
    try {
      logger.info('Removing member from project', { projectId, userId });

      const project = await this.projectRepository.findById(new ProjectId(projectId));
      if (!project) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Projeto não encontrado'
          }
        };
      }

      if (project.visibility === ProjectVisibility.PUBLIC) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Não é possível remover membros de projetos públicos'
          }
        };
      }

      // Remove member using domain method
      project.removeMember(new UserId(userId));

      // Save updated project
      const updatedProject = await this.projectRepository.update(new ProjectId(projectId), {
        members: project.members,
        updatedAt: new Date()
      });

      if (!updatedProject) {
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erro ao remover membro do projeto'
          }
        };
      }

      logger.info('Member removed from project successfully', { projectId, userId });

      return {
        success: true,
        data: updatedProject
      };
    } catch (error) {
      logger.error('Error removing member from project', { error: error instanceof Error ? error.message : error, projectId, userId });
      
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      };
    }
  }

  async updateProjectMemberRole(projectId: string, userId: string, role: WorkspaceRole): Promise<ProjectServiceResult<Project>> {
    try {
      logger.info('Updating project member role', { projectId, userId, role });

      const project = await this.projectRepository.findById(new ProjectId(projectId));
      if (!project) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Projeto não encontrado'
          }
        };
      }

      if (project.visibility === ProjectVisibility.PUBLIC) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Não é possível alterar papéis em projetos públicos'
          }
        };
      }

      // Update member role using domain method
      project.updateMemberRole(new UserId(userId), role);

      // Save updated project
      const updatedProject = await this.projectRepository.update(new ProjectId(projectId), {
        members: project.members,
        updatedAt: new Date()
      });

      if (!updatedProject) {
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erro ao atualizar papel do membro'
          }
        };
      }

      logger.info('Project member role updated successfully', { projectId, userId, role });

      return {
        success: true,
        data: updatedProject
      };
    } catch (error) {
      logger.error('Error updating project member role', { error: error instanceof Error ? error.message : error, projectId, userId });
      
      // Handle domain-specific errors
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Membro não encontrado no projeto'
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor'
        }
      };
    }
  }

  // Métodos privados de utilidade
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .trim()
      .substring(0, 50); // Limita tamanho
  }

  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (!(await this.isSlugAvailable(slug))) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private async isSlugAvailable(slug: string, excludeProjectId?: string): Promise<boolean> {
    try {
      // Como findBySlug precisa de workspaceId, vamos buscar todos os projetos e verificar o slug
      // Isso não é ideal, mas funciona como solução temporária
      const allProjects = await this.projectRepository.findAll();
      const existingProject = allProjects.find(p => p.slug === slug);
      
      if (!existingProject) {
        return true;
      }

      // Se estamos excluindo um projeto específico da verificação
      if (excludeProjectId && existingProject.id?.getValue() === excludeProjectId) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error checking slug availability', { error, slug });
      return false;
    }
  }
}

// Factory function
export function createProjectService(): ProjectService {
  const projectRepository = new MongoProjectRepository();
  return new ProjectService(projectRepository);
}