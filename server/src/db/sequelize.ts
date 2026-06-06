import { Sequelize } from "sequelize";
import { env } from "../config/env";

const sequelize = new Sequelize(env.DATABASE_URI);

export default sequelize;
