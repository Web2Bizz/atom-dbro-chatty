import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION, Database } from '../database/database.module';
import { users, User, NewUser } from '../database/schema/users';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: Database,
  ) {}

  async create(userData: NewUser): Promise<User> {
    const [user] = await this.db.insert(users).values(userData).returning();
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.db.select().from(users);
  }

  async findOne(id: string): Promise<User> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user || null;
  }

  async update(id: string, userData: Partial<NewUser>): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async remove(id: string): Promise<void> {
    const [deletedUser] = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    
    if (!deletedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}

