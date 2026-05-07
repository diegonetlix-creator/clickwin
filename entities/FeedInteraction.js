import { BaseModel } from "./BaseModel";

export class FeedInteraction extends BaseModel {
  static get tableName() {
    return "feed_interactions";
  }
}
