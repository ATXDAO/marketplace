import type { ReactNode } from "react";
import { Spinner } from "./Spinner";
import classNames from "clsx";

type ButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  onClick: () => void;
  variant?: "secondary";
};

const Button = ({
  children,
  isLoading = false,
  disabled = isLoading,
  loadingText,
  onClick,
  variant,
}: ButtonProps) => {
  return (
    <button
      type="button"
      className={classNames(
        variant === "secondary"
          ? "text-red-700 bg-red-100 hover:bg-red-200 dark:bg-gray-200 dark:text-gray-600"
          : "text-white bg-red-600 hover:bg-red-700 dark:bg-gray-700 dark:text-gray-200",
        "flex justify-center flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-gray-400 w-full disabled:bg-red-300 dark:disabled:opacity-30 disabled:cursor-not-allowed ease-linear duration-300"
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {isLoading ? (
        <>
          {loadingText} <Spinner className="h-5 ml-3" />
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
