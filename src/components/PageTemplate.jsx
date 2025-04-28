import React from "react";

export const PageTemplate = ({ children }) => {
  return (
    <div style={{
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "0 20px",
      width: "100%",
      boxSizing: "border-box"
    }}>
      {children}
    </div>
  );
};
