import { BaseId } from '@/shared/util/BaseId';
import { UserId } from '@/domains/user/UserDomain';
import { ProjectId } from '@/domains/project/ProjectDomain';

export class PageId extends BaseId {
  toString(): string {
    return `PAGE-ID-${this.value}`;
  }
}

export enum PageStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED'
}

export enum PageType {
  LANDING = 'LANDING',
  BLOG = 'BLOG',
  ABOUT = 'ABOUT',
  CONTACT = 'CONTACT',
  CUSTOM = 'CUSTOM'
}

export interface GrapesJSComponent {
  tagName?: string;
  type?: string;
  content?: string;
  attributes?: Record<string, any>;
  classes?: string[];
  components?: GrapesJSComponent[];
  style?: Record<string, any>;
  [key: string]: any;
}

export interface GrapesJSData {
  html: string;
  css: string;
  components: GrapesJSComponent[];
  styles: any[];
  assets: any[];
  pages: any[];
}

export interface PageVersion {
  id: string;
  version: number;
  data: GrapesJSData;
  createdBy: UserId;
  createdAt: Date;
  comment?: string;
}

export interface PageSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

export interface Page {
  id?: PageId;
  name: string;
  slug: string;
  path: string;
  type: PageType;
  projectId: ProjectId;
  createdBy: UserId;
  status: PageStatus;
  data: GrapesJSData;
  versions: PageVersion[];
  seo: PageSEO;
  isHomepage: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
  publishedAt?: Date;
}

export interface PageService {
  findAll(): Promise<Page[]>;
  findById(id: PageId): Promise<Page | null>;
  findBySlug(slug: string, projectId: ProjectId): Promise<Page | null>;
  findByProjectId(projectId: ProjectId): Promise<Page[]>;
  create(pageData: Page): Promise<Page>;
  update(id: PageId, pageData: Partial<Page>): Promise<Page | null>;
  delete(id: PageId): Promise<boolean>;
  saveVersion(id: PageId, data: GrapesJSData, createdBy: UserId, comment?: string): Promise<PageVersion>;
  getVersions(id: PageId): Promise<PageVersion[]>;
  restoreVersion(id: PageId, versionId: string): Promise<Page | null>;
  publish(id: PageId): Promise<Page | null>;
  unpublish(id: PageId): Promise<Page | null>;
  duplicate(id: PageId, newName: string, createdBy: UserId): Promise<Page>;
  updateSEO(id: PageId, seo: Partial<PageSEO>): Promise<Page | null>;
  setAsHomepage(id: PageId): Promise<Page | null>;
  reorderPages(projectId: ProjectId, pageIds: PageId[]): Promise<boolean>;
  generateStaticHTML(id: PageId): Promise<string>;
}

export interface PageRepository {
  findAll(): Promise<Page[]>;
  findById(id: PageId): Promise<Page | null>;
  findBySlug(slug: string, projectId: ProjectId): Promise<Page | null>;
  findByProjectId(projectId: ProjectId): Promise<Page[]>;
  create(page: Page): Promise<Page>;
  update(id: PageId, page: Partial<Page>): Promise<Page | null>;
  delete(id: PageId): Promise<boolean>;
}