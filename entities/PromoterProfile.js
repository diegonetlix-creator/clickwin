import { BaseModel } from "./BaseModel";

export class PromoterProfile extends BaseModel {
  static get tableName() {
    return "promoter_profiles";
  }
}
