import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import StockControl from './components/StockControl';
import EmployeeManagement from './components/EmployeeManagement';
import POS from './components/POS';
import SuperStock from './components/SuperStock';
import MisVentas from './components/MisVentas;';
import './Admin.css'; // Usamos el mismo CSS para el layout y los estilos

const Admin = () => {
  const [currentSection, setCurrentSection] = useState('stock');
  
  const renderSection = () => {
    switch (currentSection) {
      case 'stock':
        return <StockControl />;
      case 'superStock':
        return <SuperStock />;
      case 'employees':
        return <EmployeeManagement />;
      case 'pos':
        return <POS />;
      case 'ventas':
        return <MisVentas />;
      case 'logout':
        // Lógica de cierre de sesión
        alert('Sesión cerrada.');
        // Redireccionar al login o página principal
        window.location.href = '/login';
        return null;
      default:
        return <StockControl />;
    }
  };

  return (
    <div className="admin-container">
      <Sidebar onSelectSection={setCurrentSection} currentSection={currentSection} />
      <div className="main-content">
        {renderSection()}
      </div>
    </div>
  );
};

export default Admin;