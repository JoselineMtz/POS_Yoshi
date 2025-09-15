import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Admin from "./Admin";
import Vendedor from "./Vendedor";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta por defecto */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rutas principales */}
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/vendedor" element={<Vendedor />} />

        {/* Ruta para páginas no encontradas */}
        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
