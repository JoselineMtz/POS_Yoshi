import React from 'react';

const Sidebar = ({ onSelectSection, currentSection }) => {
  const menuItems = [
    { id: 'stock', label: 'Control de Stock', },
    { id: 'superStock', label: 'Registro de Compras' },
    { id: 'employees', label: 'Gestión de Empleados' },
    { id: 'pos', label: 'Punto de Venta',},
    { id: 'ventas', label: 'Mis Ventas'},
    { id: 'logout', label: 'Cerrar Sesión' }
  ];

  return (
    <>
      <style jsx>{`
        .sidebar-container {
          background-color: #1f2937; /* bg-gray-800 */
          color: #ffffff;
          padding: 1.5rem;
          width: 16rem; /* w-64 */
          min-height: 100vh;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); /* shadow-lg */
          display: flex;
          flex-direction: column;
        }
        .sidebar-title {
          font-size: 1.5rem; /* text-2xl */
          font-weight: 700; /* font-bold */
          margin-bottom: 1.5rem;
        }
        .sidebar-nav-item {
          cursor: pointer;
          padding: 0.75rem 1rem; /* py-3 px-4 */
          border-radius: 0.5rem; /* rounded-lg */
          transition: background-color 0.2s, color 0.2s; /* transition-colors duration-200 */
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
        }
        .sidebar-nav-item:hover {
          background-color: #374151; /* hover:bg-gray-700 */
          color: #818cf8; /* hover:text-indigo-400 */
        }
        .sidebar-nav-item.active {
          background-color: #374151;
          color: #818cf8;
        }
        .sidebar-icon {
          margin-right: 0.75rem;
          font-size: 1.2rem;
        }
        ul {
          list-style: none;
          padding: 0;
        }
      `}</style>
      <div className="sidebar-container">
        <h2 className="sidebar-title">Panel Admin</h2>
        <nav>
          <ul>
            {menuItems.map((item) => (
              <li
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`sidebar-nav-item ${currentSection === item.id ? 'active' : ''}`}
              >
                <span className="sidebar-icon">{item.icon}</span>
                {item.label}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;