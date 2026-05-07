/**
 * Generic class for handling data entities with a Supabase-like interface.
 * Can be extended to specifically handle each collection.
 */
import { supabase } from "@/supabase";

export class BaseModel {
  constructor(data = {}) {
    Object.assign(this, data);
  }

  static get tableName() {
    return this.name.toLowerCase();
  }

  /**
   * List all records from the table with optional sorting and limit.
   */
  static async list(orderField = "id", limit = 100) {
    const isDescending = orderField.startsWith("-");
    const field = isDescending ? orderField.substring(1) : orderField;
    
    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .order(field, { ascending: !isDescending })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(item => new this(item));
  }

  /**
   * Find records with a query.
   */
  static async find(query = {}) {
    let q = supabase.from(this.tableName).select("*");
    
    Object.entries(query).forEach(([key, value]) => {
      q = q.eq(key, value);
    });

    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(item => new this(item));
  }

  /**
   * Find one record by its ID.
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data ? new this(data) : null;
  }

  /**
   * Filter with sorting and limit.
   */
  static async filter(query = {}, orderField = '-created_at', limit = 10) {
    const isDescending = orderField.startsWith("-");
    const field = isDescending ? orderField.substring(1) : orderField;

    let q = supabase.from(this.tableName).select("*");

    Object.entries(query).forEach(([key, value]) => {
      q = q.eq(key, value);
    });

    const { data, error } = await q
      .order(field, { ascending: !isDescending })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(item => new this(item));
  }

  /**
   * Create a new record in the table.
   */
  static async create(data = {}) {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select("*")
      .single();

    if (error) throw error;
    return new this(created);
  }

  /**
   * Update an existing record.
   */
  async update(data = {}) {
    const { data: updated, error } = await supabase
      .from(this.constructor.tableName)
      .update(data)
      .eq("id", this.id)
      .select("*")
      .single();

    if (error) throw error;
    Object.assign(this, updated);
    return this;
  }

  /**
   * Update a record by its ID (static version).
   */
  static async update(id, data = {}) {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return new this(updated);
  }

  /**
   * Delete a record by its ID.
   */
  static async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }

  /**
   * Find one record by its ID (alias for findById).
   */
  static async get(id) {
    return this.findById(id);
  }
}
