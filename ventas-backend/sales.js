// sales.js - Rutas para el manejo de ventas
import express from "express";

const createSalesRouter = (db) => {
  const router = express.Router();

  // Registrar una nueva venta
  router.post("/", (req, res) => {
    console.log("Datos recibidos para venta:", req.body);
    
    const { total, recibido, cambio, metodo_pago, cliente_id, deuda, user_id, items } = req.body;
    
    // Validaciones
    if (!total || !recibido || !cambio || !metodo_pago || !user_id || !items || !Array.isArray(items)) {
      console.error("Datos incompletos:", { total, recibido, cambio, metodo_pago, user_id, items });
      return res.status(400).json({ error: "Datos de venta incompletos o inválidos" });
    }

    // Iniciar transacción
    db.beginTransaction((err) => {
      if (err) {
        console.error("Error al iniciar transacción:", err);
        return res.status(500).json({ error: "Error de servidor al iniciar transacción" });
      }

      // 1. Insertar la venta
      const ventaQuery = `
        INSERT INTO ventas (total, recibido, cambio, metodo_pago, cliente_id, deuda, user_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      console.log("Ejecutando query de venta:", ventaQuery, [total, recibido, cambio, metodo_pago, cliente_id, deuda, user_id]);
      
      db.query(ventaQuery, [total, recibido, cambio, metodo_pago, cliente_id, deuda, user_id], (err, saleResult) => {
        if (err) {
          console.error("Error al insertar venta:", err);
          return db.rollback(() => {
            res.status(500).json({ error: "Error al registrar venta en la base de datos" });
          });
        }
        
        const ventaId = saleResult.insertId;
        console.log("Venta insertada con ID:", ventaId);
        
        let detallesProcessados = 0;
        
        if (items.length === 0) {
          return db.commit((err) => {
            if (err) {
              console.error("Error al hacer commit:", err);
              return db.rollback(() => {
                res.status(500).json({ error: "Error al finalizar la transacción" });
              });
            }
            res.json({ success: true, venta_id: ventaId });
          });
        }
        
        items.forEach((item, index) => {
          console.log(`Procesando item ${index + 1}:`, item);
          
          // Insertar detalle de venta
          const detalleQuery = `
            INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio) 
            VALUES (?, ?, ?, ?)
          `;
          
          db.query(detalleQuery, [ventaId, item.producto_id, item.cantidad, item.precio], (err) => {
            if (err) {
              console.error("Error al insertar detalle de venta:", err);
              return db.rollback(() => {
                res.status(500).json({ error: "Error al registrar detalle de venta" });
              });
            }
            
            // Actualizar stock del producto
            const updateStockQuery = `
              UPDATE productos SET stock = stock - ? WHERE id = ?
            `;
            
            db.query(updateStockQuery, [item.cantidad, item.producto_id], (err) => {
              if (err) {
                console.error("Error al actualizar stock:", err);
                return db.rollback(() => {
                  res.status(500).json({ error: "Error al actualizar stock del producto" });
                });
              }
              
              detallesProcessados++;
              
              // Si todos los detalles han sido procesados
              if (detallesProcessados === items.length) {
                // Si hay deuda, actualizar saldo del cliente
                if (deuda > 0 && cliente_id) {
                  const updateDeudaQuery = `
                    UPDATE clientes SET saldo_pendiente = saldo_pendiente + ? WHERE id = ?
                  `;
                  
                  db.query(updateDeudaQuery, [deuda, cliente_id], (err) => {
                    if (err) {
                      console.error("Error al actualizar deuda del cliente:", err);
                      return db.rollback(() => {
                        res.status(500).json({ error: "Error al actualizar deuda del cliente" });
                      });
                    }
                    
                    // Confirmar transacción
                    db.commit((err) => {
                      if (err) {
                        console.error("Error al hacer commit:", err);
                        return db.rollback(() => {
                          res.status(500).json({ error: "Error al finalizar la transacción" });
                        });
                      }
                      res.json({ success: true, venta_id: ventaId });
                    });
                  });
                } else {
                  // Confirmar transacción si no hay deuda
                  db.commit((err) => {
                    if (err) {
                      console.error("Error al hacer commit:", err);
                      return db.rollback(() => {
                        res.status(500).json({ error: "Error al finalizar la transacción" });
                      });
                    }
                    res.json({ success: true, venta_id: ventaId });
                  });
                }
              }
            });
          });
        });
      });
    });
  });

  // Obtener todas las ventas
  router.get("/", (req, res) => {
    const query = `
      SELECT v.*, c.nombre as cliente_nombre, c.rut as cliente_rut 
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id 
      ORDER BY v.fecha DESC
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error al obtener ventas:", err);
        return res.status(500).json({ error: "Error al obtener ventas" });
      }
      res.json(results);
    });
  });

  // Obtener detalles de una venta
  router.get("/:id/detalles", (req, res) => {
    const { id } = req.params;
    const query = `
      SELECT vd.*, p.name as producto_nombre, p.sku 
      FROM venta_detalles vd 
      JOIN productos p ON vd.producto_id = p.id 
      WHERE vd.venta_id = ?
    `;
    
    db.query(query, [id], (err, results) => {
      if (err) {
        console.error("Error al obtener detalles de venta:", err);
        return res.status(500).json({ error: "Error al obtener detalles de venta" });
      }
      res.json(results);
    });
  });

  return router;
};

export default createSalesRouter;