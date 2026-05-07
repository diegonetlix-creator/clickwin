import { BaseModel } from "./BaseModel";

export class SocialTaskSubmission extends BaseModel {
  static get tableName() {
    return "social_task_submissions";
  }
}
