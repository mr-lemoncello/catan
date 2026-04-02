import mysql from "mysql2/promise";

export const db = mysql.createPool({
    host: "127.0.0.1",
    user: "banerjeemurthyv",
    password: "d768aHfDbKDNuCnKDwhp2u23ndwFnSNApqanmwd26n36x23bi3d",
    database: "catan",
    port: 3307
});