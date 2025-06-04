import { Model, DataTypes } from "sequelize";
import sequelize from "../db/sequelize";
import User from "./User"; // Import the User model

export interface VideoSchema {
  video_id: string;
  user_id: string;
  s3_key: string;
  mime_type: string;
  status: "signed_url_generated" | "uploaded" | "transcoded" | "error";
  transcoded_urls?: string[];
  created_at?: Date;
}

class Video extends Model<VideoSchema> implements VideoSchema {
  public video_id!: string;
  public user_id!: string;
  public s3_key!: string;
  public mime_type!: string;
  public status!: "signed_url_generated" | "uploaded" | "transcoded" | "error";
  public transcoded_urls!: string[];
  public created_at!: Date;
}

Video.init(
  {
    video_id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "user_id",
      },
    },
    s3_key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    mime_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("signed_url_generated", "uploaded", "transcoded", "error"),
      allowNull: false,
    },
    transcoded_urls: {
      type: DataTypes.ARRAY(DataTypes.STRING(1000)),
      allowNull: false,
      defaultValue: [],
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "Video",
  }
);

export default Video;
