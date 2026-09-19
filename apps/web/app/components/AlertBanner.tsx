"use client";

import React from "react";

interface AlertBannerProps {
  activeAlert: string | null;
  onDismiss: () => void;
}

export default function AlertBanner({ activeAlert, onDismiss }: AlertBannerProps) {
  if (!activeAlert) return null;

  return (
    <div style={{
      background: "#fef3c7",
      border: "1px solid #fde68a",
      color: "#92400e",
      padding: "10px 16px",
      borderRadius: 8,
      marginBottom: 20,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: 13,
      fontWeight: 600
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>?? Stage Alert:</span>
        <span>{activeAlert}</span>
      </div>
      <button onClick={onDismiss} style={{ color: "#92400e", fontWeight: 700, padding: "2px 6px" }}>?</button>
    </div>
  );
}
