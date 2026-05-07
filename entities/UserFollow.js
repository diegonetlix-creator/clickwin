import { BaseModel } from "./BaseModel";

export class UserFollow extends BaseModel {
  static get tableName() {
    return "user_follows";
  }
}
