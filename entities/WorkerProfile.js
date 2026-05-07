import { BaseModel } from "./BaseModel";

export class WorkerProfile extends BaseModel {
  static get tableName() {
    return "worker_profiles";
  }
}
