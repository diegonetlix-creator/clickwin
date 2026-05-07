import { BaseModel } from "./BaseModel";

export class Submission extends BaseModel {
  static get tableName() {
    return "submissions";
  }
}
