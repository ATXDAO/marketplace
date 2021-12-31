import * as React from "react";

export const EthIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M5.75 10L12 4.75L18.25 10M5.75 10L12 19.25L18.25 10M5.75 10L12 12.25L18.25 10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></path>
  </svg>
);

export const SwapIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4.75 10.25H19.25L13.75 4.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></path>
    <path
      d="M19.25 13.75H4.75L10.25 19.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></path>
  </svg>
);

export const UsdIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    fill="currentColor"
    viewBox="0 0 24 24"
    className={className}
  >
    <circle
      cx="12"
      cy="12"
      r="7.25"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    ></circle>
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M14.25 8.75H11.375C10.4775 8.75 9.75 9.47754 9.75 10.375V10.375C9.75 11.2725 10.4775 12 11.375 12H12.625C13.5225 12 14.25 12.7275 14.25 13.625V13.625C14.25 14.5225 13.5225 15.25 12.625 15.25H9.75"
    ></path>
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M12 7.75V8.25"
    ></path>
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M12 15.75V16.25"
    ></path>
  </svg>
);

export const MagicIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    className={className}
  >
    <g>
      <path
        d="M10.5,18s0,0,0,0Q6.73,10.51,3,3S3,3,3,3H9S9,3,9,3s4.45,8.9,4.48,9h0l-3,5.94,0,0s0,0,0,0Z"
        fill="currentColor"
      />
      <path
        d="M16.48,18s0,0,0,0V3.07a.13.13,0,0,1,0-.06s0,0,.05,0H24s0,0,0,0,0,0,0,0l-.25,0a2.83,2.83,0,0,0-1.64.68,3,3,0,0,0-1,1.53A3,3,0,0,0,21,6v9a3.07,3.07,0,0,0,.19,1.08,3,3,0,0,0,2.13,1.85c.12,0,.24.05.37.06L24,18h0s0,0,0,0H16.48Z"
        fill="currentColor"
      />
      <path
        d="M6,18v0h-.3a2.62,2.62,0,0,0-.57.12,3,3,0,0,0-2,2.15,2.25,2.25,0,0,0-.07.52A.61.61,0,0,0,3,21s0,0,0,0,0,0,0,0,0-.07,0-.1A3,3,0,0,0,.73,18.11,3.07,3.07,0,0,0,.31,18H0v0a.07.07,0,0,1,.06,0c.14,0,.27,0,.4,0a2.89,2.89,0,0,0,.82-.25,3,3,0,0,0,1.62-2A2.1,2.1,0,0,0,3,15.14.44.44,0,0,1,3,15s0,0,0,0,0,.09,0,.14a2.82,2.82,0,0,0,.61,1.67,3,3,0,0,0,1.53,1,3.33,3.33,0,0,0,.55.1Z"
        fill="currentColor"
      />
    </g>
  </svg>
);
