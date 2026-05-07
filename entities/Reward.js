import { BaseModel } from "./BaseModel";

export class Reward extends BaseModel {
  static get tableName() {
    return "rewards";
  }
}
