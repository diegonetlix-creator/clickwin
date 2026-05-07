import { BaseModel } from "./BaseModel";

export class Task extends BaseModel {
  static get tableName() {
    return "tasks";
  }
}
