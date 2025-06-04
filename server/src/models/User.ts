import { Model, DataTypes } from "sequelize";
import sequelize from "../db/sequelize";

export interface UserSchema {
  user_id: string;
  name: string;
  email: string;
  password: string;
  created_at?: Date;
}

class User extends Model<UserSchema> implements UserSchema {
  public user_id!: string;
  public name!: string;
  public email!: string;
  public password!: string;
  public created_at!: Date;
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
  },
  {
    sequelize,
    modelName: "User",
  }
);

export default User;
