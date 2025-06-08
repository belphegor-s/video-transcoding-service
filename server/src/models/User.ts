import { Model, DataTypes } from "sequelize";
import sequelize from "../db/sequelize";

export interface UserSchema {
  user_id: string;
  name: string;
  email: string;
  password: string;
  created_at?: Date;
  reset_token?: string | null;
  reset_token_expiry?: Date | null;
  verify_token?: string | null;
  verify_token_expiry?: Date | null;
  is_verified?: boolean;
}

class User extends Model<UserSchema> implements UserSchema {
  public user_id!: string;
  public name!: string;
  public email!: string;
  public password!: string;
  public created_at!: Date;
  public reset_token?: string | null;
  public reset_token_expiry?: Date | null;
  public verify_token?: string | null;
  public verify_token_expiry?: Date | null;
  public is_verified?: boolean;
}

User.init(
  {
    user_id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    reset_token: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    reset_token_expiry: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    verify_token: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    verify_token_expiry: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "User",
  },
);

export default User;
