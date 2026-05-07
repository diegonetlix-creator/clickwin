import { BaseModel } from "./BaseModel";

export class Campaign extends BaseModel {
  static get tableName() {
    return "campaigns";
  }
}
