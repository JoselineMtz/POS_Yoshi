import React, { useState } from "react";
import axios from "axios";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(""); // cambio aquí
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post("http://localhost:4000/login", {
        username,
        password, // cambio aquí
      });

      alert(res.data.message);

      if (res.data.rol === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/vendedor";
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error en login");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "linear-gradient(135deg, #f5f7fa, #c3cfe2)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          display: "flex",
          flexDirection: "column",
          width: 350,
          padding: 30,
          borderRadius: 12,
          boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
          backgroundColor: "#fff",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: 20, color: "#333" }}>
          Iniciar Sesión
        </h2>
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            marginBottom: 15,
            padding: 10,
            borderRadius: 6,
            border: "1px solid #ccc",
            fontSize: 16,
          }}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password} // cambio aquí
          onChange={(e) => setPassword(e.target.value)} // cambio aquí
          style={{
            marginBottom: 15,
            padding: 10,
            borderRadius: 6,
            border: "1px solid #ccc",
            fontSize: 16,
          }}
          required
        />
        <button
          type="submit"
          style={{
            padding: 12,
            borderRadius: 6,
            border: "none",
            backgroundColor: "#4a90e2",
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
            transition: "0.3s",
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = "#357ABD")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#4a90e2")}
        >
          Ingresar
        </button>
        {error && (
          <p style={{ color: "red", marginTop: 15, textAlign: "center" }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
