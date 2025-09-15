import express from "express";
import mysql from "mysql2";
import cors from "cors";
import dotenv from "dotenv";
import createStockRouter from "./stockRoutes.js";
import createSalesRouter from "./sales.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Conexión MySQL
export const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sistema_ventas",
  port: process.env.DB_PORT || 3306
});

// Probar conexión
db.connect(err => {
  if (err) {
    console.error("Error de conexión:", err);
    return;
  }
  console.log("✅ Conectado a MySQL");
});

// Montar rutas
const salesRouter = createSalesRouter(db);
app.use("/api/sales", salesRouter);
console.log("💰 Rutas de ventas montadas en /api/sales");

const stockRouter = createStockRouter(db);
app.use("/api/stock", stockRouter);
console.log("📦 Rutas de stock montadas en /api/stock");

// --- Rutas adicionales ---
app.get("/usuarios", (req, res) => {
  db.query("SELECT id, username, nombre, rol FROM usuarios", (err, results) => {
    if (err) {
      console.error("Error al obtener usuarios:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
    res.json(results);
  });
});

app.post("/usuarios", (req, res) => {
  const { username, nombre, password, rol } = req.body;
  if (!username || !nombre || !password || !rol) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  db.query(
    "INSERT INTO usuarios (username, nombre, password, rol) VALUES (?, ?, ?, ?)",
    [username, nombre, password, rol],
    (err, result) => {
      if (err) {
        console.error("Error al agregar usuario:", err);
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      res.json({ id: result.insertId, username, nombre, rol });
    }
  );
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Faltan datos" });

  db.query(
    "SELECT * FROM usuarios WHERE username = ? AND password = ?",
    [username, password],
    (err, results) => {
      if (err) {
        console.error("Error en la base de datos durante el login:", err);
        return res.status(500).json({ message: "Error en la base de datos" });
      }

      if (results.length === 0) {
        return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
      }

      const user = results[0];
      res.json({ message: "Login exitoso", username: user.username, rol: user.rol, user_id: user.id });
    }
  );
});

// Agrega estas rutas después de las rutas de ventas y stock

// ===================== RUTAS DE CLIENTES =====================

// Obtener todos los clientes
app.get("/api/clientes", (req, res) => {
  const query = "SELECT * FROM clientes ORDER BY nombre";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error al obtener clientes:", err);
      return res.status(500).json({ error: "Error al obtener clientes" });
    }
    res.json(results);
  });
});

// Obtener cliente por ID
app.get("/api/clientes/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM clientes WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("Error al obtener cliente:", err);
      return res.status(500).json({ error: "Error al obtener cliente" });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    res.json(results[0]);
  });
});

// Buscar cliente por RUT
app.get("/api/clientes/rut/:rut", (req, res) => {
  const { rut } = req.params;
  db.query("SELECT * FROM clientes WHERE rut = ?", [rut], (err, results) => {
    if (err) {
      console.error("Error al buscar cliente por RUT:", err);
      return res.status(500).json({ error: "Error al buscar cliente" });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    res.json(results[0]);
  });
});

// Crear nuevo cliente
app.post("/api/clientes", (req, res) => {
  const { rut, nombre, telefono, email, direccion } = req.body;
  
  if (!rut || !nombre) {
    return res.status(400).json({ message: "RUT y nombre son obligatorios" });
  }

  const query = `
    INSERT INTO clientes (rut, nombre, telefono, email, direccion, saldo_pendiente) 
    VALUES (?, ?, ?, ?, ?, 0)
  `;
  
  db.query(query, [rut, nombre, telefono, email, direccion], (err, result) => {
    if (err) {
      console.error("Error al crear cliente:", err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: "El RUT ya está registrado" });
      }
      return res.status(500).json({ error: "Error al crear cliente" });
    }
    res.status(201).json({ 
      id: result.insertId, 
      rut, 
      nombre, 
      telefono, 
      email, 
      direccion,
      saldo_pendiente: 0,
      message: "Cliente creado exitosamente" 
    });
  });
});

// Actualizar saldo de cliente
app.put("/api/clientes/:id/saldo", (req, res) => {
  const { id } = req.params;
  const { monto } = req.body;
  
  if (monto === undefined) {
    return res.status(400).json({ message: "Monto es requerido" });
  }

  db.query(
    "UPDATE clientes SET saldo_pendiente = saldo_pendiente + ? WHERE id = ?",
    [monto, id],
    (err, result) => {
      if (err) {
        console.error("Error al actualizar saldo:", err);
        return res.status(500).json({ error: "Error al actualizar saldo" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      res.json({ message: "Saldo actualizado correctamente" });
    }
  );
});

// Actualizar datos de cliente
app.put("/api/clientes/:id", (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, email, direccion } = req.body;
  
  const query = `
    UPDATE clientes 
    SET nombre = ?, telefono = ?, email = ?, direccion = ? 
    WHERE id = ?
  `;
  
  db.query(query, [nombre, telefono, email, direccion, id], (err, result) => {
    if (err) {
      console.error("Error al actualizar cliente:", err);
      return res.status(500).json({ error: "Error al actualizar cliente" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    res.json({ message: "Cliente actualizado correctamente" });
  });
});

// Ruta de prueba para verificar que las ventas funcionan
app.get("/api/sales/test", (req, res) => {
  res.json({ message: "✅ Rutas de ventas funcionando correctamente" });
});

// Ruta de salud del servidor
app.get("/api/health", (req, res) => {
  res.json({ 
    message: "Servidor funcionando correctamente",
    timestamp: new Date().toISOString(),
    database: process.env.DB_NAME || "sistema_ventas"
  });
});

// Manejo de errores - CORREGIDO
app.use((err, req, res, next) => {
  console.error("Error global:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

// Manejo de rutas no encontradas - CORREGIDO
app.use((req, res, next) => {
  console.log("Ruta no encontrada:", req.originalUrl);
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en ejecución en http://localhost:${PORT}`);
  console.log(`📊 Rutas disponibles:`);
  console.log(`   - GET  /api/health`);
  console.log(`   - GET  /api/sales/test`);
  console.log(`   - POST /api/sales`);
  console.log(`   - GET  /api/sales`);
  console.log(`   - GET  /api/sales/:id/detalles`);
});