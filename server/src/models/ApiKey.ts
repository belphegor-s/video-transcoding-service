import { Model, DataTypes } from "sequelize";
import sequelize from "../db/sequelize";
import User from "./User";

export interface ApiKeySchema {
  api_key_id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  last_used_at?: Date | null;
  expires_at?: Date | null;
  revoked?: boolean;
  created_at?: Date;
}

class ApiKey extends Model<ApiKeySchema> implements ApiKeySchema {
  public api_key_id!: string;
  public user_id!: string;
  public name!: string;
  public key_prefix!: string;
  public key_hash!: string;
  public last_used_at!: Date | null;
  public expires_at!: Date | null;
  public revoked!: boolean;
  public created_at!: Date;
}

ApiKey.init(
  {
    api_key_id: { type: DataTypes.UUID, primaryKey: true },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: User, key: "user_id" },
    },
    name: { type: DataTypes.STRING, allowNull: false },
    key_prefix: { type: DataTypes.STRING, allowNull: false },
    key_hash: { type: DataTypes.STRING, allowNull: false, unique: true },
    last_used_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    expires_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    revoked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: "ApiKey", timestamps: false },
);

export default ApiKey;
