import { supabase } from "@/supabase";

export class BaseModel {
  [key: string]: unknown;

  constructor(data: Record<string, unknown> = {}) {
    Object.assign(this, data);
  }

  static get tableName(): string {
    return this.name.toLowerCase();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async list(orderField = "id", limit = 100): Promise<any[]> {
    const isDescending = orderField.startsWith("-");
    const field = isDescending ? orderField.substring(1) : orderField;
    const { data, error } = await supabase
      .from(this.tableName).select("*")
      .order(field, { ascending: !isDescending }).limit(limit);
    if (error) throw error;
    return (data || []).map((item) => new (this as unknown as new (d: Record<string, unknown>) => BaseModel)(item));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async find(query: Record<string, unknown> = {}): Promise<any[]> {
    let q = supabase.from(this.tableName).select("*");
    Object.entries(query).forEach(([key, value]) => { q = q.eq(key, value as string); });
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((item) => new (this as unknown as new (d: Record<string, unknown>) => BaseModel)(item));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async findById(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from(this.tableName).select("*").eq("id", id).single();
    if (error) throw error;
    return data ? new (this as unknown as new (d: Record<string, unknown>) => BaseModel)(data) : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async filter(query: Record<string, unknown> = {}, orderField = "-created_at", limit = 10): Promise<any[]> {
    const isDescending = orderField.startsWith("-");
    const field = isDescending ? orderField.substring(1) : orderField;
    let q = supabase.from(this.tableName).select("*");
    Object.entries(query).forEach(([key, value]) => { q = q.eq(key, value as string); });
    const { data, error } = await q.order(field, { ascending: !isDescending }).limit(limit);
    if (error) throw error;
    return (data || []).map((item) => new (this as unknown as new (d: Record<string, unknown>) => BaseModel)(item));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async create(data: Record<string, unknown> = {}): Promise<any> {
    const { data: created, error } = await supabase
      .from(this.tableName).insert(data).select("*").single();
    if (error) throw error;
    return new (this as unknown as new (d: Record<string, unknown>) => BaseModel)(created);
  }

  async update(data: Record<string, unknown> = {}): Promise<this> {
    const tableName = (this.constructor as typeof BaseModel).tableName;
    const { data: updated, error } = await supabase
      .from(tableName).update(data).eq("id", this.id as string).select("*").single();
    if (error) throw error;
    Object.assign(this, updated);
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async update(id: string, data: Record<string, unknown> = {}): Promise<any> {
    const { data: updated, error } = await supabase
      .from(this.tableName).update(data).eq("id", id).select("*").single();
    if (error) throw error;
    return new (this as unknown as new (d: Record<string, unknown>) => BaseModel)(updated);
  }

  static async delete(id: string): Promise<true> {
    const { error } = await supabase.from(this.tableName).delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  static async get(id: string) { return this.findById(id); }
}
