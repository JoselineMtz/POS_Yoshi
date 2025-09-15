import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './Pos.module.css';

const POS = () => {
  // ====== Estados de venta ======
  const [scannedSku, setScannedSku] = useState('');
  const [saleItems, setSaleItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [received, setReceived] = useState('');
  const [change, setChange] = useState(0);
  const [debt, setDebt] = useState(0);
  const [changeClass, setChangeClass] = useState(styles.zeroChange);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [isProcessing, setIsProcessing] = useState(false);

  // ====== Modales ======
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryMessage, setSummaryMessage] = useState('');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [productToWeigh, setProductToWeigh] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerData, setCustomerData] = useState({ rut: '', nombre: '', telefono: '' });
  const [clienteExistente, setClienteExistente] = useState(null);

  // ====== Ref ======
  const skuInputRef = useRef(null);

  // ====== Efectos ======
  // Focus en input SKU al montar componente
  useEffect(() => skuInputRef.current?.focus(), []);

  // Calcular total de venta
  useEffect(() => {
    const newTotal = saleItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    setTotal(newTotal);
  }, [saleItems]);

  // Calcular cambio y deuda
  useEffect(() => {
    const totalValue = parseFloat(total);
    const receivedValue = parseFloat(received);
    if (!isNaN(totalValue) && !isNaN(receivedValue)) {
      const calculatedChange = receivedValue - totalValue;
      setChange(calculatedChange);
      if (calculatedChange > 0) {
        setChangeClass(styles.positiveChange);
        setDebt(0);
      } else if (calculatedChange < 0) {
        setChangeClass(styles.negativeChange);
        setDebt(Math.abs(calculatedChange));
      } else {
        setChangeClass(styles.zeroChange);
        setDebt(0);
      }
    } else {
      setChange(0);
      setChangeClass(styles.zeroChange);
      setDebt(0);
    }
  }, [total, received]);

  // Buscar cliente por RUT
  useEffect(() => {
    const buscarCliente = async () => {
      if (customerData.rut.trim().length > 7) {
        try {
          const res = await axios.get(`http://localhost:4000/api/clientes/rut/${customerData.rut}`);
          setClienteExistente(res.data);
        } catch {
          setClienteExistente(null);
        }
      } else setClienteExistente(null);
    };
    const timeoutId = setTimeout(buscarCliente, 500);
    return () => clearTimeout(timeoutId);
  }, [customerData.rut]);

  // ====== Funciones ======
  const handleSkuScan = async (e) => {
    if (e.key !== 'Enter' || isProcessing || scannedSku.trim() === '') return;
    e.preventDefault();
    setIsProcessing(true);

    try {
      const { data: product } = await axios.get(`http://localhost:4000/api/stock/products/by-sku/${scannedSku}`);
      if (['kg', 'kilos'].includes(product.stock_unit.toLowerCase())) {
        setProductToWeigh(product);
        setShowWeightModal(true);
      } else {
        const index = saleItems.findIndex(item => item.sku === product.sku);
        if (index > -1) {
          const updated = [...saleItems];
          updated[index].quantity += 1;
          setSaleItems(updated);
        } else {
          setSaleItems(prev => [...prev, { ...product, quantity: 1 }]);
        }
      }
    } catch (error) {
      alert(error.response?.status === 404
        ? `Producto con SKU ${scannedSku} no encontrado.`
        : 'Error al buscar el producto.');
    } finally {
      setScannedSku('');
      setIsProcessing(false);
    }
  };

  const handleWeightSubmit = () => {
    const weight = parseFloat(weightInput);
    if (!isNaN(weight) && weight > 0) {
      setSaleItems(prev => [...prev, { ...productToWeigh, quantity: weight / 1000 }]);
      setShowWeightModal(false);
      setProductToWeigh(null);
      setWeightInput('');
    } else alert('Peso inválido. Ingrese un número mayor que 0.');
  };

  const handleWeightCancel = () => {
    setShowWeightModal(false);
    setProductToWeigh(null);
    setWeightInput('');
  };

  const registerSaleInDatabase = async (saleData) => {
    try {
      const res = await axios.post('http://localhost:4000/api/sales', {
        total: saleData.total,
        recibido: saleData.received,
        cambio: saleData.change,
        metodo_pago: saleData.paymentMethod,
        cliente_id: saleData.customer?.id || null,
        deuda: saleData.debt,
        user_id: 1,
        items: saleData.items.map(i => ({ producto_id: i.id, cantidad: i.quantity, precio: i.price }))
      });

      if (res.data.success && saleData.debt > 0 && saleData.customer?.id) {
        await axios.put(`http://localhost:4000/api/clientes/${saleData.customer.id}/saldo`, { monto: saleData.debt });
      }

      return res.data.success;
    } catch (error) {
      console.error("Error registrar venta:", error);
      return false;
    }
  };

  const handleRegisterSale = async () => {
    const finalChange = parseFloat(received) - parseFloat(total);
    if (finalChange < 0) {
      setShowCustomerModal(true);
    } else {
      const saleRecord = { items: saleItems, total, received: parseFloat(received), change: finalChange, paymentMethod, debt: 0 };
      const success = await registerSaleInDatabase(saleRecord);
      if (success) {
        setSummaryMessage(`Venta registrada!\nTotal: ${formatPrice(total)}\nRecibido: ${formatPrice(received)}\nCambio: ${formatPrice(finalChange)}`);
        setShowSummaryModal(true);
      } else alert('Error al registrar la venta.');
    }
  };

  const handleRegisterCustomer = async () => {
    if (!customerData.rut || !customerData.nombre || !customerData.telefono) {
      return alert('Complete todos los campos.');
    }

    try {
      let customerId = clienteExistente?.id;
      if (!customerId) {
        const payload = {
          rut: customerData.rut,
          nombre: customerData.nombre,
          telefono: customerData.telefono,
          email: customerData.email || '',
          direccion: customerData.direccion || ''
        };
        const res = await axios.post('http://localhost:4000/api/clientes', payload);
        customerId = res.data.id;
      }

      const finalChange = parseFloat(received) - parseFloat(total);
      const saleRecord = {
        items: saleItems,
        total,
        received: parseFloat(received),
        change: finalChange,
        paymentMethod,
        debt: Math.abs(finalChange),
        customer: { id: customerId, ...customerData }
      };

      const success = await registerSaleInDatabase(saleRecord);

      if (success) {
        setSummaryMessage(
          `Venta registrada!\nTotal: ${formatPrice(total)}\nRecibido: ${formatPrice(received)}\nSaldo Pendiente: ${formatPrice(Math.abs(finalChange))}\nCliente: ${customerData.nombre}`
        );
        setShowCustomerModal(false);
        setShowSummaryModal(true);
      } else alert('Error al registrar la venta.');
    } catch (error) {
      console.error("Error registrar cliente:", error);
      alert('Error al registrar el cliente.');
    }
  };

  const clearSale = () => {
    setScannedSku('');
    setSaleItems([]);
    setTotal(0);
    setReceived('');
    setChange(0);
    setDebt(0);
    setPaymentMethod('Efectivo');
    setCustomerData({ rut: '', nombre: '', telefono: '' });
    setClienteExistente(null);
  };

  const handleCloseModal = () => {
    setShowSummaryModal(false);
    clearSale();
  };

  const formatPrice = (price) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(price);

  // ====== JSX ======
  return (
    <div className={styles.posContainerMain}>
      <div className={styles.posSection}>
        <h3 className={styles.sectionTitle}>Punto de Venta</h3>
        <div className={styles.posCardsContainer}>
          {/* Venta */}
          <div className={styles.posCard}>
            <h4>Venta</h4>
            <div className={styles.posItem}>
              <label>Escanear o digitar SKU:</label>
              <input
                type="text"
                value={scannedSku}
                onChange={e => setScannedSku(e.target.value)}
                onKeyDown={handleSkuScan}
                placeholder="Escanear o digitar SKU"
                ref={skuInputRef}
                disabled={isProcessing}
              />
            </div>

            <div className={styles.saleItemsList}>
              <h5>Productos en la venta:</h5>
              {saleItems.length === 0
                ? <p>No hay productos agregados.</p>
                : (
                  <ul className={styles.saleItems}>
                    {saleItems.map((item, i) => (
                      <li key={i} className={styles.saleItem}>
                        <span>{item.name}</span>
                        <span>
                          {['kg', 'kilos'].includes(item.stock_unit.toLowerCase())
                            ? <>
                                {formatPrice(item.price * item.quantity)}<br/>
                                <small>({formatPrice(item.price)}/kg x {(item.quantity * 1000).toFixed(0)}gr)</small>
                              </>
                            : `${formatPrice(item.price)} x ${item.quantity}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              <div className={styles.totalDisplay}><p><strong>Total:</strong> {formatPrice(total)}</p></div>
            </div>

            <button className={styles.button} onClick={clearSale}>Limpiar Venta</button>
          </div>

          {/* Calculadora de Cambio */}
          <div className={styles.posCard}>
            <h4>Calculadora de Cambio</h4>
            <div className={styles.posItem}><label>Total a Pagar:</label><span>{formatPrice(total)}</span></div>
            <div className={styles.posItem}>
              <label>Monto Recibido:</label>
              <input type="number" value={received} onChange={e => setReceived(e.target.value)} placeholder="0" min="0" step="100"/>
            </div>
            <div className={styles.posItem}>
              <label>Método de Pago:</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Credito">Crédito</option>
              </select>
            </div>

            <div className={`${styles.changeDisplayContainer} ${changeClass}`}>
              <p>Cambio: {formatPrice(change)}</p>
            </div>

            {debt > 0 && (
              <div className={styles.debtDisplay}>
                <p>Saldo Pendiente: {formatPrice(debt)}</p>
              </div>
            )}

            <button className={styles.button} onClick={handleRegisterSale}>Registrar Venta</button>
          </div>
        </div>
      </div>

      {/* Modal Peso */}
      {showWeightModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h4>Ingresar peso para {productToWeigh?.name}</h4>
            <input type="number" value={weightInput} onChange={e => setWeightInput(e.target.value)} placeholder="Peso en gramos" className={styles.modalInput}/>
            <div className={styles.modalButtons}>
              <button className={styles.button} onClick={handleWeightSubmit}>Aceptar</button>
              <button className={styles.button} onClick={handleWeightCancel}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cliente */}
      {showCustomerModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h4>Registrar Cliente (Saldo Pendiente)</h4>
            <input type="text" placeholder="RUT" value={customerData.rut} onChange={e => setCustomerData({...customerData, rut: e.target.value})} className={styles.modalInput}/>
            <input type="text" placeholder="Nombre" value={customerData.nombre} onChange={e => setCustomerData({...customerData, nombre: e.target.value})} className={styles.modalInput}/>
            <input type="text" placeholder="Teléfono" value={customerData.telefono} onChange={e => setCustomerData({...customerData, telefono: e.target.value})} className={styles.modalInput}/>
            <div className={styles.modalButtons}>
              <button className={styles.button} onClick={handleRegisterCustomer}>Registrar Cliente y Venta</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Resumen */}
      {showSummaryModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h4>Resumen de Venta</h4>
            <pre>{summaryMessage}</pre>
            <button className={styles.button} onClick={handleCloseModal}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
