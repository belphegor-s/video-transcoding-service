import { Sequelize } from "sequelize";

const sequelize = new Sequelize(process.env.DATABASE_URI ?? "");

export default sequelize;
