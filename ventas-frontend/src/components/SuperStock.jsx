import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SuperStock = () => {
  // Usar una clave única para el almacenamiento local, como el ID del usuario
  const currentUserId = 1;
  const localStorageKey = `superstock_temp_products_${currentUserId}`;

  // Estado para la lista de categorías
  const [categories, setCategories] = useState([]);
  
  // Estado para productos agregados a tabla temporal
  // Inicializar el estado con datos del localStorage
  const [addedProducts, setAddedProducts] = useState(() => {
    try {
      const storedProducts = localStorage.getItem(localStorageKey);
      return storedProducts ? JSON.parse(storedProducts) : [];
    } catch (error) {
      console.error('Error parsing localStorage data:', error);
      return [];
    }
  });

  // Estado para el nuevo producto
  const [newProduct, setNewProduct] = useState({ 
    sku: '', 
    name: '', 
    description: '', 
    stock: 0, 
    stockUnit: 'Unidad', 
    categoria_id: null,
    price: 0
  });

  // Estado para producto existente (si coincide SKU)
  const [existingProduct, setExistingProduct] = useState(null);

  // Estados de calculadora de precios
  const [purchasePrice, setPurchasePrice] = useState('');
  const [profitPercentage, setProfitPercentage] = useState('');
  const [calculatedProfitPercentage, setCalculatedProfitPercentage] = useState('');
  const [calculationMode, setCalculationMode] = useState('price');

  // Mensajes de estado
  const [message, setMessage] = useState(null);

  // Modal ver todos
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Timeout búsqueda SKU
  const [searchTimeout, setSearchTimeout] = useState(null);

  // 🔹 Guardar productos en localStorage cada vez que `addedProducts` cambie
  useEffect(() => {
    localStorage.setItem(localStorageKey, JSON.stringify(addedProducts));
  }, [addedProducts, localStorageKey]);

  // 🔹 Traer categorías al inicio
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('http://localhost:4000/api/stock/categories');
        setCategories(response.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // 🔹 Buscar producto por SKU en tabla principal
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);

    if (newProduct.sku.trim() !== '') {
      const timeout = setTimeout(async () => {
        try {
          const response = await axios.get(
            `http://localhost:4000/api/stock/products/by-sku/${newProduct.sku}`
          );
          const product = response.data;
          
          setExistingProduct(product);
          setNewProduct(prev => ({
            ...prev,
            name: product.name,
            description: product.description,
            stock: 0, 
            stockUnit: product.stock_unit,
            categoria_id: product.categoria_id,
            price: product.price
          }));
          setPurchasePrice(product.purchase_price);
          setMessage({ text: `Producto '${product.name}' encontrado en stock.`, type: 'info' });
        } catch (error) {
          if (error.response && error.response.status === 404) {
            setExistingProduct(null);
            setNewProduct(prev => ({
              ...prev,
              name: '',
              description: '',
              stock: 0,
              categoria_id: null,
              price: 0
            }));
            setPurchasePrice('');
            setProfitPercentage('');
            setMessage({ text: 'SKU no encontrado, se guardará como producto nuevo en temporal.', type: 'info' });
          } else {
            console.error('Error buscando producto:', error);
            setMessage({ text: 'Error al buscar producto.', type: 'error' });
          }
        }
      }, 500);

      setSearchTimeout(timeout);
    }
  }, [newProduct.sku]);

  // 🔹 Calculadora de precios
  useEffect(() => {
    const price = parseFloat(purchasePrice);
    
    if (calculationMode === 'price') {
      const profit = parseFloat(profitPercentage);
      if (!isNaN(price) && !isNaN(profit)) {
        const calculatedPrice = price * (1 + profit / 100);
        setNewProduct(prev => ({ ...prev, price: calculatedPrice }));
      }
    } else {
      const salePrice = parseFloat(newProduct.price);
      if (!isNaN(price) && !isNaN(salePrice) && price > 0) {
        const calculatedProfit = ((salePrice - price) / price) * 100;
        setCalculatedProfitPercentage(calculatedProfit.toFixed(2));
      } else {
        setCalculatedProfitPercentage('N/A');
      }
    }
  }, [purchasePrice, profitPercentage, newProduct.price, calculationMode]);

  // 🔹 Guardar en tabla temporal
  const handleAddProduct = async () => {
    try {
      const productData = {
        sessionId: `user_${currentUserId}`,
        sku: newProduct.sku.trim(),
        name: newProduct.name.trim(),
        description: newProduct.description.trim(),
        stock: parseFloat(newProduct.stock) || 0,
        stockUnit: newProduct.stockUnit || 'Unidad',
        categoria_id: newProduct.categoria_id || null,
        price: parseFloat(newProduct.price) || 0,
        added_stock: parseFloat(newProduct.stock) || 0,
        purchase_price: parseFloat(purchasePrice) || 0,
        user_id: currentUserId
      };

      // Validar campos clave
      if (!productData.sessionId || !productData.sku || !productData.added_stock || !productData.purchase_price) {
        setMessage({ text: 'Faltan datos clave para agregar el producto.', type: 'error' });
        return;
      }

      // A diferencia del código original, ahora solo actualizamos el estado local.
      // La persistencia en la base de datos se hará en 'Finalizar'.
      // Para evitar duplicados en la lista local, podrías buscar y actualizar.
      const productExists = addedProducts.find(p => p.sku === productData.sku);
      if (productExists) {
        setAddedProducts(prev => prev.map(p => 
          p.sku === productData.sku ? { ...productData, added_stock: p.added_stock + productData.added_stock } : p
        ));
      } else {
        setAddedProducts(prev => [...prev, productData]);
      }

      // Resetear campos
      setExistingProduct(null);
      setNewProduct({ sku: '', name: '', description: '', stock: 0, stockUnit: 'Unidad', categoria_id: null, price: 0 });
      setPurchasePrice('');
      setProfitPercentage('');
      setCalculatedProfitPercentage('');

      setMessage({ text: 'Producto agregado a tabla temporal.', type: 'info' });
      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error('Error agregando producto temporal:', error);
      setMessage({ text: 'Error al guardar en temporal.', type: 'error' });
    }
  };

  // 🔹 Finalizar → mover todo de temp_products a products
  const handleFinalizeStock = async () => {
    try {
      await axios.post('http://localhost:4000/api/stock/finalize', {
        sessionId: `user_${currentUserId}`,
        products: addedProducts // Enviar todos los productos guardados en el estado
      });
      setAddedProducts([]); // Limpiar la lista de productos
      localStorage.removeItem(localStorageKey); // Limpiar localStorage
      setMessage({ text: 'Productos trasladados a Control Stock.', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error finalizando stock:', error);
      setMessage({ text: 'Error al finalizar stock.', type: 'error' });
    }
  };

  const handleSetSuggestedPrice = () => {
    if (calculationMode === 'price') {
      const suggestedPrice = parseFloat(purchasePrice) * (1 + parseFloat(profitPercentage) / 100);
      setNewProduct(prev => ({ ...prev, price: suggestedPrice }));
    }
  };

  return (
    <>
      <div className="section super-stock-section">
        <h3 className="section-title">Registro de Compras (Super Stock)</h3>
        <div className="form-container">
          <div className="form-card">
            <h4>Agregar Nuevo Stock</h4>
            {message && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}
            <input
              type="text"
              placeholder="SKU"
              value={newProduct.sku}
              onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
            />
            <input
              type="text"
              placeholder="Nombre"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Descripción"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
            />
            <div className="input-group">
              <input
                type="number"
                placeholder="Cantidad"
                value={newProduct.stock}
                onChange={(e) => setNewProduct({ ...newProduct, stock: parseFloat(e.target.value) })}
              />
              <select
                id="stockUnit"
                value={newProduct.stockUnit}
                onChange={(e) => setNewProduct({ ...newProduct, stockUnit: e.target.value })}
                className="select-unit"
              >
                <option value="Unidad">Unidad</option>
                <option value="Kilo">Kilo</option>
              </select>
            </div>

            <div className="divider"></div>
            
            <div className="calculation-mode-toggle">
              <button
                className={`mode-button ${calculationMode === 'price' ? 'active' : ''}`}
                onClick={() => setCalculationMode('price')}
              >
                Calcular Precio de Venta
              </button>
              <button
                className={`mode-button ${calculationMode === 'profit' ? 'active' : ''}`}
                onClick={() => setCalculationMode('profit')}
              >
                Calcular % de Ganancia
              </button>
            </div>
            
            <input
              type="number"
              placeholder="Precio de Compra"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />

            {calculationMode === 'price' ? (
              <>
                <input
                  type="number"
                  placeholder="Porcentaje de Ganancia (%)"
                  value={profitPercentage}
                  onChange={(e) => setProfitPercentage(e.target.value)}
                />
                <p className="suggested-price">
                  Precio de Venta Sugerido: <strong>${(parseFloat(purchasePrice) * (1 + parseFloat(profitPercentage) / 100)).toFixed(2)}</strong>
                </p>
                <button
                  className="action-button set-price-button"
                  onClick={handleSetSuggestedPrice}
                >
                  Establecer precio sugerido
                </button>
              </>
            ) : (
              <>
                <input
                  type="number"
                  placeholder="Precio de Venta Deseado"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
                />
                <p className="suggested-price">
                  Porcentaje de Ganancia: <strong>{calculatedProfitPercentage}%</strong>
                </p>
              </>
            )}

            <div className="divider"></div>

            <select
              value={newProduct.categoria_id || ''}
              onChange={(e) => setNewProduct({ ...newProduct, categoria_id: e.target.value === '' ? null : parseInt(e.target.value) })}
            >
              <option value="">Selecciona una categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nombre}
                </option>
              ))}
            </select>
            <button className="add-button" onClick={handleAddProduct}>
              {existingProduct ? "Actualizar en Temporal" : "Agregar a Temporal"}
            </button>
          </div>
        </div>

        {addedProducts.length > 0 && (
          <div className="added-products-list-container">
            <h4>Productos en Temporal</h4>
            <ul className="added-products-list">
              {addedProducts.slice(0, 4).map((product, index) => (
                <li key={index} className="product-list-item">
                  <p><strong>SKU:</strong> {product.sku}</p>
                  <p><strong>Nombre:</strong> {product.name}</p>
                  <p><strong>Cantidad:</strong> {product.added_stock} {product.stockUnit || product.stock_unit}</p>
                  <p><strong>Precio:</strong> ${product.price.toFixed(2)}</p>
                </li>
              ))}
            </ul>
            {addedProducts.length > 4 && (
              <button className="action-button set-price-button" onClick={() => setShowAllProducts(true)}>
                Ver todos ({addedProducts.length})
              </button>
            )}
            <button className="finalize-button" onClick={handleFinalizeStock}>
              Finalizar y llevar a Stock
            </button>
          </div>
        )}
      </div>

      {showAllProducts && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-button" onClick={() => setShowAllProducts(false)}>&times;</button>
            <h4>Todos los Productos en Temporal</h4>
            <ul className="added-products-list">
              {addedProducts.map((product, index) => (
                <li key={index} className="product-list-item">
                  <p><strong>SKU:</strong> {product.sku}</p>
                  <p><strong>Nombre:</strong> {product.name}</p>
                  <p><strong>Cantidad:</strong> {product.added_stock} {product.stockUnit || product.stock_unit}</p>
                  <p><strong>Precio:</strong> ${product.price.toFixed(2)}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default SuperStock;