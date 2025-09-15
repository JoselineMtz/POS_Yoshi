import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MisVentas.css'; // Crearemos este archivo CSS

const MisVentas = () => {
  const [ventas, setVentas] = useState([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [detallesVenta, setDetallesVenta] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState('hoy'); // hoy, semana, mes, todos
  const [estadisticas, setEstadisticas] = useState({});
  const [gananciasTotales, setGananciasTotales] = useState(0);

  useEffect(() => {
    fetchVentas();
  }, [filtroFecha]);

  const fetchVentas = async () => {
    try {
      setCargando(true);
      const response = await axios.get('http://localhost:4000/api/sales');
      let ventasFiltradas = response.data;
      
      // Aplicar filtro de fecha
      const hoy = new Date();
      switch (filtroFecha) {
        case 'hoy':
          ventasFiltradas = ventasFiltradas.filter(venta => 
            new Date(venta.fecha).toDateString() === hoy.toDateString()
          );
          break;
        case 'semana':
          const hace7Dias = new Date();
          hace7Dias.setDate(hoy.getDate() - 7);
          ventasFiltradas = ventasFiltradas.filter(venta => 
            new Date(venta.fecha) >= hace7Dias
          );
          break;
        case 'mes':
          const hace30Dias = new Date();
          hace30Dias.setDate(hoy.getDate() - 30);
          ventasFiltradas = ventasFiltradas.filter(venta => 
            new Date(venta.fecha) >= hace30Dias
          );
          break;
        default:
          break;
      }

      setVentas(ventasFiltradas);

      // Calcular estadísticas y ganancias
      let ganancias = 0;
      for (const venta of ventasFiltradas) {
        try {
          const { data: detalles } = await axios.get(`http://localhost:4000/api/sales/${venta.id}/detalles`);
          detalles.forEach(detalle => {
            ganancias += (parseFloat(detalle.precio) - parseFloat(detalle.purchase_price)) * parseFloat(detalle.cantidad);
          });
        } catch (err) {
          console.error(`Error al obtener detalles de la venta ${venta.id}:`, err);
        }
      }

      calcularEstadisticas(ventasFiltradas, ganancias);

    } catch (error) {
      console.error('Error al obtener ventas:', error);
      alert('Error al cargar las ventas');
    } finally {
      setCargando(false);
    }
  };

  const calcularEstadisticas = (ventasData, ganancias) => {
    const totalVentas = ventasData.reduce((sum, venta) => sum + parseFloat(venta.total), 0);
    const totalVentasCount = ventasData.length;
    const totalDeuda = ventasData.reduce((sum, venta) => sum + parseFloat(venta.deuda), 0);

    setEstadisticas({
      totalVentas,
      totalVentasCount,
      totalDeuda,
      promedioVenta: totalVentasCount > 0 ? totalVentas / totalVentasCount : 0,
      gananciasTotales: ganancias
    });
    setGananciasTotales(ganancias);
  };

  const verDetallesVenta = async (venta) => {
    try {
      setVentaSeleccionada(venta);
      const response = await axios.get(`http://localhost:4000/api/sales/${venta.id}/detalles`);
      setDetallesVenta(response.data);
    } catch (error) {
      console.error('Error al obtener detalles de venta:', error);
      alert('Error al cargar los detalles de la venta');
    }
  };

  const formatFecha = (fecha) => new Date(fecha).toLocaleString('es-CL');

  const formatPrice = (price) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(price);

  if (cargando) return <div className="cargando">Cargando ventas...</div>;

  return (
    <div className="mis-ventas-container">
      <div className="ventas-header">
        <h2>📊 Mis Ventas</h2>
        <div className="filtros">
          <button className={filtroFecha === 'hoy' ? 'active' : ''} onClick={() => setFiltroFecha('hoy')}>Hoy</button>
          <button className={filtroFecha === 'semana' ? 'active' : ''} onClick={() => setFiltroFecha('semana')}>Esta Semana</button>
          <button className={filtroFecha === 'mes' ? 'active' : ''} onClick={() => setFiltroFecha('mes')}>Este Mes</button>
          <button className={filtroFecha === 'todos' ? 'active' : ''} onClick={() => setFiltroFecha('todos')}>Todos</button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="estadisticas-grid">
        <div className="estadistica-card">
          <div className="estadistica-icon">💰</div>
          <div className="estadistica-info">
            <h3>Total Ventas</h3>
            <p className="estadistica-valor">{formatPrice(estadisticas.totalVentas)}</p>
          </div>
        </div>
        
        <div className="estadistica-card">
          <div className="estadistica-icon">📦</div>
          <div className="estadistica-info">
            <h3>N° de Ventas</h3>
            <p className="estadistica-valor">{estadisticas.totalVentasCount}</p>
          </div>
        </div>
        
        <div className="estadistica-card">
          <div className="estadistica-icon">📈</div>
          <div className="estadistica-info">
            <h3>Promedio por Venta</h3>
            <p className="estadistica-valor">{formatPrice(estadisticas.promedioVenta)}</p>
          </div>
        </div>
        
        <div className="estadistica-card">
          <div className="estadistica-icon">⏰</div>
          <div className="estadistica-info">
            <h3>Deuda Pendiente</h3>
            <p className="estadistica-valor deuda">{formatPrice(estadisticas.totalDeuda)}</p>
          </div>
        </div>

        <div className="estadistica-card">
          <div className="estadistica-icon">🤑</div>
          <div className="estadistica-info">
            <h3>Ganancias</h3>
            <p className="estadistica-valor">{formatPrice(gananciasTotales)}</p>
          </div>
        </div>
      </div>

      {/* Lista de ventas */}
      <div className="ventas-section">
        <h3>Ventas del {filtroFecha === 'hoy' ? 'Día' : filtroFecha === 'semana' ? 'Semana' : filtroFecha === 'mes' ? 'Mes' : 'Total'}</h3>
        
        {ventas.length === 0 ? (
          <div className="sin-ventas">
            <p>No hay ventas registradas para este período.</p>
          </div>
        ) : (
          <div className="ventas-lista">
            {ventas.map(venta => (
              <div key={venta.id} className="venta-tarjeta" onClick={() => verDetallesVenta(venta)}>
                <div className="venta-header">
                  <span className="venta-numero">Venta #{venta.id}</span>
                  <span className="venta-fecha">{formatFecha(venta.fecha)}</span>
                </div>
                <div className="venta-info">
                  <div className="venta-monto">
                    <strong>{formatPrice(venta.total)}</strong>
                    <span className={`metodo-pago ${venta.metodo_pago.toLowerCase()}`}>{venta.metodo_pago}</span>
                  </div>
                  {venta.cliente_nombre && <div className="venta-cliente"><span>👤 {venta.cliente_nombre}</span></div>}
                  {venta.deuda > 0 && <div className="venta-deuda"><span>⚠️ Deuda: {formatPrice(venta.deuda)}</span></div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalles */}
      {ventaSeleccionada && (
        <div className="modal-overlay" onClick={() => setVentaSeleccionada(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalles de Venta #{ventaSeleccionada.id}</h3>
              <button className="cerrar-modal" onClick={() => setVentaSeleccionada(null)}>×</button>
            </div>
            
            <div className="venta-detalles">
              <div className="detalle-grid">
                <div className="detalle-item"><label>Fecha:</label><span>{formatFecha(ventaSeleccionada.fecha)}</span></div>
                <div className="detalle-item"><label>Total:</label><span className="monto-total">{formatPrice(ventaSeleccionada.total)}</span></div>
                <div className="detalle-item"><label>Recibido:</label><span>{formatPrice(ventaSeleccionada.recibido)}</span></div>
                <div className="detalle-item"><label>Cambio:</label><span>{formatPrice(ventaSeleccionada.cambio)}</span></div>
                <div className="detalle-item"><label>Método:</label><span className={`metodo-pago ${ventaSeleccionada.metodo_pago.toLowerCase()}`}>{ventaSeleccionada.metodo_pago}</span></div>
                {ventaSeleccionada.deuda > 0 && <div className="detalle-item"><label>Deuda pendiente:</label><span className="deuda-texto">{formatPrice(ventaSeleccionada.deuda)}</span></div>}
              </div>

              <h4>Productos vendidos:</h4>
              <div className="productos-lista">
                {detallesVenta.map(detalle => (
                  <div key={detalle.id} className="producto-item">
                    <div className="producto-info">
                      <span className="producto-nombre">{detalle.producto_nombre}</span>
                      <span className="producto-sku">SKU: {detalle.sku}</span>
                    </div>
                    <div className="producto-precios">
                      <span className="producto-cantidad">{detalle.cantidad} × {formatPrice(detalle.precio)}</span>
                      <span className="producto-total">{formatPrice(detalle.cantidad * detalle.precio)}</span>
                      <span className="producto-ganancia">Ganancia: {formatPrice((detalle.precio - detalle.purchase_price) * detalle.cantidad)}</span>
                    </div>
                  </div>
                ))}
                <div className="producto-total-general"><strong>Total: {formatPrice(ventaSeleccionada.total)}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MisVentas;
