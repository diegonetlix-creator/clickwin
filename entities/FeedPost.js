import { BaseModel } from "./BaseModel";

export class FeedPost extends BaseModel {
  static get tableName() {
    return "feed_posts";
  }
}
