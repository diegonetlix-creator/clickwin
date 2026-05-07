import { BaseModel } from "./BaseModel";

export class Notification extends BaseModel {
  static get tableName() {
    return "notifications";
  }
}
