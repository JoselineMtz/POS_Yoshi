import express from "express";

const router = express.Router();

const createStockRouter = (db) => {
  // ===================== PRODUCTOS =====================

  // Obtener todos los productos con su categoría
  router.get("/products", (req, res) => {
    const query = `
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
    `;
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error al obtener productos:", err);
        return res.status(500).json({ error: "Error de servidor" });
      }
      res.json(results);
    });
  });

  // Obtener un producto por SKU
  router.get("/products/by-sku/:sku", (req, res) => {
    const { sku } = req.params;
    const query = `
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.sku = ?
    `;
    db.query(query, [sku], (err, results) => {
      if (err) {
        console.error("Error al buscar producto por SKU:", err);
        return res.status(500).json({ error: "Error de servidor" });
      }
      if (results.length === 0) return res.status(404).json({ message: "Producto no encontrado" });
      res.json(results[0]);
    });
  });

  // ===================== CATEGORÍAS =====================

  // Obtener todas las categorías
  router.get("/categories", (req, res) => {
    db.query("SELECT * FROM categorias", (err, results) => {
      if (err) {
        console.error("Error al obtener categorías:", err);
        return res.status(500).json({ error: "Error de servidor" });
      }
      res.json(results);
    });
  });

  // Agregar nueva categoría
  router.post("/categories", (req, res) => {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: "El nombre de la categoría es requerido" });
    db.query("INSERT INTO categorias (nombre) VALUES (?)", [nombre], (err, result) => {
      if (err) {
        console.error("Error al agregar categoría:", err);
        return res.status(500).json({ error: "Error de servidor" });
      }
      res.status(201).json({ id: result.insertId, nombre });
    });
  });

  // Eliminar categoría y productos asociados
  router.delete("/categories/:id", (req, res) => {
    const { id } = req.params;
    db.query("SELECT COUNT(*) AS count FROM categorias WHERE id = ?", [id], (err, results) => {
      if (err) return res.status(500).json({ error: "Error de servidor" });
      if (results[0].count === 0) return res.status(404).json({ message: "Categoría no encontrada" });

      db.query("DELETE FROM productos WHERE categoria_id = ?", [id], (err, resultProductos) => {
        if (err) return res.status(500).json({ error: "Error de servidor" });
        db.query("DELETE FROM categorias WHERE id = ?", [id], (err) => {
          if (err) return res.status(500).json({ error: "Error de servidor" });
          res.json({ message: `Categoría y ${resultProductos.affectedRows} productos asociados eliminados correctamente.` });
        });
      });
    });
  });

  // ===================== CRUD PRODUCTOS =====================
  
  // **NUEVO:** Agregar o actualizar un producto (Upsert)
  router.post("/products/upsert", (req, res) => {
    const { sku, name, description, price, stock, stockUnit, user_id, categoria_id, purchase_price } = req.body;
    
    // **Validación mejorada para datos requeridos**
    if (!sku || !name || !price || stock === undefined || !user_id || !stockUnit || purchase_price === undefined) {
      return res.status(400).json({ message: "Faltan datos requeridos" });
    }
    const last_updated = new Date();
    
    // Consultar si el producto ya existe por SKU
    db.query("SELECT id FROM productos WHERE sku = ?", [sku], (err, results) => {
      if (err) return res.status(500).json({ error: "Error de servidor" });
      
      // Si el producto existe, actualizarlo
      if (results.length > 0) {
        const id = results[0].id;
        const query = "UPDATE productos SET sku=?, name=?, description=?, price=?, stock=?, stock_unit=?, user_id=?, categoria_id=?, last_updated=?, purchase_price=? WHERE id=?";
        const values = [sku, name, description, price, stock, stockUnit, user_id, categoria_id, last_updated, purchase_price, id];
        
        db.query(query, values, (err, result) => {
          if (err) {
            console.error("Error al actualizar producto:", err);
            return res.status(500).json({ error: "Error de servidor" });
          }
          res.json({ id, ...req.body, last_updated });
        });
      } else {
        // Si el producto no existe, crearlo
        const query = "INSERT INTO productos (sku, name, description, price, stock, stock_unit, user_id, categoria_id, last_updated, purchase_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const values = [sku, name, description, price, stock, stockUnit, user_id, categoria_id, last_updated, purchase_price];
        
        db.query(query, values, (err, result) => {
          if (err) {
            console.error("Error al agregar producto:", err);
            return res.status(500).json({ error: "Error de servidor" });
          }
          res.status(201).json({ id: result.insertId, ...req.body, last_updated });
        });
      }
    });
  });

  // Eliminar producto
  router.delete("/products/:id", (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM productos WHERE id=?", [id], (err, result) => {
      if (err) return res.status(500).json({ error: "Error de servidor" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Producto no encontrado" });
      res.json({ message: "Producto eliminado" });
    });
  });

  // ===================== TEMPORAL PRODUCTS =====================

  // Obtener productos temporales por sesión
  router.get("/temp-products/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    db.query("SELECT * FROM temp_productos WHERE session_id = ?", [sessionId], (err, results) => {
      if (err) return res.status(500).json({ error: "Error de servidor" });
      res.json(results);
    });
  });

  // Agregar producto temporal
  router.post("/temp-products", (req, res) => {
    const { sessionId, sku, name, description, price, stock, stockUnit, categoria_id, added_stock, purchase_price, user_id } = req.body;

    if (!sessionId || !sku || !added_stock || !purchase_price) {
      return res.status(400).json({ message: "Faltan datos clave" });
    }

    const last_updated = new Date();

    const query = `
      INSERT INTO temp_productos (session_id, sku, name, description, price, stock, stock_unit, categoria_id, added_stock, purchase_price, user_id, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      sessionId,
      sku,
      name || "",
      description || "",
      price || 0,
      stock || 0,
      stockUnit || "Unidad",
      categoria_id || null,
      added_stock,
      purchase_price,
      user_id || null,
      last_updated
    ];

    db.query(query, values, (err, result) => {
      if (err) return res.status(500).json({ error: "Error de servidor" });
      res.status(201).json({ id: result.insertId, ...req.body, last_updated });
    });
  });

  // Eliminar productos temporales por sesión
  router.delete("/temp-products/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    db.query("DELETE FROM temp_productos WHERE session_id = ?", [sessionId], (err, result) => {
      if (err) return res.status(500).json({ error: "Error de servidor" });
      res.json({ message: `${result.affectedRows} productos temporales eliminados.` });
    });
  });

  // Finalizar: pasar productos temporales a la tabla real
  router.post("/finalize", (req, res) => {
    const { products, sessionId } = req.body;
    if (!products || !Array.isArray(products) || !sessionId) {
      return res.status(400).json({ message: "Faltan datos requeridos" });
    }

    db.beginTransaction(err => {
      if (err) return res.status(500).json({ error: "Error de servidor" });

      const processProduct = (index) => {
        if (index >= products.length) {
          db.query("DELETE FROM temp_productos WHERE session_id = ?", [sessionId], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: "Error de servidor" }));
            db.commit(err => {
              if (err) return db.rollback(() => res.status(500).json({ error: "Error de servidor" }));
              res.json({ message: "Proceso de finalización completado." });
            });
          });
          return;
        }

        const product = products[index];
        const last_updated = new Date();

        const query = `
          INSERT INTO productos (sku, name, description, price, stock, stock_unit, user_id, categoria_id, last_updated, purchase_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            stock = stock + VALUES(stock),
            price = VALUES(price),
            last_updated = VALUES(last_updated),
            purchase_price = VALUES(purchase_price)
        `;
        const values = [
          product.sku,
          product.name || "",
          product.description || "",
          product.price || 0,
          product.added_stock,
          product.stock_unit || "Unidad",
          product.user_id || null,
          product.categoria_id || null,
          last_updated,
          product.purchase_price
        ];

        db.query(query, values, (err) => {
          if (err) return db.rollback(() => res.status(500).json({ error: "Error de servidor" }));
          processProduct(index + 1);
        });
      };

      processProduct(0);
    });
  });

  return router;
};

export default createStockRouter;
