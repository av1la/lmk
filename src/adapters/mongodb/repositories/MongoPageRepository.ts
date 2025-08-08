import { Collection, ObjectId, WithId } from 'mongodb';
import { 
  Page, 
  PageId, 
  PageRepository, 
  PageStatus,
  PageType,
  GrapesJSData,
  GrapesJSComponent,
  PageVersion,
  PageSEO
} from '@/domains/page/PageDomain';
import { UserId } from '@/domains/user/UserDomain';
import { ProjectId } from '@/domains/project/ProjectDomain';
import type { MongoClientProvider } from '@/adapters/mongodb/provider/MongoClientProvider';
import { injectable, inject } from 'tsyringe';

interface MongoGrapesJSComponent {
  tagName?: string;
  type?: string;
  content?: string;
  attributes?: Record<string, any>;
  classes?: string[];
  components?: MongoGrapesJSComponent[];
  style?: Record<string, any>;
  [key: string]: any;
}

interface MongoGrapesJSData {
  html: string;
  css: string;
  components: MongoGrapesJSComponent[];
  styles: any[];
  assets: any[];
  pages: any[];
}

interface MongoPageVersion {
  id: string;
  version: number;
  data: MongoGrapesJSData;
  createdBy: string;
  createdAt: Date;
  comment?: string;
}

interface MongoPageSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

interface MongoPage {
  _id?: ObjectId;
  name: string;
  slug: string;
  path: string;
  type: string;
  projectId: string;
  createdBy: string;
  status: string;
  data: MongoGrapesJSData;
  versions: MongoPageVersion[];
  seo: MongoPageSEO;
  isHomepage: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
  publishedAt?: Date;
}

@injectable()
export class MongoPageRepository implements PageRepository {
  private collection: Collection<MongoPage>;
  private readonly collectionName = 'pages';

  constructor(
    @inject('MongoClientProvider') private readonly mongoProvider: MongoClientProvider
  ) {
    const db = this.mongoProvider.getDb();
    this.collection = db.collection<MongoPage>(this.collectionName);
    this.createIndexes();
  }

  private async createIndexes(): Promise<void> {
    try {
      await this.collection.createIndex({ projectId: 1, slug: 1 }, { unique: true });
      await this.collection.createIndex({ projectId: 1 });
      await this.collection.createIndex({ createdBy: 1 });
      await this.collection.createIndex({ status: 1 });
      await this.collection.createIndex({ projectId: 1, order: 1 });
    } catch (error) {
      console.warn('Index creation warning:', error);
    }
  }

  async findAll(): Promise<Page[]> {
    const pages = await this.collection.find().toArray();
    return pages.map(doc => this.mapMongoToDomain(doc));
  }

  async findById(id: PageId): Promise<Page | null> {
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return null;
    }

    const page = await this.collection.findOne({ _id: new ObjectId(idValue) });
    return page ? this.mapMongoToDomain(page) : null;
  }

  async findBySlug(slug: string, projectId: ProjectId): Promise<Page | null> {
    const page = await this.collection.findOne({ 
      slug, 
      projectId: projectId.getValue() 
    });
    return page ? this.mapMongoToDomain(page) : null;
  }

  async findByProjectId(projectId: ProjectId): Promise<Page[]> {
    const pages = await this.collection.find({ 
      projectId: projectId.getValue() 
    }).sort({ order: 1 }).toArray();
    return pages.map(doc => this.mapMongoToDomain(doc));
  }

  async create(page: Page): Promise<Page> {
    const now = new Date();
    const mongoPage: Omit<MongoPage, '_id'> = {
      name: page.name,
      slug: page.slug,
      path: page.path,
      type: page.type,
      projectId: page.projectId.getValue(),
      createdBy: page.createdBy.getValue(),
      status: page.status,
      data: this.mapGrapesJSDataToMongo(page.data),
      versions: page.versions.map(version => ({
        id: version.id,
        version: version.version,
        data: this.mapGrapesJSDataToMongo(version.data),
        createdBy: version.createdBy.getValue(),
        createdAt: version.createdAt,
        comment: version.comment
      })),
      seo: {
        title: page.seo.title,
        description: page.seo.description,
        keywords: page.seo.keywords,
        ogTitle: page.seo.ogTitle,
        ogDescription: page.seo.ogDescription,
        ogImage: page.seo.ogImage,
        canonicalUrl: page.seo.canonicalUrl,
        noIndex: page.seo.noIndex
      },
      isHomepage: page.isHomepage,
      order: page.order,
      createdAt: page.createdAt || now,
      updatedAt: page.updatedAt || now,
      publishedAt: page.publishedAt
    };

    const result = await this.collection.insertOne(mongoPage);

    return {
      ...page,
      id: new PageId(result.insertedId.toString()),
      createdAt: mongoPage.createdAt,
      updatedAt: mongoPage.updatedAt
    };
  }

  async update(id: PageId, page: Partial<Page>): Promise<Page | null> {
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return null;
    }

    const now = new Date();
    const updateData: any = {
      ...page,
      updatedAt: now,
    };

    if (page.projectId) {
      updateData.projectId = page.projectId.getValue();
    }

    if (page.createdBy) {
      updateData.createdBy = page.createdBy.getValue();
    }

    if (page.data) {
      updateData.data = this.mapGrapesJSDataToMongo(page.data);
    }

    if (page.versions) {
      updateData.versions = page.versions.map(version => ({
        id: version.id,
        version: version.version,
        data: this.mapGrapesJSDataToMongo(version.data),
        createdBy: version.createdBy.getValue(),
        createdAt: version.createdAt,
        comment: version.comment
      }));
    }

    if (page.seo) {
      updateData.seo = {
        title: page.seo.title,
        description: page.seo.description,
        keywords: page.seo.keywords,
        ogTitle: page.seo.ogTitle,
        ogDescription: page.seo.ogDescription,
        ogImage: page.seo.ogImage,
        canonicalUrl: page.seo.canonicalUrl,
        noIndex: page.seo.noIndex
      };
    }

    const result: WithId<MongoPage> | null = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(idValue) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result ? this.mapMongoToDomain(result) : null;
  }

  async delete(id: PageId): Promise<boolean> {
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return false;
    }

    const result = await this.collection.deleteOne({ _id: new ObjectId(idValue) });
    return result.deletedCount > 0;
  }

  private mapGrapesJSDataToMongo(data: GrapesJSData): MongoGrapesJSData {
    return {
      html: data.html,
      css: data.css,
      components: data.components,
      styles: data.styles,
      assets: data.assets,
      pages: data.pages
    };
  }

  private mapGrapesJSDataToDomain(data: MongoGrapesJSData): GrapesJSData {
    return {
      html: data.html,
      css: data.css,
      components: data.components,
      styles: data.styles,
      assets: data.assets,
      pages: data.pages
    };
  }

  private mapMongoToDomain(doc: MongoPage): Page {
    if (!doc._id) {
      throw new Error('Document must have an _id');
    }

    return {
      id: new PageId(doc._id.toString()),
      name: doc.name,
      slug: doc.slug,
      path: doc.path,
      type: doc.type as PageType,
      projectId: new ProjectId(doc.projectId),
      createdBy: new UserId(doc.createdBy),
      status: doc.status as PageStatus,
      data: this.mapGrapesJSDataToDomain(doc.data),
      versions: doc.versions.map(version => ({
        id: version.id,
        version: version.version,
        data: this.mapGrapesJSDataToDomain(version.data),
        createdBy: new UserId(version.createdBy),
        createdAt: version.createdAt,
        comment: version.comment
      })),
      seo: {
        title: doc.seo.title,
        description: doc.seo.description,
        keywords: doc.seo.keywords,
        ogTitle: doc.seo.ogTitle,
        ogDescription: doc.seo.ogDescription,
        ogImage: doc.seo.ogImage,
        canonicalUrl: doc.seo.canonicalUrl,
        noIndex: doc.seo.noIndex
      },
      isHomepage: doc.isHomepage,
      order: doc.order,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      publishedAt: doc.publishedAt
    };
  }
}