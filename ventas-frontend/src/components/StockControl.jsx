import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './../Admin.css';

const StockControl = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({ sku: '', name: '', description: '', price: '', stock: '', stockUnit: 'Unidad', categoria_id: null, purchase_price: '' });
  const [currentUserId] = useState(1);
  const scannerInputRef = useRef(null);

  // Estados para la vista y la búsqueda
  const [showFullStock, setShowFullStock] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);

  // Estado para mostrar/ocultar la administración de categorías
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);

  // Estados para los modales y mensajes
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Lógica para obtener productos y categorías
  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:4000/api/stock/products');
      setProducts(response.data.sort((a, b) => b.id - a.id));
      setFilteredProducts(response.data.sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:4000/api/stock/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    if (scannerInputRef.current && !showFullStock) {
      scannerInputRef.current.focus();
    }
  }, [showFullStock]);

  // Lógica para el buscador
  useEffect(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const results = products.filter(product =>
      product.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      product.sku.toLowerCase().includes(lowerCaseSearchTerm) ||
      (product.categoria_nombre && product.categoria_nombre.toLowerCase().includes(lowerCaseSearchTerm))
    );
    setFilteredProducts(results);
  }, [searchTerm, products]);

  // Funciones de gestión (CRUD)
  const handleSkuSearch = async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      try {
        const response = await axios.get(`http://localhost:4000/api/stock/products/by-sku/${newProduct.sku}`);
        const productFound = response.data;
        if (productFound) {
          setNewProduct({
            ...productFound,
            price: productFound.price.toString(),
            stock: productFound.stock.toString(),
            stockUnit: productFound.stock_unit || 'Unidad',
            categoria_id: productFound.categoria_id || null,
            purchase_price: productFound.purchase_price ? productFound.purchase_price.toString() : ''
          });
          console.log(`Producto con SKU ${productFound.sku} encontrado y listo para actualizar.`);
        } else {
          console.log(`Producto con SKU ${newProduct.sku} no encontrado. Listo para agregar uno nuevo.`);
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log(`Producto con SKU ${newProduct.sku} no encontrado. Listo para agregar uno nuevo.`);
        }
        console.error('Error al escanear el producto:', error);
      }
    }
  };

  const handleAddOrUpdateProduct = async () => {
    try {
      const productToSave = {
        sku: newProduct.sku,
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price !== '' ? parseFloat(newProduct.price) : 0,
        stock: newProduct.stock !== '' ? (newProduct.stockUnit === 'Kilos' ? parseFloat(newProduct.stock) : parseInt(newProduct.stock)) : 0,
        stockUnit: newProduct.stockUnit,
        user_id: currentUserId,
        categoria_id: newProduct.categoria_id,
        purchase_price: newProduct.purchase_price !== '' ? parseFloat(newProduct.purchase_price) : 0
      };

      // Usar el endpoint upsert que creaste en el backend
      await axios.post('http://localhost:4000/api/stock/products/upsert', productToSave);
      
      setNewProduct({ sku: '', name: '', description: '', price: '', stock: '', stockUnit: 'Unidad', categoria_id: null, purchase_price: '' });
      fetchProducts();
    } catch (error) {
      console.error('Error al guardar el producto:', error);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await axios.delete(`http://localhost:4000/api/stock/products/${id}`);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleAddCategory = async () => {
    try {
      if (newCategoryName.trim() === '') {
        console.log('El nombre de la categoría no puede estar vacío.');
        return;
      }
      await axios.post('http://localhost:4000/api/stock/categories', { nombre: newCategoryName });
      setNewCategoryName('');
      fetchCategories();
      
      // Mostrar mensaje de éxito
      setSuccessMessage(`Categoría "${newCategoryName}" agregada con éxito`);
      setShowSuccessMessage(true);
      
      // Ocultar el mensaje después de 3 segundos
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await axios.delete(`http://localhost:4000/api/stock/categories/${id}`);
      fetchCategories();
      setShowDeleteModal(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const confirmDeleteCategory = (category) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const handleEditClick = (product) => {
    setEditingProduct({
      ...product,
      price: product.price.toString(),
      stock: product.stock.toString(),
      stockUnit: product.stock_unit || 'Unidad',
      description: product.description || '',
      purchase_price: product.purchase_price ? product.purchase_price.toString() : ''
    });
  };

  const handleUpdateProduct = async () => {
    try {
      const productToUpdate = {
        sku: editingProduct.sku,
        name: editingProduct.name,
        description: editingProduct.description,
        price: parseFloat(editingProduct.price),
        stock: editingProduct.stockUnit === 'Kilos' ? parseFloat(editingProduct.stock) : parseInt(editingProduct.stock),
        stockUnit: editingProduct.stockUnit,
        user_id: currentUserId,
        categoria_id: editingProduct.categoria_id,
        purchase_price: parseFloat(editingProduct.purchase_price)
    };
      
      // Usar el endpoint upsert para actualizar
      await axios.post('http://localhost:4000/api/stock/products/upsert', productToUpdate);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const formatStock = (stock) => {
    if (stock % 1 === 0) {
      return parseInt(stock, 10);
    }
    return parseFloat(stock).toFixed(2);
  };
  
  // Renderizado condicional para mostrar el inventario completo
  if (showFullStock) {
    return (
      <div className="section stock-control-section">
        <h3 className="section-title">Inventario Completo</h3>
        <button className="back-button" onClick={() => setShowFullStock(false)}>
          Volver
        </button>
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o categoría"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="product-list-container full-list">
          <ul className="product-list">
            {filteredProducts.map((product) => (
              <li key={product.id} className="product-item-card">
                {editingProduct && editingProduct.id === product.id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editingProduct.sku}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    />
                    <input
                      type="text"
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Descripción"
                      value={editingProduct.description}
                      onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    />
                    <input
                      type="number"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="Precio de compra"
                      value={editingProduct.purchase_price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, purchase_price: e.target.value })}
                    />
                    <div className="input-group">
                      <input
                        type="number"
                        value={editingProduct.stock}
                        onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                      />
                      <select
                        value={editingProduct.stockUnit || 'Unidad'}
                        onChange={(e) => setEditingProduct({ ...editingProduct, stockUnit: e.target.value })}
                      >
                        <option value="Unidad">Unidad</option>
                        <option value="Kilos">Kilos</option>
                      </select>
                    </div>
                    <select
                      value={editingProduct.categoria_id || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, categoria_id: e.target.value === '' ? null : parseInt(e.target.value) })}
                    >
                      <option value="">Selecciona una categoría</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.nombre}
                        </option>
                      ))}
                    </select>
                    <div className="button-group">
                      <button onClick={handleUpdateProduct} className="action-button save-button">Guardar</button>
                      <button onClick={() => setEditingProduct(null)} className="action-button cancel-button">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="product-details">
                    <div className="details-text">
                      <p><strong>SKU:</strong> {product.sku}</p>
                      <p><strong>Nombre:</strong> {product.name}</p>
                      <p><strong>Precio:</strong> {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(product.price)}</p>
                      <p><strong>Stock:</strong> {formatStock(product.stock)} {product.stock_unit}</p>
                      {product.categoria_nombre && <p><strong>Categoría:</strong> {product.categoria_nombre}</p>}
                    </div>
                    <div className="button-group">
                      <button onClick={() => handleEditClick(product)} className="action-button edit-button">Editar</button>
                      <button onClick={() => handleDeleteProduct(product.id)} className="action-button delete-button">Eliminar</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Vista principal: formulario y últimos 5 productos
  const latestProducts = products.slice(0, 5);

  return (
    <div className="section stock-control-section">
      <h3 className="section-title">Control de Inventario</h3>
      
      {/* Mensaje de éxito */}
      {showSuccessMessage && (
        <div className="success-message">
          <span className="success-icon">✓</span>
          {successMessage}
        </div>
      )}
      
      <div className="form-container">
        <div className="form-card">
          <h4>Agregar o Actualizar Producto</h4>
          <input
            type="text"
            placeholder="SKU (Escanear o digitar)"
            value={newProduct.sku}
            onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
            onKeyDown={handleSkuSearch}
            ref={scannerInputRef}
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
          <input
            type="number"
            placeholder="Precio"
            value={newProduct.price}
            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
          />
          <input
            type="number"
            placeholder="Precio de compra"
            value={newProduct.purchase_price}
            onChange={(e) => setNewProduct({ ...newProduct, purchase_price: e.target.value })}
          />
          <div className="input-group">
            <input
              type="number"
              placeholder="Cantidad"
              value={newProduct.stock}
              onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
            />
            <select
              value={newProduct.stockUnit}
              onChange={(e) => setNewProduct({ ...newProduct, stockUnit: e.target.value })}
            >
              <option value="Unidad">Unidad</option>
              <option value="Kilos">Kilos</option>
            </select>
          </div>
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
          <button className="add-button" onClick={handleAddOrUpdateProduct}>
            {newProduct.id ? 'Actualizar Producto' : 'Agregar Producto'}
          </button>
        </div>

        <div className="form-card">
          <h4>Agregar Categoría</h4>
          <input
            type="text"
            placeholder="Nombre de la nueva categoría"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <button className="add-button" onClick={handleAddCategory}>Agregar Categoría</button>
          
          {/* Botón para administrar categorías */}
          <button 
            className="manage-categories-button" 
            onClick={() => setShowCategoryManagement(!showCategoryManagement)}
          >
            {showCategoryManagement ? 'Ocultar Categorías' : 'Administrar Categorías'}
          </button>
          
          {/* Vista de administración de categorías */}
          {showCategoryManagement && (
            <div className="category-management">
              <h5>Categorías Disponibles</h5>
              {categories.length === 0 ? (
                <p>No hay categorías registradas.</p>
              ) : (
                <ul className="category-list">
                  {categories.map((category) => (
                    <li key={category.id} className="category-item">
                      <span>{category.nombre}</span>
                      <button 
                        className="delete-category-button"
                        onClick={() => confirmDeleteCategory(category)}
                      >
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="product-list-container">
        <h4 className="list-title">Últimos Productos Agregados</h4>
        <ul className="product-list">
          {latestProducts.map((product) => (
            <li key={product.id} className="product-item-card">
              {editingProduct && editingProduct.id === product.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  />
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Descripción"
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  />
                  <input
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Precio de compra"
                    value={editingProduct.purchase_price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, purchase_price: e.target.value })}
                  />
                  <div className="input-group">
                    <input
                      type="number"
                      value={editingProduct.stock}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                    />
                    <select
                      value={editingProduct.stockUnit || 'Unidad'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stockUnit: e.target.value })}
                    >
                      <option value="Unidad">Unidad</option>
                      <option value="Kilos">Kilos</option>
                    </select>
                  </div>
                  <select
                    value={editingProduct.categoria_id || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoria_id: e.target.value === '' ? null : parseInt(e.target.value) })}
                  >
                    <option value="">Selecciona una categoría</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.nombre}
                      </option>
                    ))}
                  </select>
                  <div className="button-group">
                    <button onClick={handleUpdateProduct} className="action-button save-button">Guardar</button>
                    <button onClick={() => setEditingProduct(null)} className="action-button cancel-button">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="product-details">
                  <div className="details-text">
                    <p><strong>SKU:</strong> {product.sku}</p>
                    <p><strong>Nombre:</strong> {product.name}</p>
                    <p><strong>Precio:</strong> {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(product.price)}</p>
                    <p><strong>Stock:</strong> {formatStock(product.stock)} {product.stock_unit}</p>
                    {product.categoria_nombre && <p><strong>Categoría:</strong> {product.categoria_nombre}</p>}
                  </div>
                  <div className="button-group">
                    <button onClick={() => handleEditClick(product)} className="action-button edit-button">Editar</button>
                    <button onClick={() => handleDeleteProduct(product.id)} className="action-button delete-button">Eliminar</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="view-more-container">
          <button className="action-button view-all-button" onClick={() => setShowFullStock(true)}>
            Ver Stock Completo
          </button>
        </div>
      </div>

      {/* Modal de confirmación para eliminar categoría */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirmar Eliminación</h3>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de que quieres eliminar la categoría "{categoryToDelete.nombre}"?</p>
              <p className="warning-text">Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-button cancel-button"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="modal-button confirm-button"
                onClick={() => handleDeleteCategory(categoryToDelete.id)}
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockControl;