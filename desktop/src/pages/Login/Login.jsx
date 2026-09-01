import { useState } from "react";
import "./Login.css";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }

    if (username !== "admin" || password !== "1234") {
      setError("Incorrect username or password.");
      return;
    }

    setError("");
    onLogin();
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Hybrid POS</h1>

        <p className="subtitle">
          Retail &amp; Inventory Management System
        </p>

        <div className="input-group">
          <label htmlFor="username">Username(admin)</label>

          <input
            id="username"
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoFocus
          />
        </div>

        <div className="input-group">
          <label htmlFor="password">Password(1234)</label>

          <input
            id="password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && <p className="login-error">{error}</p>}

        <button className="login-btn" type="submit">
          Login
        </button>

        <p className="version">
          Version 1.0 • Offline Ready
        </p>
      </form>
    </div>
  );
}

export default Login;