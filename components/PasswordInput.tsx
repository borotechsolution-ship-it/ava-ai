"use client";

import { useState } from "react";

export function PasswordInput() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="minimal-input password-input">
      <span className="field-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
          <path
            d="M7.5 10.2V8.1a4.5 4.5 0 0 1 9 0v2.1"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="M6.6 10.2h10.8c.9 0 1.6.7 1.6 1.6v6.1c0 .9-.7 1.6-1.6 1.6H6.6c-.9 0-1.6-.7-1.6-1.6v-6.1c0-.9.7-1.6 1.6-1.6Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path
            d="M12 14.1v2"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <input
        id="sales-password"
        name="password"
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        placeholder="Enter password"
        required
      />
      <button
        className="password-toggle"
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
            <path
              d="M3.4 12.5s3-5.7 8.6-5.7 8.6 5.7 8.6 5.7-3 5.7-8.6 5.7-8.6-5.7-8.6-5.7Z"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />
            <path
              d="M14.4 12.5a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0Z"
              stroke="currentColor"
              strokeWidth="1.9"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
            <path
              d="M3.4 12.5s3-5.7 8.6-5.7 8.6 5.7 8.6 5.7-3 5.7-8.6 5.7-8.6-5.7-8.6-5.7Z"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />
            <path
              d="M14.4 12.5a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0Z"
              stroke="currentColor"
              strokeWidth="1.9"
            />
            <path
              d="m4.5 4.8 15 15"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
