import { BaseModel } from "./BaseModel";

export class SocialTask extends BaseModel {
  static get tableName() {
    return "social_tasks";
  }
}
