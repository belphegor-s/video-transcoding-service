import { Model, DataTypes } from "sequelize";
import sequelize from "../db/sequelize";
import User from "./User";

export interface FolderSchema {
  folder_id: string;
  user_id: string;
  path: string; // nested via "/", e.g. "Marketing/Testimonials"
  created_at?: Date;
}

class Folder extends Model<FolderSchema> implements FolderSchema {
  public folder_id!: string;
  public user_id!: string;
  public path!: string;
  public created_at!: Date;
}

Folder.init(
  {
    folder_id: { type: DataTypes.UUID, primaryKey: true },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: User, key: "user_id" },
    },
    path: { type: DataTypes.STRING(500), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: "Folder",
    timestamps: false,
    indexes: [{ unique: true, fields: ["user_id", "path"] }],
  },
);

export default Folder;
