// Pool koneksi MySQL/MariaDB — lazy, dibuat saat query pertama.
import mysql from "mysql2/promise";

let pool = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASS || "",
      database: process.env.DB_NAME || "sispertani",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // DECIMAL dikembalikan sebagai number, bukan string — penting untuk parity JSON.
      decimalNumbers: true,
      dateStrings: true,
    });
  }
  return pool;
}

/** Jalankan query, kembalikan rows. Lempar error apa adanya (ditangani wrapRoute). */
export async function q(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}
